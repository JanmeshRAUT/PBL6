
# -*- coding: utf-8 -*-
# app.py
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, firestore
from google.cloud.firestore import FieldFilter
from datetime import datetime
import ipaddress
import socket
import re
import random, string, time
import io
import os
import traceback
import joblib
from functools import wraps  # ✅ ADD: For decorators

from limiter import limiter  # ✅ ADD: Rate limiting

from utils import (
    get_client_ip_from_request,
    is_ip_in_network,
    send_otp_email,
    create_patient_pdf_bytes,
    ADMIN_EMAIL,
    TRUSTED_NETWORK,
    TRUST_THRESHOLD
)
from encryption import encrypt_sensitive_data, decrypt_sensitive_data, encrypt_string, decrypt_string

# ---------- Config files (Firebase via env var or local file) ----------
# ---------- Config files (Firebase via env var or local file) ----------
import json
basedir = os.path.dirname(os.path.abspath(__file__))
FIREBASE_CONFIG_PATH = os.path.join(basedir, "firebase_config.json")
FONT_CANDIDATES = [
    "fonts/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:\\Windows\\Fonts\\DejaVuSans.ttf"
]

# ---------- Init Firebase ----------
firebase_admin_initialized = False
db = None

# Check if Firebase is already initialized (prevents duplicate init in workers)
if not firebase_admin._apps:
    firebase_config_json = os.getenv("FIREBASE_CONFIG")
    if firebase_config_json:
        try:
            print("📦 Loading Firebase config from environment variable...")
            cred_dict = json.loads(firebase_config_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_admin_initialized = True
            print("✅ Firebase connected successfully (from env var)!")
        except Exception as e:
            print("❌ Firebase initialization error (env var):", e)
            firebase_admin_initialized = False
            db = None
    # Fall back to local file if env var not set
    elif os.path.exists(FIREBASE_CONFIG_PATH):
        try:
            print("📦 Loading Firebase config from local file...")
            cred = credentials.Certificate(FIREBASE_CONFIG_PATH)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            firebase_admin_initialized = True
            print("✅ Firebase connected successfully!")
        except Exception as e:
            print("❌ Firebase initialization error:", e)
            db = None
            firebase_admin_initialized = False
    else:
        print("⚠️ Firebase config not found.")
        print("   For local development: Create firebase_config.json in backend/ folder")
        print("   For production: Set FIREBASE_CONFIG environment variable with JSON content")
        firebase_admin_initialized = False
        db = None
else:
    # Firebase already initialized in another process/worker
    firebase_admin_initialized = True
    try:
        db = firestore.client()
    except:
        db = None

app = Flask(__name__)
# ✅ Initialize rate limiter
limiter.init_app(app)

# ✅ CORS configuration - allow frontend domains
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",           # Local dev
            "http://localhost:5000",           # Local dev
            "https://*.vercel.app",            # Vercel preview/prod
            "https://pbl6-40m0.onrender.com",  # Render frontend (if hosted there)
            "*"                                # Allow all for now (can restrict later)
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
}, supports_credentials=True)
# Also apply CORS to all routes
CORS(app, origins="*")

# ✅ Rate limit error handler
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "success": False,
        "error": "❌ Too many requests. Please try again later.",
        "message": str(e.description)
    }), 429

# ---------- HybridAccessModel Class Definition ----------
# ⚠️ IMPORTANT: This must be defined BEFORE loading the pickle file
class HybridAccessModel:
    """
    Combined hybrid model that uses two classifiers:
    1. Justification classifier - categorizes access requests
    2. Medical intent classifier - validates medical necessity
    """
    def __init__(self, justification_model, intent_model):
        self.just_model = justification_model
        self.intent_model = intent_model

    def predict(self, text):
        if isinstance(text, list):
            return [self._predict_single(t) for t in text]
        return self._predict_single(text)

    def _predict_single(self, text):
        j = self.just_model.predict([text])[0]
        m = self.intent_model.predict([text])[0]

        # --- DECISION ENGINE ---
        if j == "emergency" and m == "medical":
            return "emergency_allow"
        if j == "restricted" and m == "medical":
            return "restricted_allow"
        if j == "invalid":
            return "deny"
        return "flag_review"

# ---------- Load ML model (Custom Hybrid Model) ----------
ml_model = None
ml_model_loaded = False  # ✅ Track if we've already attempted to load

def load_ml_model():
    """Lazy load the ML model - called ONLY when first used, not at startup"""
    global ml_model, ml_model_loaded
    
    # Skip if already attempted to load (prevents duplicate loading)
    if ml_model_loaded:
        return ml_model is not None
    
    ml_model_loaded = True  # Mark as attempted
    ml_model_dir = os.path.join(os.path.dirname(__file__), "ml_model")
    
    # Try to load component models first (no pickling issues)
    justification_path = os.path.join(ml_model_dir, "justification_clf.pkl")
    intent_path = os.path.join(ml_model_dir, "intent_clf.pkl")

    try:
        print("🧠 Loading Custom Hybrid ML Model...")
        
        if os.path.exists(justification_path) and os.path.exists(intent_path):
            print(f"   Loading component models...")
            justification_clf = joblib.load(justification_path)
            intent_clf = joblib.load(intent_path)
            
            # Create the hybrid model instance
            ml_model = HybridAccessModel(justification_clf, intent_clf)
            print(f"✅ Custom ML model loaded successfully!")
            return True
        else:
            # Fallback: try to load the combined model
            hybrid_path = os.path.join(ml_model_dir, "hybrid_access_model.pkl")
            if os.path.exists(hybrid_path):
                print(f"   Loading combined model (legacy)...")
                ml_model = joblib.load(hybrid_path)
                print(f"✅ Custom ML model loaded successfully!")
                return True
            else:
                print(f"⚠️ ML model files not found in {ml_model_dir}")
                return False
                
    except Exception as e:
        print(f"⚠️ Error loading custom ML model: {e}")
        traceback.print_exc()
        return False

# ✅ LOAD ML MODEL AT STARTUP (eager loading)
print("\n🧠 Loading ML model at startup...")
load_ml_model()
if ml_model:
    print("✅ ML model ready for predictions!\n")
else:
    print("⚠️ ML model will use fallback analysis\n")

# ---------- In-memory OTP sessions ----------
otp_sessions = {}

# ---------- TRUST helpers (operate on Firestore when available) ----------
def get_trust_score(name):
    if not firebase_admin_initialized:
        return 80
    try:
        docs = db.collection("users").where(filter=FieldFilter("name", "==", name)).limit(1).stream()
        for doc in docs:
            return doc.to_dict().get("trust_score", 80)
    except Exception as e:
        print("get_trust_score error:", e)
    return 80

def update_trust_score(name, delta):
    if not firebase_admin_initialized:
        print("Skipping trust update (no firebase).")
        return None
    try:
        docs = db.collection("users").where(FieldFilter("name", "==", name)).limit(1).stream()
        for doc in docs:
            user_ref = db.collection("users").document(doc.id)
            user = doc.to_dict()
            current = user.get("trust_score", 80)
            new_score = max(0, min(100, current + delta))
            user_ref.update({
                "trust_score": new_score,
                "last_update": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            })
            print(f"🔁 Trust score updated: {name} {current} → {new_score}")
            return new_score
    except Exception as e:
        print("update_trust_score error:", e)
    return None

# ---------- Simple fallback sentiment analyzer ----------
def analyze_justification_fallback(text):
    """
    Lightweight fallback if ML model fails.
    Only used when hybrid model is unavailable.
    """
    text_low = text.lower()

    emergency_terms = ["critical", "urgent", "severe", "respiratory", "collapse", "shock", "life", "saving"]
    restricted_terms = ["reviewing", "checking", "follow-up", "analysis", "monitor"]

    if any(t in text_low for t in emergency_terms):
        return "emergency", 0.65

    if any(t in text_low for t in restricted_terms):
        return "restricted", 0.55

    return "invalid", 0.2

def analyze_justification(text):
    """
    Hybrid Model outputs one of:
      - emergency_allow
      - restricted_allow
      - deny
      - flag_review
    We map this into a simple label for compatibility.
    """
    if not text or not text.strip():
        return "invalid", 0.0

    # Hybrid Model Prediction
    if ml_model:
        try:
            decision = ml_model.predict([text])[0]
            print(f"🔍 Hybrid Model → {decision}")

            # convert hybrid decisions to old (label, score) pair
            if decision == "emergency_allow":
                return "emergency", 0.90
            elif decision == "restricted_allow":
                return "restricted", 0.75
            elif decision == "deny":
                return "invalid", 0.20
            else:  # flag_review
                return "restricted", 0.55

        except Exception as e:
            print(f"⚠️ ML model prediction error: {e}")
            traceback.print_exc()  # ✅ ADD: Better error tracking
            return analyze_justification_fallback(text)

    # If ML unavailable → fallback
    print("⚠️ ML model not available, using fallback analysis")
    return analyze_justification_fallback(text)
    

# ---------- Utility to sanitize patient names for two IDs ----------
def patient_doc_id(name):
    if not name:
        return ""
    return re.sub(r"[^a-z0-9_\-]", "_", name.strip().lower())

# ✅ SAFE LOGGING HELPER
def safe_log_access(log_data):
    """
    Attempts to log access to Firestore with a short timeout.
    Swallows errors to prevent non-critical logging from blocking the app.
    """
    if not firebase_admin_initialized or db is None:
        return
    try:
        db.collection("access_logs").add(log_data, timeout=5)
    except Exception as e:
        print(f"⚠️ Logging failed (non-fatal): {e}")

# ---------- Routes ----------

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "🏥 MedTrust AI – Secure EHR Backend ✅"})

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring connectivity and service status"""
    try:
        health_status = {
            "status": "healthy" if firebase_admin_initialized else "degraded",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "firebase": "connected" if firebase_admin_initialized else "disconnected",
            "ml_model": "loaded" if ml_model is not None else "not loaded",
            "version": "1.0.0"
        }
        return jsonify(health_status), 200
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }), 500

@app.route("/admin/login", methods=["POST"])
def admin_login():
    token = request.headers.get("Authorization")
    if not token:
        return jsonify({"error": "Missing token"}), 401
    try:
        token = token.replace("Bearer ", "")
        decoded = auth.verify_id_token(token)
        email = decoded.get("email")
        if email == ADMIN_EMAIL:
            print(f"✅ Admin verified: {email}")
            return jsonify({"success": True, "message": "Admin verified ✅"})
        print(f"🚫 Unauthorized admin attempt: {email}")
        return jsonify({"success": False, "error": "Not an admin"}), 403
    except Exception as e:
        print("❌ Token error:", e)
        return jsonify({"error": "Invalid or expired token"}), 401

# ---------- Authorization Decorator ----------
def verify_admin_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            print("🚫 Missing Authorization header")
            return jsonify({"success": False, "error": "Missing token"}), 401
        try:
            if token.startswith("Bearer "):
                token = token.split("Bearer ")[1]
            decoded = auth.verify_id_token(token)
            email = decoded.get("email")
            # You could strictly enforce ADMIN_EMAIL here if desired
            # if email != ADMIN_EMAIL:
            #     return jsonify({"success": False, "error": "Unauthorized"}), 403
            return f(*args, **kwargs)
        except Exception as e:
            print(f"❌ Token verification failed: {e}")
            return jsonify({"success": False, "error": "Invalid or expired token"}), 401
    return decorated_function

@app.route("/get_all_users", methods=["GET"])
@verify_admin_token
def get_all_users():
    try:
        print("📤 GET /get_all_users - fetching...")
        users = []
        if firebase_admin_initialized:
            users_ref = db.collection("users").stream()
            for doc in users_ref:
                u = doc.to_dict()
                u["id"] = doc.id
                users.append(u)
        else:
            print("⚠️ Firebase not initialized - returning empty users list.")
        users.sort(key=lambda x: x.get("name", "").lower())
        return jsonify({"success": True, "users": users, "count": len(users)}), 200
    except Exception as e:
        print("❌ Error fetching users:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/register_user", methods=["POST"])
@limiter.limit("10 per hour")  # ✅ Prevent spam registration
def register_user():
    """
    Admin adds new users (Doctor, Nurse, Patient, etc.)
    Ensures patient is created in BOTH:
      - users collection (with age/gender)
      - patients collection (for dashboard visibility)
    """
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        role = data.get("role")
        age = data.get("age", 0)        # ✅ ADD
        gender = data.get("gender", "") # ✅ ADD

        if not all([name, email, role]):
            return jsonify({"success": False, "message": "❌ Missing required fields."}), 400

        name_clean = name.strip()
        role_clean = role.strip().lower()
        user_doc_id = email  # using email as users doc id
        patient_id = patient_doc_id(name_clean)

        # if firebase not initialized, throw friendly error
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured on server."}), 500

        user_ref = db.collection("users").document(user_doc_id)
        if user_ref.get().exists:
            return jsonify({"success": False, "message": "⚠️ User already registered."}), 409

        # ✅ UPDATED: Include age and gender in users collection
        user_ref.set({
            "name": name_clean,
            "email": email,
            "role": role_clean,
            "age": int(age) if age else 0,           # ✅ ADD
            "gender": gender if gender else "",       # ✅ ADD
            "trust_score": 80,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        })

        print(f"👤 User registered: {name_clean} ({role_clean}) - Age: {age}, Gender: {gender}")

        # ✅ UPDATED: Create patient with age/gender
        if role_clean == "patient":
            patient_ref = db.collection("patients").document(patient_id)
            if not patient_ref.get().exists:
                patient_ref.set({
                    "name": name_clean,
                    "email": email,
                    "age": int(age) if age else 0,         # ✅ ADD
                    "gender": gender if gender else "",     # ✅ ADD
                    "diagnosis": "—",
                    "treatment": "—",
                    "notes": "",
                    "doctor_assigned": "—",
                    "trust_score": 80,
                    "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                })
                print(f"🩺 Patient created in 'patients' collection: {name_clean} (Age: {age}, Gender: {gender})")
            else:
                # ✅ UPDATE: If patient exists, update age/gender
                patient_ref.update({
                    "age": int(age) if age else 0,
                    "gender": gender if gender else ""
                })
                print(f"ℹ️ Patient {name_clean} updated with age/gender")

        return jsonify({"success": True, "message": f"Registered {name_clean} ({role_clean}) successfully."}), 200

    except Exception as e:
        print("❌ Error registering user:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/add_patient", methods=["POST"])
@limiter.limit("20 per hour")  # ✅ Limit patient registration
def add_patient():
    try:
        data = request.get_json()
        doctor_name = data.get("doctor_name")
        patient_name = (data.get("patient_name") or "").strip()
        patient_email = data.get("patient_email", "")
        age = data.get("age", 0)
        gender = data.get("gender", "")
        diagnosis = data.get("diagnosis", "")
        treatment = data.get("treatment", "")
        notes = data.get("notes", "")

        if not all([doctor_name, patient_name, patient_email, diagnosis]):
            return jsonify({"success": False, "message": "❌ Missing required fields (doctor, patient name, email, diagnosis)"}), 400

        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured."}), 500

        pid = patient_doc_id(patient_name)
        patient_ref = db.collection("patients").document(pid)
        patient_data = {
            "name": patient_name,
            "email": patient_email,
            "age": int(age),
            "gender": gender,
            "diagnosis": diagnosis,
            "treatment": treatment,
            "notes": notes,
            "doctor_assigned": doctor_name,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "last_updated_by": doctor_name
        }
        # ✅ Encrypt sensitive medical fields
        patient_data = encrypt_sensitive_data(patient_data, ["diagnosis", "treatment", "notes"])
        patient_ref.set(patient_data, merge=True)

        db.collection("access_logs").add({
            "doctor_name": doctor_name,
            "action": "Added Patient Details",
            "patient_name": patient_name.lower(),
            "status": "Success",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        })
        print(f"✅ Patient {patient_name} added by Dr. {doctor_name}")
        return jsonify({"success": True, "message": f"✅ Patient {patient_name} registered successfully"}), 200

    except Exception as e:
        print("❌ Error adding patient:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route("/update_patient", methods=["POST"])
@limiter.limit("50 per hour")  # ✅ Allow frequent updates
def update_patient():
    try:
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured"}), 500

        data = request.get_json()
        patient_name = data.get("patient_name", "").strip()
        updates = data.get("updates", {})

        if not patient_name:
            return jsonify({"success": False, "message": "❌ Patient name is required"}), 400

        if not updates:
            return jsonify({"success": False, "message": "❌ No updates provided"}), 400

        pid = patient_doc_id(patient_name)
        patient_ref = db.collection("patients").document(pid)
        patient_doc = patient_ref.get()

        # ✅ NEW: If patient doesn't exist in patients collection, check users collection
        if not patient_doc.exists:
            print(f"⚠️ Patient '{patient_name}' not found in patients collection. Checking users collection...")
            
            # Try to find patient in users collection
            users_ref = db.collection("users").where(filter=FieldFilter("name", "==", patient_name)).limit(1).stream()
            user_data = None
            
            for user_doc in users_ref:
                user_data = user_doc.to_dict()
                break
            
            if user_data and user_data.get("role", "").lower() == "patient":
                # ✅ Found in users collection - create in patients collection
                print(f"✅ Found '{patient_name}' in users collection. Creating patient record...")
                
                initial_patient_data = {
                    "name": user_data.get("name", patient_name),
                    "email": user_data.get("email", ""),
                    "age": user_data.get("age", 0),
                    "gender": user_data.get("gender", ""),
                    "diagnosis": "—",
                    "treatment": "—",
                    "notes": "",
                    "doctor_assigned": "—",
                    "trust_score": user_data.get("trust_score", 80),
                    "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Create the patient document
                patient_ref.set(initial_patient_data)
                print(f"✅ Patient record created for '{patient_name}'")
            else:
                return jsonify({"success": False, "message": f"❌ Patient '{patient_name}' not found in system"}), 404

        # Add metadata to updates
        updates["last_updated_at"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        # Track who made the update if provided
        if "updated_by" in data:
            updates["last_updated_by"] = data["updated_by"]

        # ✅ Encrypt sensitive medical fields before updating
        updates = encrypt_sensitive_data(updates, ["diagnosis", "treatment", "notes", "justification"])
        
        # Perform the update
        patient_ref.update(updates)

        # Fetch updated patient data
        updated_patient = patient_ref.get().to_dict()
        
        # ✅ Decrypt sensitive fields for response
        updated_patient = decrypt_sensitive_data(updated_patient, ["diagnosis", "treatment", "notes", "justification"])

        # Log the update action
        try:
            db.collection("access_logs").add({
                "action": "Update Patient Details",
                "patient_name": patient_name,
                "fields_updated": list(updates.keys()),
                "status": "Success",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "updated_by": data.get("updated_by", "Unknown")
            })
            
            # ✅ Also log in DoctorAccessLog for "My Patients" tracking
            if "updated_by" in data:
                db.collection("DoctorAccessLog").add({
                    "doctor_name": data["updated_by"],
                    "patient_name": patient_name,
                    "action": "Update Patient Details",
                    "status": "Success",
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    "created_at": datetime.utcnow()
                })
        except Exception as log_error:
            print(f"⚠️ Failed to log update action: {log_error}")

        print(f"✅ Patient '{patient_name}' updated successfully: {list(updates.keys())}")
        
        return jsonify({
            "success": True, 
            "message": f"✅ Patient '{patient_name}' updated successfully",
            "patient": updated_patient
        }), 200

    except Exception as e:
        print(f"❌ update_patient error: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/get_patient/<patient_name>", methods=["GET"])
def get_patient(patient_name):
    try:
        pid = patient_doc_id(patient_name)
        if firebase_admin_initialized:
            patient_ref = db.collection("patients").document(pid)
            patient_doc = patient_ref.get()
            if patient_doc.exists:
                patient_data = patient_doc.to_dict()
                # ✅ Decrypt sensitive fields for response
                patient_data = decrypt_sensitive_data(patient_data, ["diagnosis", "treatment", "notes"])
                return jsonify({"success": True, "patient": patient_data}), 200
        return jsonify({"success": False, "message": "❌ Patient not found"}), 404
    except Exception as e:
        print("❌ get_patient error:", e)
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/all_patients", methods=["GET"])
@verify_admin_token
def all_patients():
    try:
        patients_dict = {}
        if firebase_admin_initialized:
            for doc in db.collection("patients").stream():
                p = doc.to_dict()
                key = (p.get("name") or "").lower().strip()
                if key:
                    patients_dict[key] = p
        # get patients from users collection
        if firebase_admin_initialized:
            try:
                users_ref = db.collection("users").where(filter=FieldFilter("role", "in", ["patient", "Patient"])).stream()
                for d in users_ref:
                    u = d.to_dict()
                    key = (u.get("name") or "").lower().strip()
                    if key and key not in patients_dict:
                        patients_dict[key] = {
                            "name": u.get("name", ""),
                            "email": u.get("email", ""),
                            "age": u.get("age", 0),
                            "gender": u.get("gender", ""),
                            "diagnosis": u.get("diagnosis", "—"),
                            "treatment": u.get("treatment", "—"),
                            "notes": u.get("notes", ""),
                            "doctor_assigned": u.get("doctor_assigned", "—"),
                            "trust_score": u.get("trust_score", 80),
                        }
            except Exception as e:
                print("users->patients fetch error:", e)

        all_list = list(patients_dict.values())
        # ✅ Decrypt sensitive fields for all patients
        all_list = [decrypt_sensitive_data(p, ["diagnosis", "treatment", "notes"]) for p in all_list]
        return jsonify({"success": True, "patients": all_list, "count": len(all_list)}), 200
    except Exception as e:
        print("❌ all_patients error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/generate_patient_pdf/<patient_name>", methods=["GET"])
def generate_patient_pdf(patient_name):
    try:
        if not patient_name or not patient_name.strip():
            return jsonify({"success": False, "message": "❌ Patient name is required"}), 400
        
        # ✅ ADD: Sanitize patient name to prevent path traversal
        patient_name = patient_name.strip()
        if ".." in patient_name or "/" in patient_name or "\\" in patient_name:
            return jsonify({"success": False, "message": "❌ Invalid patient name"}), 400
        
        pid = patient_doc_id(patient_name)
        patient = None
        
        if firebase_admin_initialized:
            patient_ref = db.collection("patients").document(pid)
            pdoc = patient_ref.get()
            if pdoc.exists:
                patient = pdoc.to_dict()
        
        # ✅ If not found in patients, try users collection
        if not patient and firebase_admin_initialized:
            try:
                users_ref = db.collection("users").where(filter=FieldFilter("name", "==", patient_name)).limit(1).stream()
                for user_doc in users_ref:
                    user_data = user_doc.to_dict()
                    if user_data.get("role", "").lower() == "patient":
                        patient = {
                            "name": user_data.get("name", patient_name),
                            "email": user_data.get("email", "Not specified"),
                            "age": user_data.get("age", 0),
                            "gender": user_data.get("gender", "Not specified"),
                            "diagnosis": "—",
                            "treatment": "—",
                            "notes": "",
                            "last_visit": "Not recorded"
                        }
                        break
            except Exception as e:
                print(f"⚠️ Error checking users collection: {e}")
        
        if not patient:
            return jsonify({"success": False, "message": f"❌ Patient data not found for '{patient_name}'"}), 404
        
        # ✅ Ensure all required fields exist
        patient.setdefault("name", patient_name)
        patient.setdefault("age", 0)
        patient.setdefault("gender", "Not specified")
        patient.setdefault("email", "Not specified")
        patient.setdefault("diagnosis", "Not specified")
        patient.setdefault("treatment", "Not specified")
        patient.setdefault("notes", "")
        patient.setdefault("last_visit", "Not recorded")
        
        # ✅ Decrypt sensitive fields for PDF generation
        patient = decrypt_sensitive_data(patient, ["diagnosis", "treatment", "notes"])
        
        font_paths = [p for p in FONT_CANDIDATES if os.path.exists(p)]
        if not font_paths:
            print("⚠️ No fonts found, PDF may have rendering issues")
            font_paths = []  # create_patient_pdf_bytes should handle empty list
        
        pdf_buffer = create_patient_pdf_bytes(patient, font_paths=font_paths)
        
        filename = f"{(patient.get('name') or 'patient').replace(' ', '_')}_EHR_Report.pdf"
        
        return send_file(
            pdf_buffer, 
            mimetype="application/pdf", 
            as_attachment=False, 
            download_name=filename
        )
        
    except Exception as e:
        print(f"❌ PDF Generation Error: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/user_login", methods=["POST"])
@limiter.limit("5 per minute")  # ✅ Prevent brute force
def user_login():
    data = request.get_json()
    name = data.get("name", "").strip()
    role = data.get("role", "").strip().lower()
    email = data.get("email", "").strip()  # ✅ Get email from form
    
    # ✅ Validate required fields
    if not name or not role or not email:
        return jsonify(success=False, error="Name, role, and email are required"), 400
    
    # ✅ Validate email format
    if "@" not in email:
        return jsonify(success=False, error="Invalid email format"), 400
    
    # Check name and role in database
    if not firebase_admin_initialized:
        return jsonify(success=False, error="❌ Firebase not configured on server"), 500
    
    try:
        # Query database to find user by name and role
        users_ref = db.collection("users").where(
            filter=FieldFilter("name", "==", name)
        ).limit(1).stream()
        
        user_found = False
        for user_doc in users_ref:
            user_data = user_doc.to_dict()
            # Check if role matches
            if user_data.get("role", "").lower() == role:
                user_found = True
                break
        
        if not user_found:
            return jsonify(success=False, error=f"No user found with name '{name}' and role '{role}'"), 404
        
        # Generate OTP and create session
        otp = "".join(random.choices(string.digits, k=6))
        session_id = f"{name}_{int(time.time())}"
        otp_sessions[session_id] = {
            "otp": otp,
            "expires": time.time() + 180,
            "email": email,  # ✅ Use email from form
            "name": name
        }
        
        # ✅ Send OTP to email provided in form
        if send_otp_email(email, otp, name):
            print(f"✅ OTP sent to {email} for {name} ({role})")
            return jsonify(success=True, session_id=session_id, message="✅ OTP sent to your email"), 200
        else:
            return jsonify(success=False, error="Failed to send OTP. Please try again."), 500
            
    except Exception as e:
        print("❌ Login error:", e)
        traceback.print_exc()
        return jsonify(success=False, error="Server error. Please try again."), 500

@app.route("/verify_otp", methods=["POST"])
@limiter.limit("10 per minute")  # ✅ Allow multiple OTP attempts
def verify_otp():
    data = request.get_json()
    session_id, otp_input = data.get("session_id"), data.get("otp")
    record = otp_sessions.get(session_id)
    if not record:
        return jsonify(verified=False, error="Session not found")
    if time.time() > record["expires"]:
        otp_sessions.pop(session_id, None)
        return jsonify(verified=False, error="OTP expired")
    if otp_input == record["otp"]:
        otp_sessions.pop(session_id, None)
        return jsonify(verified=True)
    return jsonify(verified=False, error="Invalid OTP")

@app.route("/resend_otp", methods=["POST"])
@limiter.limit("5 per minute")
def resend_otp():
    try:
        data = request.get_json()
        session_id = data.get("session_id")
        
        if not session_id or session_id not in otp_sessions:
             return jsonify({"sent": False, "error": "Session expired or invalid. Please login again."}), 400

        session = otp_sessions[session_id]
        email = session["email"]
        name = session["name"]
        
        # Generate new OTP
        new_otp = "".join(random.choices(string.digits, k=6))
        
        # Update session
        otp_sessions[session_id]["otp"] = new_otp
        otp_sessions[session_id]["expires"] = time.time() + 180 # Extend timer
        
        # Send email
        if send_otp_email(email, new_otp, name):
            print(f"✅ OTP Resent to {email}")
            return jsonify({"sent": True, "message": "OTP resent successfully"}), 200
        else:
            return jsonify({"sent": False, "error": "Failed to send email"}), 500
            
    except Exception as e:
        print("❌ Resend OTP error:", e)
        traceback.print_exc()
        return jsonify({"sent": False, "error": "Server error"}), 500

@app.route("/normal_access", methods=["POST"])
@limiter.limit("30 per hour")  # ✅ Limit access requests
def normal_access():
    data = request.get_json()
    name, role = data.get("name"), data.get("role")
    patient_name = (data.get("patient_name") or "").strip()
    ip = get_client_ip_from_request(request)
    print(f"🏥 Normal Access Attempt: {name} from {ip}")
    try:
        if not is_ip_in_network(ip):
            safe_log_access({
                "doctor_name": name,
                "doctor_role": role,
                "action": "Normal Access (Outside Network)",
                "ip": ip,
                "status": "Denied",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            })
            update_trust_score(name, -5)
            return jsonify({"success": False, "message": "❌ Access denied — outside hospital network.", "patient_data": {}, "pdf_link": None}), 403
        log_data = {
            "doctor_name": name,
            "doctor_role": role,
            "action": "Normal Access (In-Network)",
            "ip": ip,
            "status": "Granted",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        # ✅ Encrypt IP if needed for privacy
        safe_log_access(log_data)
        update_trust_score(name, +2)
        # fetch patient
        pid = patient_doc_id(patient_name)
        patient_info = None
        if firebase_admin_initialized:
            patient_ref = db.collection("patients").document(pid)
            pdoc = patient_ref.get()
            if pdoc.exists:
                patient_info = pdoc.to_dict()
        if not patient_info:
            return jsonify({"success": False, "message": "❌ Patient not found", "patient_data": {}, "pdf_link": None}), 404
        
        # ✅ Decrypt sensitive fields before returning
        patient_info = decrypt_sensitive_data(patient_info, ["diagnosis", "treatment", "notes"])
        
        pdf_link = f"/generate_patient_pdf/{pid}"
        return jsonify({"success": True, "message": f"✅ Normal access granted from {ip}.", "patient_data": patient_info, "pdf_link": pdf_link}), 200
    except Exception as e:
        print("Error verifying IP:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Server error verifying IP"}), 500

@app.route("/restricted_access", methods=["POST"])
@limiter.limit("20 per hour")  # ✅ Limit restricted access requests
def restricted_access():
    data = request.get_json()
    name, role = data.get("name"), data.get("role")
    justification = (data.get("justification") or "").strip()
    patient_name = (data.get("patient_name") or "").strip()
    ip = get_client_ip_from_request(request)
    user_trust = get_trust_score(name)
    try:
        if is_ip_in_network(ip):
            safe_log_access({
                "doctor_name": name,
                "doctor_role": role,
                "action": "Restricted Access (In-Network)",
                "ip": ip,
                "status": "Granted",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            })
            update_trust_score(name, +1)
            pid = patient_doc_id(patient_name)
            patient_info = None
            if firebase_admin_initialized:
                patient_ref = db.collection("patients").document(pid)
                pdoc = patient_ref.get()
                if pdoc.exists:
                    patient_info = pdoc.to_dict()
            if not patient_info:
                return jsonify({"success": False, "message": "❌ Patient not found", "patient_data": {}, "pdf_link": None}), 404
            
            # ✅ Decrypt patient data for in-network access too
            patient_info = decrypt_sensitive_data(patient_info, ["diagnosis", "treatment", "notes"])

            pdf_link = f"/generate_patient_pdf/{pid}"
            return jsonify({"success": True, "message": "⚠️ Restricted access granted (inside hospital).", "patient_data": patient_info, "pdf_link": pdf_link}), 200

        if user_trust < TRUST_THRESHOLD:
            safe_log_access({
                "doctor_name": name,
                "doctor_role": role,
                "action": "Restricted Access (Low Trust)",
                "ip": ip,
                "status": "Denied",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            })
            update_trust_score(name, -5)
            return jsonify({"success": False, "message": "❌ Low trust — access denied.", "patient_data": {}, "pdf_link": None}), 403

        if not justification:
            return jsonify({"success": False, "message": "📝 Justification required for outside access.", "patient_data": {}, "pdf_link": None}), 400

        label, score = analyze_justification(justification)
        is_valid = (label in ["emergency", "restricted"]) and (score > 0.55)

        log_data = {
            "doctor_name": name,
            "doctor_role": role,
            "action": "Restricted Access (Outside Network)",
            "justification": justification,
            "ai_label": label,
            "ai_confidence": score,
            "ip": ip,
            "status": "Granted" if is_valid else "Flagged",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        # ✅ Encrypt justification before logging
        log_data = encrypt_sensitive_data(log_data, ["justification"])
        safe_log_access(log_data)
        update_trust_score(name, +2 if is_valid else -3)

        pid = patient_doc_id(patient_name)
        patient_info = None
        if firebase_admin_initialized:
            patient_ref = db.collection("patients").document(pid)
            pdoc = patient_ref.get()
            if pdoc.exists:
                patient_info = pdoc.to_dict()
        if not patient_info:
            return jsonify({"success": False, "message": "❌ Patient not found", "patient_data": {}, "pdf_link": None}), 404
        
        # ✅ Decrypt patient data before returning
        patient_info = decrypt_sensitive_data(patient_info, ["diagnosis", "treatment", "notes"])
        
        pdf_link = f"/generate_patient_pdf/{pid}"
        return jsonify({"success": is_valid, "message": ("🌐 Restricted Access Granted ✅" if is_valid else "⚠️ Access flagged for review."), "patient_data": patient_info, "pdf_link": pdf_link}), (200 if is_valid else 403)
    except Exception as e:
        print("❌ restricted_access error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/emergency_access", methods=["POST"])
@limiter.limit("15 per hour")  # ✅ Limit emergency access requests
def emergency_access():
    data = request.get_json()
    name = data.get("name")
    role = data.get("role")
    justification = (data.get("justification") or "").strip()
    patient_name = (data.get("patient_name") or "").strip()
    ip = get_client_ip_from_request(request)

    if not justification:
        update_trust_score(name, -2)
        return jsonify({
            "success": False,
            "message": "❌ Justification required!",
            "patient_data": {},
            "pdf_link": None
        }), 400

    label, score = analyze_justification(justification)

    # 🚑 STRICT & SAFE emergency logic
    genuine = (label == "emergency" and score > 0.70)

    # Log access
    log_data = {
        "doctor_name": name,
        "doctor_role": role,
        "patient_name": patient_name,
        "action": "Emergency Access",
        "justification": justification,
        "ai_label": label,
        "confidence": score,
        "ip": ip,
        "status": "Approved" if genuine else "Flagged",
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    }
    # ✅ Encrypt justification before logging
    log_data = encrypt_sensitive_data(log_data, ["justification"])
    safe_log_access(log_data)

    update_trust_score(name, +3 if genuine else -10)
    msg = "🚑 Emergency access approved ✅" if genuine else "⚠️ Suspicious justification — logged."

    # Fetch patient data
    pid = patient_doc_id(patient_name) if patient_name else None
    patient_info = None

    if pid and firebase_admin_initialized:
        pdoc = db.collection("patients").document(pid).get()
        if pdoc.exists():
            patient_info = pdoc.to_dict()

    if not patient_info and patient_name:
        return jsonify({
            "success": False,
            "message": "❌ Patient not found",
            "patient_data": {},
            "pdf_link": None
        }), 404

    # ✅ Decrypt patient data before returning
    if patient_info:
        patient_info = decrypt_sensitive_data(patient_info, ["diagnosis", "treatment", "notes"])

    pdf_link = f"/generate_patient_pdf/{pid}" if pid and patient_info else None

    return jsonify({
        "success": genuine,
        "message": msg,
        "patient_data": patient_info or {},
        "pdf_link": pdf_link
    }), (200 if genuine else 403)


@app.route("/log_access", methods=["POST"])
@limiter.limit("100 per hour")  # ✅ High limit for frequent logging
def log_access():
    try:
        data = request.get_json()
        doctor_name = data.get("doctor_name") or data.get("name", "Unknown")
        doctor_role = data.get("doctor_role") or data.get("role", "Unknown")
        patient_name = data.get("patient_name", "N/A")
        log = {
            "doctor_name": doctor_name,
            "doctor_role": doctor_role,
            "patient_name": patient_name,
            "action": data.get("action", "Unknown"),
            "justification": data.get("justification", ""),
            "status": data.get("status", "Pending"),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        # ✅ Encrypt sensitive fields before logging
        log = encrypt_sensitive_data(log, ["justification"])
        
        if firebase_admin_initialized:
            try:
                # ✅ Pass timeout to fail fast if DB is down
                db.collection("access_logs").add(log, timeout=5)
                
                # ✅ Log to DoctorAccessLog
                if doctor_name != "Unknown" and patient_name != "N/A" and (doctor_role or "").lower() == "doctor":
                    doctor_access_log = {
                        "doctor_name": doctor_name,
                        "patient_name": patient_name,
                        "action": data.get("action", "Unknown"),
                        "status": data.get("status", "Pending"),
                        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                        "created_at": datetime.utcnow()
                    }
                    db.collection("DoctorAccessLog").add(doctor_access_log, timeout=5)
                
                # ✅ Log to NurseAccessLog
                if doctor_name != "Unknown" and (doctor_role or "").lower() == "nurse":
                    nurse_access_log = {
                        "nurse_name": doctor_name,
                        "patient_name": patient_name,
                        "action": data.get("action", "Unknown"),
                        "status": data.get("status", "Pending"),
                        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                        "created_at": datetime.utcnow()
                    }
                    db.collection("NurseAccessLog").add(nurse_access_log, timeout=5)
                    
                print(f"🩺 Log added: {doctor_name} - {log['action']}")
                return jsonify({"message": "Access logged ✅"})
                
            except Exception as db_err:
                # Log error but don't crash 500
                print(f"⚠️ logging failed (non-fatal): {db_err}")
                return jsonify({"message": "Logging skipped (DB Service Unavailable)", "error": str(db_err)}), 200
        else:
             print(f"ℹ️ Firebase not initialized. Log skipped: {log['action']}")
             return jsonify({"message": "Logging skipped (Firebase not active)"}), 200

    except Exception as e:
        print("❌ log_access error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# Other admin & query routes (doctor logs, access_logs, patient history etc.)

@app.route("/patient_access_history/<patient_name>", methods=["GET"])
def get_patient_access_history(patient_name):
    """
    Fetch access logs specifically for a patient.
    Aggregates logs from both 'access_logs' (system-wide) and 'DoctorAccessLog'.
    """
    try:
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured"}), 500
        
        logs = []
        patient_name_lower = patient_name.lower().strip()
        
        # 1. Fetch from main access_logs
        log_refs = db.collection("access_logs").where(filter=FieldFilter("patient_name", "==", patient_name_lower)).stream()
        for doc in log_refs:
            log = doc.to_dict()
            log["source"] = "system"
            log["id"] = doc.id
            logs.append(log)
            
        # 2. Fetch from DoctorAccessLog (try exact match first as these are often preserved case)
        doc_log_refs = db.collection("DoctorAccessLog").where(filter=FieldFilter("patient_name", "==", patient_name)).stream()
        for doc in doc_log_refs:
            log = doc.to_dict()
            log["source"] = "doctor"
            log["id"] = doc.id
            logs.append(log)

        # Sort by timestamp descending
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        return jsonify({
            "success": True, 
            "logs": logs, 
            "count": len(logs)
        }), 200

    except Exception as e:
        print(f"❌ patient_access_history error: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/all_doctor_access_logs", methods=["GET"])
@verify_admin_token
def get_all_doctor_access_logs():
    try:
        # ✅ Get optional date filter parameters
        start_date = request.args.get("start_date")  # Format: YYYY-MM-DD
        end_date = request.args.get("end_date")      # Format: YYYY-MM-DD
        
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("DoctorAccessLog").stream():
                log_entry = {**doc.to_dict(), "id": doc.id}
                
                # ✅ Decrypt sensitive fields
                log_entry = decrypt_sensitive_data(log_entry, ["justification"])
                
                # ✅ Apply date filters if provided
                if start_date or end_date:
                    log_timestamp = log_entry.get("timestamp", "")
                    if log_timestamp:
                        log_date = log_timestamp.split(" ")[0]  # Extract YYYY-MM-DD
                        
                        if start_date and log_date < start_date:
                            continue
                        if end_date and log_date > end_date:
                            continue
                
                logs.append(log_entry)
        
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        logs = logs[:500]
        
        return jsonify({
            "success": True, 
            "logs": logs, 
            "total_count": len(logs),
            "filters": {"start_date": start_date, "end_date": end_date}
        }), 200
    except Exception as e:
        print("❌ get_all_doctor_access_logs error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/doctor_access_logs/<doctor_name>", methods=["GET"])
def get_doctor_access_logs(doctor_name):
    try:
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("DoctorAccessLog").where(filter=FieldFilter("doctor_name", "==", doctor_name)).stream():
                logs.append({**doc.to_dict(), "id": doc.id})
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return jsonify({"success": True, "logs": logs, "count": len(logs)}), 200
    except Exception as e:
        print("❌ get_doctor_access_logs error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/patient_access_logs/<patient_name>", methods=["GET"])
def patient_access_logs(patient_name):
    try:
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("access_logs").where(filter=FieldFilter("patient_name", "==", patient_name)).stream():
                logs.append({**doc.to_dict(), "id": doc.id})
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return jsonify({"success": True, "logs": logs}), 200
    except Exception as e:
        print("❌ patient_access_logs error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/doctor_patient_interactions/<doctor_name>", methods=["GET"])
def get_doctor_patient_interactions(doctor_name):
    try:
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("DoctorAccessLog").where(filter=FieldFilter("doctor_name", "==", doctor_name)).stream():
                logs.append(doc.to_dict())
        unique_patients = {}
        for log in logs:
            patient = (log.get("patient_name") or "").lower()
            if not patient or patient == "n/a":
                continue
            if patient not in unique_patients:
                unique_patients[patient] = {"patient_name": log.get("patient_name", ""), "access_count": 0, "last_access": log.get("timestamp", ""), "statuses": []}
            unique_patients[patient]["access_count"] += 1
            unique_patients[patient]["statuses"].append(log.get("status", ""))
        patients_list = list(unique_patients.values())
        return jsonify({"success": True, "patients": patients_list, "total_interactions": len(logs)}), 200
    except Exception as e:
        print("❌ doctor_patient_interactions error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/doctor_patients/<doctor_name>", methods=["GET"])
def get_doctor_patients(doctor_name):
    """
    NEW: Fetch all patients whose records were updated by this doctor
    Returns full patient details (not just interaction stats)
    """
    try:
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured"}), 500

        patients_list = []
        
        # Method 1: Query patients collection by last_updated_by field
        patients_ref = db.collection("patients").where(filter=FieldFilter("last_updated_by", "==", doctor_name)).stream()
        
        for doc in patients_ref:
            patient_data = doc.to_dict()
            patient_data["id"] = doc.id
            # ✅ Decrypt sensitive fields
            patient_data = decrypt_sensitive_data(patient_data, ["diagnosis", "treatment", "notes"])
            patients_list.append(patient_data)
        
        # Sort by last update time (most recent first)
        patients_list.sort(key=lambda x: x.get("last_updated_at", ""), reverse=True)
        
        print(f"✅ Fetched {len(patients_list)} patients for doctor: {doctor_name}")
        
        return jsonify({
            "success": True, 
            "patients": patients_list, 
            "count": len(patients_list)
        }), 200

    except Exception as e:
        print(f"❌ get_doctor_patients error: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/delete_patient/<patient_name>", methods=["DELETE"])
@limiter.limit("10 per hour")  # ✅ Prevent accidental bulk deletions
def delete_patient(patient_name):
    try:
        data = request.get_json() or {}
        admin_id = data.get("admin_id")
        if not admin_id:
            return jsonify({"success": False, "message": "❌ Admin verification required"}), 403
        if firebase_admin_initialized:
            db.collection("patients").document(patient_doc_id(patient_name)).delete()
            print(f"Patient {patient_name} deleted")
            return jsonify({"success": True, "message": "✅ Patient deleted successfully"}), 200
        else:
            return jsonify({"success": False, "message": "❌ Firebase not configured"}), 500
    except Exception as e:
        print("❌ delete_patient error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/delete_user/<user_email>", methods=["DELETE"])
@verify_admin_token
@limiter.limit("10 per hour")  # ✅ Prevent accidental bulk user deletions
def delete_user(user_email):
    """Delete a user from the system"""
    try:
        if not firebase_admin_initialized:
            return jsonify({"success": False, "error": "❌ Firebase not configured"}), 500
        
        # Delete from users collection
        user_ref = db.collection("users").document(user_email)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({"success": False, "error": F"❌ User not found"}), 404
        
        user_data = user_doc.to_dict()
        user_name = user_data.get("name", "Unknown")
        
        # Delete the user document
        user_ref.delete()
        
        # If user is a patient, also delete from patients collection
        if user_data.get("role") == "patient":
            patient_id = patient_doc_id(user_name)
            db.collection("patients").document(patient_id).delete()
        
        print(f"User {user_name} ({user_email}) deleted successfully")
        return jsonify({"success": True, "message": f"User {user_name} deleted successfully"}), 200
    
    except Exception as e:
        print(f"❌ delete_user error: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/request_temp_access", methods=["POST"])
def request_temp_access():
    data = request.get_json()
    name = data.get("name")
    role = data.get("role")
    patient_name = (data.get("patient_name") or "").strip()
    ip = get_client_ip_from_request(request)
    if (role or "").strip().lower() != "nurse":
        return jsonify({"success": False, "message": "❌ Only nurses can request temporary access"}), 403
    try:
        if not is_ip_in_network(ip):
            update_trust_score(name, -3)
            return jsonify({"success": False, "message": "❌ Temporary access only available inside hospital network"}), 403

        pid = patient_doc_id(patient_name)
        patient_info = None
        if firebase_admin_initialized:
            pdoc = db.collection("patients").document(pid).get()
            if pdoc.exists:
                patient_info = pdoc.to_dict()
        if not patient_info:
            return jsonify({"success": False, "message": "❌ Patient not found", "patient_data": {}, "pdf_link": None}), 404

        if firebase_admin_initialized:
            temp_access_log = {
                "doctor_name": name,
                "doctor_role": role,
                "action": "Temporary Access Request",
                "patient_name": patient_name,
                "ip": ip,
                "status": "Granted",
                "duration": "30 minutes",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            }
            db.collection("access_logs").add(temp_access_log)
            db.collection("NurseAccessLog").add({
                "nurse_name": name,
                "patient_name": patient_name,
                "action": "Temporary Access Request",
                "status": "Granted",
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "created_at": datetime.utcnow()
            })

        update_trust_score(name, +1)
        
        # ✅ Decrypt sensitive data before returning
        if patient_info:
            patient_info = decrypt_sensitive_data(patient_info, ["diagnosis", "treatment", "notes"])

        pdf_link = f"/generate_patient_pdf/{pid}"
        return jsonify({
            "success": True,
            "message": "✅ Temporary access granted for 30 minutes",
            "patient_data": patient_info,
            "pdf_link": pdf_link
        }), 200
    except Exception as e:
        print("❌ request_temp_access error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": "Server error"}), 500

@app.route("/trust_score/<name>", methods=["GET"])
def trust_score(name):
    return jsonify({"trust_score": get_trust_score(name)})

@app.route("/ip_check", methods=["GET"])
def ip_check():
    ip = get_client_ip_from_request(request)
    inside = is_ip_in_network(ip)
    return jsonify({"ip": ip, "inside_network": inside})

@app.route("/all_nurse_access_logs", methods=["GET"])
@verify_admin_token
def get_all_nurse_access_logs():
    try:
        # ✅ Get optional date filter parameters
        start_date = request.args.get("start_date")  # Format: YYYY-MM-DD
        end_date = request.args.get("end_date")      # Format: YYYY-MM-DD
        
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("NurseAccessLog").stream():
                log_entry = {**doc.to_dict(), "id": doc.id}
                
                # ✅ Decrypt sensitive fields
                log_entry = decrypt_sensitive_data(log_entry, ["justification"])
                
                # ✅ Apply date filters if provided
                if start_date or end_date:
                    log_timestamp = log_entry.get("timestamp", "")
                    if log_timestamp:
                        log_date = log_timestamp.split(" ")[0]  # Extract YYYY-MM-DD
                        
                        if start_date and log_date < start_date:
                            continue
                        if end_date and log_date > end_date:
                            continue
                
                logs.append(log_entry)
        
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        logs = logs[:500]
        
        return jsonify({
            "success": True, 
            "logs": logs, 
            "total_count": len(logs),
            "filters": {"start_date": start_date, "end_date": end_date}
        }), 200
    except Exception as e:
        print("❌ get_all_nurse_access_logs error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/nurse_access_logs/<nurse_name>", methods=["GET"])
def get_nurse_access_logs(nurse_name):
    try:
        logs = []
        if firebase_admin_initialized:
            for doc in db.collection("NurseAccessLog").where(filter=FieldFilter("nurse_name", "==", nurse_name)).stream():
                logs.append({**doc.to_dict(), "id": doc.id})
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return jsonify({"success": True, "logs": logs, "count": len(logs)}), 200
    except Exception as e:
        print("❌ get_nurse_access_logs error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/access_logs/admin", methods=["GET"])
@verify_admin_token
def access_logs_admin():
    try:
        # ✅ Get optional date filter parameters
        start_date = request.args.get("start_date")  # Format: YYYY-MM-DD
        end_date = request.args.get("end_date")      # Format: YYYY-MM-DD
        
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured"}), 500
        
        logs = []
        for doc in db.collection("access_logs").stream():
            log_entry = {**doc.to_dict(), "id": doc.id}
            
            # ✅ Apply date filters if provided
            if start_date or end_date:
                log_timestamp = log_entry.get("timestamp", "")
                if log_timestamp:
                    log_date = log_timestamp.split(" ")[0]  # Extract YYYY-MM-DD
                    
                    if start_date and log_date < start_date:
                        continue
                    if end_date and log_date > end_date:
                        continue
            
            logs.append(log_entry)
        
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        logs = logs[:500]
        
        return jsonify({
            "success": True, 
            "logs": logs, 
            "count": len(logs),
            "filters": {"start_date": start_date, "end_date": end_date}
        }), 200
    except Exception as e:
        print("❌ access_logs_admin error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.getenv("PORT", 5000))
    
    # ✅ Use FLASK_ENV environment variable for debug mode (not port)
    # Set FLASK_ENV=development locally, FLASK_ENV=production on Render
    is_development = os.getenv("FLASK_ENV", "production").lower() == "development"
    
    print(f"\n🚀 Starting Flask app on port {port} (FLASK_ENV={os.getenv('FLASK_ENV', 'production')})")
    print(f"   Debug Mode: {'ON' if is_development else 'OFF'}")
    print(f"   Workers: {'1 (with reloader)' if is_development else 'Multiple (production)'}\n")
    
    app.run(host="0.0.0.0", port=port, debug=is_development)
