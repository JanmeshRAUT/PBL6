
from flask import Blueprint, request, jsonify
import traceback
import sys
import os
from google.cloud.firestore import FieldFilter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_init import db, firebase_admin_initialized
from middleware import verify_admin_token
from encryption import decrypt_sensitive_data

logs_bp = Blueprint('logs_routes', __name__)

@logs_bp.route("/patient_access_history/<patient_name>", methods=["GET"])
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

@logs_bp.route("/all_doctor_access_logs", methods=["GET"])
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

@logs_bp.route("/doctor_access_logs/<doctor_name>", methods=["GET"])
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

@logs_bp.route("/patient_access_logs/<patient_name>", methods=["GET"])
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

@logs_bp.route("/doctor_patient_interactions/<doctor_name>", methods=["GET"])
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

@logs_bp.route("/doctor_patients/<doctor_name>", methods=["GET"])
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

@logs_bp.route("/all_nurse_access_logs", methods=["GET"])
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

@logs_bp.route("/nurse_access_logs/<nurse_name>", methods=["GET"])
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

@logs_bp.route("/access_logs/admin", methods=["GET"])
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

@logs_bp.route("/update_log_status", methods=["POST"])
@verify_admin_token
def update_log_status():
    """
    Update the status of a specific log entry (e.g., mark as 'Reviewed' or 'Dismissed')
    Target Collection: 'access_logs' (System Logs)
    """
    try:
        data = request.json
        log_id = data.get("log_id")
        new_status = data.get("status") # e.g., "Reviewed", "Dismissed", "Resolved"

        if not log_id or not new_status:
            return jsonify({"success": False, "message": "Missing log_id or status"}), 400

        # Update in Firestore
        if firebase_admin_initialized:
            log_ref = db.collection("access_logs").document(log_id)
            if log_ref.get().exists:
                log_ref.update({"status": new_status})
                return jsonify({"success": True, "message": f"Log {log_id} updated to {new_status}"}), 200
            else:
                 return jsonify({"success": False, "message": "Log entry not found"}), 404
        
        return jsonify({"success": False, "message": "Database not initialized"}), 500

    except Exception as e:
        print("❌ update_log_status error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500
