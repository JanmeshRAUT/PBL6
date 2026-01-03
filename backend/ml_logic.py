
import os
import joblib
import traceback

# ---------- HybridAccessModel Class Definition ----------
# ⚠️ IMPORTANT: This must be defined BEFORE loading the pickle file
class HybridAccessModel:
    """
    Combined hybrid model that uses two classifiers:
    1. Justification classifier - categorizes access requests
    2. Medical intent classifier - validates medical necessity
    """
    def __init__(self, justification_model, intent_model):
        self.just_model = justification_model
        self.intent_model = intent_model

    def predict(self, text):
        if isinstance(text, list):
            return [self._predict_single(t) for t in text]
        return self._predict_single(text)

    def _predict_single(self, text):
        j = self.just_model.predict([text])[0]
        
        # Intent Prediction (with probabilities)
        # Check if the model supports `predict_proba` (LogisticRegression does)
        if hasattr(self.intent_model, "predict_proba"):
            probs = self.intent_model.predict_proba([text])[0]
            confidence = max(probs)
            m = self.intent_model.predict([text])[0]

            # 🛑 Threshold Check
            if confidence < 0.6:
                print(f"⚠️ Intent Confidence Low ({confidence:.2f}) → Flagging for Review")
                return "flag_review"
        else:
            # Fallback for models without predict_proba (e.g. SVM without probability=True)
            m = self.intent_model.predict([text])[0]

        # --- DECISION ENGINE ---
        if j == "emergency" and m == "medical":
            return "emergency_allow"
        if j == "restricted" and m == "medical":
            return "restricted_allow"
        if j == "invalid":
            return "deny"
        return "flag_review"

# ---------- Load ML model (Custom Hybrid Model) ----------
ml_model = None
ml_model_loaded = False  # ✅ Track if we've already attempted to load

def load_ml_model():
    """Lazy load the ML model - called ONLY when first used, not at startup"""
    global ml_model, ml_model_loaded
    
    # Skip if already attempted to load (prevents duplicate loading)
    if ml_model_loaded:
        return ml_model is not None
    
    ml_model_loaded = True  # Mark as attempted
    # Assuming ml_model folder is in the same directory as this file (backend/)
    ml_model_dir = os.path.join(os.path.dirname(__file__), "ml_model")
    config_path = os.path.join(ml_model_dir, "ml_model_config.json")
    
    try:
        print("🧠 Loading Custom Hybrid ML Model...")
        
        # 1. Try Loading from Config (Versioning)
        active_version = "v1" # Default
        if os.path.exists(config_path):
            import json
            with open(config_path, "r") as f:
                config = json.load(f)
                active_version = config.get("active_version", "v1")
                print(f"   ℹ️ Active Model Version: {active_version}")

        justification_path = os.path.join(ml_model_dir, f"justification_clf_{active_version}.pkl")
        intent_path = os.path.join(ml_model_dir, f"intent_clf_{active_version}.pkl")

        if os.path.exists(justification_path) and os.path.exists(intent_path):
            print(f"   Loading component models ({active_version})...")
            justification_clf = joblib.load(justification_path)
            intent_clf = joblib.load(intent_path)
            
            # Create the hybrid model instance
            ml_model = HybridAccessModel(justification_clf, intent_clf)
            print(f"✅ Custom ML model ({active_version}) loaded successfully!")
            return True
            
        # 2. Fallback: try to load non-versioned component models
        # (Useful if training script hasn't run the new versioning logic yet)
        just_legacy = os.path.join(ml_model_dir, "justification_clf.pkl")
        intent_legacy = os.path.join(ml_model_dir, "intent_clf.pkl")
        
        if os.path.exists(just_legacy) and os.path.exists(intent_legacy):
             print(f"   ⚠️ Versioned models not found. Loading legacy component models...")
             justification_clf = joblib.load(just_legacy)
             intent_clf = joblib.load(intent_legacy)
             ml_model = HybridAccessModel(justification_clf, intent_clf)
             return True

        else:
            # 3. Last Resort: try to load the OLD combined model
            hybrid_path = os.path.join(ml_model_dir, "hybrid_access_model.pkl")
            if os.path.exists(hybrid_path):
                print(f"   Loading combined model (legacy)...")
                ml_model = joblib.load(hybrid_path)
                print(f"✅ Custom ML model loaded successfully!")
                return True
            else:
                print(f"⚠️ ML model files not found in {ml_model_dir}")
                return False
                
    except Exception as e:
        print(f"⚠️ Error loading custom ML model: {e}")
        traceback.print_exc()
        return False

# ---------- Simple fallback sentiment analyzer ----------
def analyze_justification_fallback(text):
    """
    Lightweight fallback if ML model fails.
    Only used when hybrid model is unavailable.
    """
    text_low = text.lower()

    emergency_terms = ["critical", "urgent", "severe", "respiratory", "collapse", "shock", "life", "saving"]
    restricted_terms = ["reviewing", "checking", "follow-up", "analysis", "monitor"]

    if any(t in text_low for t in emergency_terms):
        return "emergency", 0.65

    if any(t in text_low for t in restricted_terms):
        return "restricted", 0.55

    return "invalid", 0.2

def analyze_justification(text):
    """
    Hybrid Model outputs one of:
      - emergency_allow
      - restricted_allow
      - deny
      - flag_review
    We map this into a simple label for compatibility.
    """
    if not text or not text.strip():
        return "invalid", 0.0

    # Ensure model is loaded if possible
    if not ml_model_loaded:
        load_ml_model()

    # Hybrid Model Prediction
    if ml_model:
        try:
            decision = ml_model.predict([text])[0]
            print(f"🔍 Hybrid Model → {decision}")

            # convert hybrid decisions to old (label, score) pair
            if decision == "emergency_allow":
                return "emergency", 0.90
            elif decision == "restricted_allow":
                return "restricted", 0.75
            elif decision == "deny":
                return "invalid", 0.20
            else:  # flag_review
                return "restricted", 0.55

        except Exception as e:
            print(f"⚠️ ML model prediction error: {e}")
            traceback.print_exc()  # ✅ ADD: Better error tracking
            return analyze_justification_fallback(text)

    # If ML unavailable → fallback
    print("⚠️ ML model not available, using fallback analysis")
    return analyze_justification_fallback(text)
