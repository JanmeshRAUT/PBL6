import requests
import json

BASE_URL = "http://localhost:5000"

def test_endpoint(name, url):
    print(f"\n🔍 Testing {name} ({url})...")
    try:
        # Request WITHOUT token
        response = requests.get(url)
        
        if response.status_code == 401:
            print("✅ PASS: Access Denied (401) as expected (No Token)")
            print(f"   Response: {response.json()}")
        elif response.status_code == 200:
            print("❌ FAIL: Endpoint is still PUBLIC! (Got 200 OK)")
        else:
            print(f"⚠️ Unexpected status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ FAIL: Could not connect to backend. Is it running on port 5000?")

if __name__ == "__main__":
    print("🛡️  MedTrust Security Verification Script 🛡️")
    print("---------------------------------------------")
    
    # 1. Test get_all_users
    test_endpoint("Get All Users", f"{BASE_URL}/get_all_users")
    
    # 2. Test Admin Logs
    test_endpoint("Admin Access Logs", f"{BASE_URL}/access_logs/admin")
    
    # 3. Test Patients
    test_endpoint("All Patients", f"{BASE_URL}/all_patients")

    print("\n---------------------------------------------")
    print("If all tests passed, your backend security is active!")
