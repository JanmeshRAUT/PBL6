import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression

# ===============================
# 🧠 Model A — Justification Classifier
# ===============================
print("\n🔍 Training Model A: Justification Classifier...")

# Load Data (using local path)
df = pd.read_csv("dataset.csv") 
# Assuming dataset.csv has no header, or correct columns. 
# Based on previous file content, it seems it needs column naming:
if "label" not in df.columns:
    df.columns = ["text", "label"]

X = df["text"]
y = df["label"]

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    stratify=y,
    random_state=42
)

# Pipeline
justification_clf = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 3),
        max_features=30000,
        min_df=2,
        max_df=0.95,
        token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b"  # 🔐 ignore numbers
    )),
    ("clf", LinearSVC(C=1.2))
])

justification_clf.fit(X_train, y_train)

print("📊 Justification Accuracy:", justification_clf.score(X_test, y_test))
joblib.dump(justification_clf, "justification_clf.pkl")
print("✅ Saved: justification_clf.pkl")


# ===============================
# 🧠 Model B — Medical Intent Classifier
# ===============================
print("\n🔍 Training Model B: Medical Intent Classifier...")

intent_samples = [
    ("reviewing CT scan for diagnosis confirmation", "medical"),
    ("evaluating imaging results for patient assessment", "medical"),
    ("stabilizing patient vitals in critical care", "medical"),
    ("monitoring laboratory trends for treatment planning", "medical"),
    ("cross-referencing medication history", "medical"), 

    ("updating duty roster", "admin"),
    ("requesting password reset", "admin"),
    ("reviewing audit compliance logs", "admin"),
    ("system maintenance check", "admin"),

    ("checking records out of curiosity", "non_medical"),
    ("random patient lookup", "non_medical"),
    ("testing access permissions", "non_medical"),
    ("browsing patient filenames", "non_medical")
]

intent_df = pd.DataFrame(intent_samples * 100, columns=["text", "label"])

X2 = intent_df["text"]
y2 = intent_df["label"]

X2_train, X2_test, y2_train, y2_test = train_test_split(
    X2, y2,
    test_size=0.2,
    stratify=y2,
    random_state=42
)

intent_clf = Pipeline([
    ("tfidf", TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=10000,
        token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b"
    )),
    ("clf", LogisticRegression(max_iter=300))
])

intent_clf.fit(X2_train, y2_train)

# ============================================
# SAVE MODELS WITH VERSIONING
# ============================================
import json
import os

CONFIG_PATH = "ml_model_config.json"

# Load or Initialize Config
if os.path.exists(CONFIG_PATH):
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)
else:
    config = {"active_version": "v0", "history": []}

# Determine New Version
last_version = config["active_version"]
version_num = int(last_version.replace("v", "")) + 1
new_version = f"v{version_num}"

print(f"\n📦 Versioning: {last_version} ➝ {new_version}")

# Save Models with Version Suffix
just_filename = f"justification_clf_{new_version}.pkl"
intent_filename = f"intent_clf_{new_version}.pkl"

joblib.dump(justification_clf, just_filename)
joblib.dump(intent_clf, intent_filename)

print(f"✅ Saved: {just_filename}")
print(f"✅ Saved: {intent_filename}")

# Update Config
config["active_version"] = new_version
config["history"].append(new_version)

with open(CONFIG_PATH, "w") as f:
    json.dump(config, f, indent=4)

print(f"📝 Config updated: Active version is now {new_version}")

print("\n🎉 ALL MODELS TRAINED & SAVED SUCCESSFULLY!")
