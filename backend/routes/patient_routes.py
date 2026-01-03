
from flask import Blueprint, request, jsonify, send_file
from datetime import datetime
import traceback
import sys
import os
from google.cloud.firestore import FieldFilter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_init import db, firebase_admin_initialized
from limiter import limiter
from middleware import verify_admin_token
from helpers import patient_doc_id
from utils import create_patient_pdf_bytes
from encryption import encrypt_sensitive_data, decrypt_sensitive_data

patient_bp = Blueprint('patient_routes', __name__)

FONT_CANDIDATES = [
    "fonts/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:\\Windows\\Fonts\\DejaVuSans.ttf"
]

@patient_bp.route("/add_patient", methods=["POST"])
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

        # Generate unique patient ID
        import uuid
        patient_id = f"PT-{str(uuid.uuid4())[:8].upper()}"

        pid = patient_doc_id(patient_name)
        patient_ref = db.collection("patients").document(pid)
        patient_data = {
            "name": patient_name,
            "patient_id": patient_id,  # ✅ Added ID
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

@patient_bp.route("/update_patient", methods=["POST"])
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

@patient_bp.route("/get_patient/<patient_name>", methods=["GET"])
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

@patient_bp.route("/all_patients", methods=["GET"])
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
        # ⚠️ Removed fallback to 'users' collection to ensure consistency. 
        # Only patients explicitly created in the 'patients' collection will be shown.

        all_list = list(patients_dict.values())
        # ✅ Decrypt sensitive fields for all patients
        all_list = [decrypt_sensitive_data(p, ["diagnosis", "treatment", "notes"]) for p in all_list]
        return jsonify({"success": True, "patients": all_list, "count": len(all_list)}), 200
    except Exception as e:
        print("❌ all_patients error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@patient_bp.route("/generate_patient_pdf/<patient_name>", methods=["GET"])
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

@patient_bp.route("/delete_patient/<patient_name>", methods=["DELETE"])
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
