
from flask import Blueprint, request, jsonify
from datetime import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_init import firebase_admin_initialized
import ml_logic
from trust_logic import get_trust_score
from utils import get_client_ip_from_request, is_ip_in_network

general_bp = Blueprint('general_routes', __name__)

@general_bp.route("/", methods=["GET"])
def home():
    return jsonify({"message": "🏥 MedTrust AI – Secure EHR Backend ✅"})

@general_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring connectivity and service status"""
    try:
        health_status = {
            "status": "healthy" if firebase_admin_initialized else "degraded",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "firebase": "connected" if firebase_admin_initialized else "disconnected",
            "ml_model": "loaded" if ml_logic.ml_model is not None else "not loaded",
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

@general_bp.route("/trust_score/<name>", methods=["GET"])
def trust_score(name):
    return jsonify({"trust_score": get_trust_score(name)})

@general_bp.route("/ip_check", methods=["GET"])
def ip_check():
    ip = get_client_ip_from_request(request)
    inside = is_ip_in_network(ip)
    return jsonify({"ip": ip, "inside_network": inside})
