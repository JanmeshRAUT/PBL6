
import firebase_admin
from firebase_admin import credentials, firestore
import uuid
import datetime

# 1. Initialize Firebase Admin (assuming default creds or similar to app.py)
#    In a local dev environment, you might need to point to your serviceAccountKey.json 
#    or rely on however 'firebase_init.py' does it. 
#    For a standalone script, it's safest to import the existing init logic if possible.

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from firebase_init import db, firebase_admin_initialized
except ImportError:
    print("❌ Could not import firebase_init. Make sure you are running this from the backend directory.")
    sys.exit(1)

def generate_unique_patient_id():
    """Generates a short unique ID (like 'PT-123456')"""
    # Using first 8 chars of UUID for uniqueness + PT prefix
    return f"PT-{str(uuid.uuid4())[:8].upper()}"

def migrate_patients():
    if not firebase_admin_initialized:
        print("❌ Firebase is not initialized. Check your credentials.")
        return

    print("🚀 Starting ID migration for patients...")
    
    patients_ref = db.collection("patients")
    docs = patients_ref.stream()
    
    count = 0
    updated = 0
    
    for doc in docs:
        count += 1
        data = doc.to_dict()
        
        # Check if 'patient_id' already exists
        if "patient_id" not in data or not data["patient_id"]:
            new_id = generate_unique_patient_id()
            
            # Update the document
            try:
                patients_ref.document(doc.id).update({
                    "patient_id": new_id
                })
                print(f"✅ Assigned {new_id} to patient '{data.get('name', 'Unknown')}' (Doc ID: {doc.id})")
                updated += 1
            except Exception as e:
                print(f"❌ Failed to update {doc.id}: {e}")
        else:
            print(f"ℹ️ Patient '{data.get('name')}' already has ID: {data['patient_id']}")

    print(f"\n✨ Migration complete.")
    print(f"📊 Total Patients Scanned: {count}")
    print(f"📝 Total IDs Assigned: {updated}")

if __name__ == "__main__":
    migrate_patients()
