
# -*- coding: utf-8 -*-
# app.py
from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import warnings
# Suppress Google API Python version warnings
warnings.filterwarnings("ignore", ".*Google will stop supporting.*", category=FutureWarning)

from limiter import limiter
from ml_logic import load_ml_model, ml_model

# Import Blueprints
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.patient_routes import patient_bp
from routes.access_routes import access_bp
from routes.logs_routes import logs_bp
from routes.general_routes import general_bp

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

# ✅ Register Blueprints
app.register_blueprint(general_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(user_bp)
app.register_blueprint(patient_bp)
app.register_blueprint(access_bp)
app.register_blueprint(logs_bp)

# ✅ LOAD ML MODEL AT STARTUP (eager loading)
print("\n🧠 Loading ML model at startup...")
load_ml_model()

if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.getenv("PORT", 5000))
    
    # ✅ Use FLASK_ENV environment variable for debug mode (not port)
    # Set FLASK_ENV=development locally, FLASK_ENV=production on Render
    is_development = os.getenv("FLASK_ENV", "development").lower() == "development"
    
    print(f"\n🚀 Starting Flask app on port {port} (FLASK_ENV={os.getenv('FLASK_ENV', 'development')})")
    print(f"   Debug Mode: {'ON' if is_development else 'OFF'}")
    print(f"   Workers: {'1 (with reloader)' if is_development else 'Multiple (production)'}\n")
    
    app.run(host="0.0.0.0", port=port, debug=is_development)
