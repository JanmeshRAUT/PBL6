#!/usr/bin/env python3
"""Test decryption fix"""

from app_old import app
import json

# Test the all_patients route
with app.test_client() as client:
    print("Testing /all_patients endpoint...")
    response = client.get('/all_patients')
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        print('✓ All patients endpoint working')
        data = response.get_json()
        if data.get('success'):
            print(f'✓ Patients count: {data.get("count", 0)}')
            if data.get('patients'):
                print(f'✓ First patient: {data["patients"][0].get("name", "N/A")}')
        else:
            print(f'API Error: {data.get("message")}')
    else:
        print(f'HTTP Error: {response.status_code}')
        print(f'Response: {response.get_json()}')
