from google.oauth2 import service_account
from google.auth.transport.requests import Request
import os

KEY_PATH = os.path.abspath(
    r"E:\PBL6 - Copy\backend\firebase_config.json"
)

creds = service_account.Credentials.from_service_account_file(
    KEY_PATH,
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)

try:
    creds.refresh(Request())
    print("✅ JWT SIGNING WORKS")
    print("Project:", creds.project_id)
    print("Service Account:", creds.service_account_email)
except Exception as e:
    print("❌ JWT SIGNING FAILED")
    print(e)
