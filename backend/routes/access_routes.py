
from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_init import db, firebase_admin_initialized
from limiter import limiter
from utils import get_client_ip_from_request, is_ip_in_network, TRUST_THRESHOLD
from helpers import patient_doc_id
from trust_logic import get_trust_score, update_trust_score, safe_log_access
from ml_logic import analyze_justification
from encryption import encrypt_sensitive_data, decrypt_sensitive_data

access_bp = Blueprint('access_routes', __name__)

@access_bp.route("/normal_access", methods=["POST"])
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

@access_bp.route("/restricted_access", methods=["POST"])
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

@access_bp.route("/emergency_access", methods=["POST"])
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
        if pdoc.exists:
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


@access_bp.route("/precheck", methods=["POST"])
@limiter.limit("60 per hour")  # ✅ Generous limit for typing feedback
def precheck_access():
    """
    AI Pre-Check Endpoint.
    Analyzes justification text in real-time to provide feedback.
    Returns: { status: 'valid'|'weak'|'invalid', message: '...', score: 0.0-1.0 }
    """
    try:
        data = request.get_json()
        text = (data.get("justification") or "").strip()
        
        if not text:
            return jsonify({
                "status": "invalid",
                "message": "Enter justification...",
                "score": 0.0
            })

        # Run AI Analysis
        label, score = analyze_justification(text)
        
        # Determine User Feedback
        if label == "emergency":
            if score > 0.8:
                return jsonify({"status": "valid", "message": "✅ Excellent justification", "score": score})
            if score > 0.6:
                return jsonify({"status": "weak", "message": "🟡 Good, but maintain detail", "score": score})
            else:
                return jsonify({"status": "weak", "message": "⚠️ Weak medical context", "score": score})
                
        elif label == "restricted":
            # Restricted is acceptable for remote, but check score
            if score > 0.7:
                 return jsonify({"status": "valid", "message": "✅ Valid reason", "score": score})
            else:
                 return jsonify({"status": "weak", "message": "🟡 Vague reason", "score": score})
                 
        else: # invalid/admin/non-medical
            return jsonify({"status": "invalid", "message": "🔴 Invalid justification", "score": score})

    except Exception as e:
        print("❌ precheck error:", e)
        return jsonify({"status": "invalid", "message": "Analysis unavailable", "score": 0.0}), 500


@access_bp.route("/log_access", methods=["POST"])
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

@access_bp.route("/request_temp_access", methods=["POST"])
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
