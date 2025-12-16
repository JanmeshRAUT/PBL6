import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import numpy as np

# ============================================
# LOAD MAIN JUSTIFICATION DATA
# ============================================
df = pd.read_csv("dataset.csv")
df.columns = ["text", "label"]

X = df["text"]
y = df["label"]

# ============================================
# TRAIN SPLIT
# ============================================
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y)

# ============================================
# MODEL 1 — OPTIMIZED SVM FOR JUSTIFICATION
# ============================================
justification_clf = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 3),
        max_features=28000,
        min_df=1,
        max_df=0.97
    )),
    ("clf", LinearSVC(C=1.2))
])

justification_clf.fit(X_train, y_train)

print("\n📊 Justification Model Accuracy:", justification_clf.score(X_test, y_test))

# ============================================
# BUILD MEDICAL INTENT SYNTHETIC DATA
# ============================================
intent_samples = [
    ("reviewing CT results for internal bleeding", "medical"),
    ("stabilizing patient vitals, need access history", "medical"),
    ("checking lab results before prescribing medication", "medical"),
    ("system login issue, need to update password", "admin"),
    ("audit review for compliance verification", "admin"),
    ("updating shift schedule", "admin"),
    ("checking info out of curiosity", "non_medical"),
    ("random lookup no medical reason", "non_medical"),
    ("trying to see unrelated records", "non_medical")
]

intent_df = pd.DataFrame(intent_samples * 80, columns=["text", "label"])

X2 = intent_df["text"]
y2 = intent_df["label"]

X2_train, X2_test, y2_train, y2_test = train_test_split(
    X2, y2, test_size=0.20, random_state=42, stratify=y2)

# ============================================
# MODEL 2 — MEDICAL INTENT CLASSIFIER
# ============================================
intent_clf = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=9000
    )),
    ("clf", LogisticRegression(max_iter=250))
])

intent_clf.fit(X2_train, y2_train)

print("\n📊 Medical Intent Model Accuracy:", intent_clf.score(X2_test, y2_test))

# ============================================
# COMBINED HYBRID MODEL OBJECT
# ============================================
class HybridAccessModel:
    def __init__(self, justification_model, intent_model):
        self.just_model = justification_model
        self.intent_model = intent_model

    def predict(self, text):
        if isinstance(text, list):
            return [self._predict_single(t) for t in text]
        return self._predict_single(text)

    def _predict_single(self, text):
        j = self.just_model.predict([text])[0]
        m = self.intent_model.predict([text])[0]

        # --- DECISION ENGINE ---
        if j == "emergency" and m == "medical":
            return "emergency_allow"
        if j == "restricted" and m == "medical":
            return "restricted_allow"
        if j == "invalid":
            return "deny"
        return "flag_review"

# ============================================
# SAVE COMPONENT MODELS (instead of wrapper class)
# ============================================
joblib.dump(justification_clf, "justification_clf.pkl")
joblib.dump(intent_clf, "intent_clf.pkl")
print("\n✅ Saved: justification_clf.pkl")
print("✅ Saved: intent_clf.pkl")

# Also save the old hybrid model for backward compatibility
# (but this may cause issues with gunicorn)
try:
    hybrid_model = HybridAccessModel(justification_clf, intent_clf)
    joblib.dump(hybrid_model, "hybrid_access_model.pkl")
    print("✅ Saved: hybrid_access_model.pkl (for backward compatibility)")
except Exception as e:
    print(f"⚠️ Could not save hybrid model: {e}")

print("\n🎉 MODELS READY FOR DEPLOYMENT!")
