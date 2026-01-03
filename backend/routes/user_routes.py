
from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_init import db, firebase_admin_initialized
from limiter import limiter
from middleware import verify_admin_token
from helpers import patient_doc_id

user_bp = Blueprint('user_routes', __name__)

@user_bp.route("/get_all_users", methods=["GET"])
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

@user_bp.route("/register_user", methods=["POST"])
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
        age = data.get("age", 0)
        gender = data.get("gender", "")

        if not all([name, email, role]):
            return jsonify({"success": False, "message": "❌ Missing required fields."}), 400

        name_clean = name.strip()
        role_clean = role.strip().lower()
        user_doc_id = email  # using email as users doc id
        
        # ✅ Generate Unique User ID
        import uuid
        prefix = "USR"
        if role_clean == "doctor": prefix = "DOC"
        elif role_clean == "nurse": prefix = "NUR"
        elif role_clean == "admin": prefix = "ADM"
        elif role_clean == "patient": prefix = "PT"
        
        unique_id = f"{prefix}-{str(uuid.uuid4())[:8].upper()}"

        # if firebase not initialized, throw friendly error
        if not firebase_admin_initialized:
            return jsonify({"success": False, "message": "❌ Firebase not configured on server."}), 500

        user_ref = db.collection("users").document(user_doc_id)
        if user_ref.get().exists:
            return jsonify({"success": False, "message": "⚠️ User already registered."}), 409

        # ✅ UPDATED: Include unique_id, age and gender in users collection
        user_ref.set({
            "name": name_clean,
            "email": email,
            "role": role_clean,
            "user_id": unique_id,           # ✅ ADDED Unique ID
            "age": int(age) if age else 0,
            "gender": gender if gender else "",
            "trust_score": 80,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        })

        print(f"👤 User registered: {name_clean} ({role_clean}) - ID: {unique_id}")

        # ✅ UPDATED: Create patient with consistent ID
        if role_clean == "patient":
            patient_doc_slug = patient_doc_id(name_clean) # Doc ID is slug
            patient_ref = db.collection("patients").document(patient_doc_slug)
            
            if not patient_ref.get().exists:
                patient_ref.set({
                    "name": name_clean,
                    "patient_id": unique_id, # ✅ Use same ID as user
                    "email": email,
                    "age": int(age) if age else 0,
                    "gender": gender if gender else "",
                    "diagnosis": "—",
                    "treatment": "—",
                    "notes": "",
                    "doctor_assigned": "—",
                    "trust_score": 80,
                    "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                })
                print(f"🩺 Patient created in 'patients' collection: {name_clean} (ID: {unique_id})")
            else:
                # ✅ UPDATE: If patient exists, update metadata
                patient_ref.update({
                    "age": int(age) if age else 0,
                    "gender": gender if gender else "",
                    "patient_id": unique_id # Ensure ID is synced if missing
                })
                print(f"ℹ️ Patient {name_clean} updated with new metadata")

        return jsonify({"success": True, "message": f"Registered {name_clean} ({role_clean}) successfully."}), 200

    except Exception as e:
        print("❌ Error registering user:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@user_bp.route("/delete_user/<user_email>", methods=["DELETE"])
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
