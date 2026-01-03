
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
import sys
import os

# Initialize Firebase
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate("firebase_config.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase initialized successfully.")
    except Exception as e:
        print(f"❌ Failed to initialize Firebase: {e}")
        sys.exit(1)

db = firestore.client()

def migrate_users():
    """
    Iterate through all users and assign a unique user_id if missing.
    Format: DOC-XXX, NUR-XXX, ADM-XXX, PT-XXX
    """
    print("🚀 Starting User ID Migration...")
    
    users_ref = db.collection("users").stream()
    count = 0
    updated = 0
    
    for doc in users_ref:
        user_data = doc.to_dict()
        user_name = user_data.get("name", "Unknown")
        role = user_data.get("role", "unknown").lower()
        count += 1
        
        # Check if already has ID
        if "user_id" in user_data and user_data["user_id"]:
            print(f"🔹 Skipping {user_name} ({role}) - Already has ID: {user_data['user_id']}")
            continue

        # Generate prefix
        prefix = "USR"
        if role == "doctor": prefix = "DOC"
        elif role == "nurse": prefix = "NUR"
        elif role == "admin": prefix = "ADM"
        elif role == "patient": prefix = "PT"
        
        # Generate ID
        unique_id = f"{prefix}-{str(uuid.uuid4())[:8].upper()}"
        
        # Update User Document
        db.collection("users").document(doc.id).update({"user_id": unique_id})
        
        # If Patient, sync with Patients collection
        if role == "patient":
            # Search patients collection by email or name
            patients_ref = db.collection("patients").where("email", "==", user_data.get("email")).stream()
            found_patient = False
            for p_doc in patients_ref:
                db.collection("patients").document(p_doc.id).update({"patient_id": unique_id})
                print(f"   ↳ Synced with Patient Record: {p_doc.id}")
                found_patient = True
                break
            
            if not found_patient:
                print(f"   ⚠️ Warning: No matching patient record found for {user_name}")

        print(f"✅ Assigned ID to {user_name} ({role}): {unique_id}")
        updated += 1

    print(f"\n🎉 Migration Complete!")
    print(f"Total Users Checked: {count}")
    print(f"Total Users Updated: {updated}")

if __name__ == "__main__":
    migrate_users()
