
from firebase_init import db, firebase_admin_initialized
from google.cloud.firestore import FieldFilter
from datetime import datetime

def get_trust_score(name):
    if not firebase_admin_initialized or db is None:
        return 80
    try:
        docs = db.collection("users").where(filter=FieldFilter("name", "==", name)).limit(1).stream()
        for doc in docs:
            return doc.to_dict().get("trust_score", 80)
    except Exception as e:
        print("get_trust_score error:", e)
    return 80

def update_trust_score(name, delta):
    if not firebase_admin_initialized or db is None:
        print("Skipping trust update (no firebase).")
        return None
    try:
        docs = db.collection("users").where(filter=FieldFilter("name", "==", name)).limit(1).stream()
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

def safe_log_access(log_data):
    """
    Attempts to log access to Firestore with a short timeout.
    Swallows errors to prevent non-critical logging from blocking the app.
    """
    if not firebase_admin_initialized or db is None:
        return
    try:
        # Note: timeout argument might differ based on library version, 
        # but standard python firestore client uses timeout in calls if supported.
        # If timeout causes issues, remove it.
        db.collection("access_logs").add(log_data, timeout=5)
    except Exception as e:
        print(f"⚠️ Logging failed (non-fatal): {e}")
