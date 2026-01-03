
from flask import Blueprint, request, jsonify
from firebase_admin import auth
from google.cloud.firestore import FieldFilter
import random
import string
import time
import traceback
import sys
import os

# Adjust path to import from parent directory if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from limiter import limiter
from firebase_init import db, firebase_admin_initialized
from utils import send_otp_email, ADMIN_EMAIL

auth_bp = Blueprint('auth_routes', __name__)

# ---------- In-memory OTP sessions ----------
otp_sessions = {}

@auth_bp.route("/admin/login", methods=["POST"])
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

@auth_bp.route("/user_login", methods=["POST"])
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

@auth_bp.route("/verify_otp", methods=["POST"])
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

@auth_bp.route("/resend_otp", methods=["POST"])
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
