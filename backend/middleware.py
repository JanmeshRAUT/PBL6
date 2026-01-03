
from functools import wraps
from flask import request, jsonify
from firebase_admin import auth
from utils import ADMIN_EMAIL

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
