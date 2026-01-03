import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from config import FIREBASE_CONFIG_PATH

# Priority 1: Check for FIREBASE_CONFIG environment variable (for Render)
firebase_config_env = os.getenv("FIREBASE_CONFIG")
if firebase_config_env:
	# Parse JSON string from environment variable
	firebase_config_dict = json.loads(firebase_config_env)
	cred = credentials.Certificate(firebase_config_dict)
else:
	# Priority 2: Use file-based config for Railway/local
	firebase_config_path = FIREBASE_CONFIG_PATH
	if not os.path.exists(firebase_config_path):
		# Fallback to local file relative to backend folder for dev convenience
		alt_path = os.path.join(os.path.dirname(__file__), "firebase_config.json")
		if os.path.exists(alt_path):
			firebase_config_path = alt_path
	
	cred = credentials.Certificate(firebase_config_path)


try:
	firebase_admin.initialize_app(cred)
	db = firestore.client()
	firebase_admin_initialized = True
	print("✅ Firebase initialized successfully!")
except Exception as e:
	print(f"❌ Firebase initialization error: {e}")
	db = None
	firebase_admin_initialized = False

