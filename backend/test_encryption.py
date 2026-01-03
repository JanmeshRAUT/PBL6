#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script to verify encryption functionality
Run this to test encryption before deploying
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from encryption import encrypt_string, decrypt_string, encrypt_sensitive_data, decrypt_sensitive_data

def test_basic_encryption():
    """Test basic string encryption/decryption"""
    print("\n🔐 Testing Basic Encryption...")
    
    original = "This is a sensitive medical diagnosis"
    encrypted = encrypt_string(original)
    decrypted = decrypt_string(encrypted)
    
    print(f"  Original:  {original}")
    print(f"  Encrypted: {encrypted[:50]}..." if len(encrypted) > 50 else f"  Encrypted: {encrypted}")
    print(f"  Decrypted: {decrypted}")
    
    assert original == decrypted, "Decryption failed!"
    assert encrypted != original, "Encryption didn't change data!"
    print("  ✅ Basic encryption test PASSED")


def test_dict_encryption():
    """Test dictionary field encryption/decryption"""
    print("\n🔐 Testing Dictionary Encryption...")
    
    original_data = {
        "patient_name": "John Doe",
        "age": 45,
        "diagnosis": "Hypertension",
        "treatment": "ACE inhibitor",
        "notes": "Monitor BP weekly",
        "doctor": "Dr. Smith"
    }
    
    # Encrypt sensitive fields
    encrypted_data = encrypt_sensitive_data(original_data, ["diagnosis", "treatment", "notes"])
    
    print(f"  Original diagnosis:  {original_data['diagnosis']}")
    print(f"  Encrypted diagnosis: {encrypted_data['diagnosis'][:50]}..." if len(encrypted_data['diagnosis']) > 50 else f"  Encrypted: {encrypted_data['diagnosis']}")
    
    # Verify non-sensitive fields weren't encrypted
    assert original_data["patient_name"] == encrypted_data["patient_name"], "Non-sensitive field was modified!"
    assert original_data["age"] == encrypted_data["age"], "Non-sensitive field was modified!"
    
    # Decrypt
    decrypted_data = decrypt_sensitive_data(encrypted_data, ["diagnosis", "treatment", "notes"])
    
    print(f"  Decrypted diagnosis: {decrypted_data['diagnosis']}")
    
    # Verify all fields match
    assert original_data == decrypted_data, "Decrypted data doesn't match original!"
    print("  ✅ Dictionary encryption test PASSED")


def test_empty_values():
    """Test encryption with empty/None values"""
    print("\n🔐 Testing Empty Values...")
    
    data = {
        "name": "Patient",
        "diagnosis": "",
        "notes": None,
        "treatment": "Some treatment"
    }
    
    encrypted = encrypt_sensitive_data(data, ["diagnosis", "notes", "treatment"])
    decrypted = decrypt_sensitive_data(encrypted, ["diagnosis", "notes", "treatment"])
    
    # None and empty should be preserved
    assert decrypted["diagnosis"] == "", "Empty string not preserved!"
    assert decrypted["notes"] is None, "None not preserved!"
    assert decrypted["treatment"] == "Some treatment", "Non-empty value not preserved!"
    
    print("  ✅ Empty values test PASSED")


def test_special_characters():
    """Test encryption with special characters"""
    print("\n🔐 Testing Special Characters...")
    
    special_text = "Patient with ñ, émojis 🏥, symbols &*#$%, and quotes \"hello\""
    encrypted = encrypt_string(special_text)
    decrypted = decrypt_string(encrypted)
    
    assert special_text == decrypted, "Special characters not preserved!"
    print(f"  Original:  {special_text}")
    print(f"  Decrypted: {decrypted}")
    print("  ✅ Special characters test PASSED")


def test_large_text():
    """Test encryption with large medical records"""
    print("\n🔐 Testing Large Text...")
    
    large_diagnosis = """
    Patient presents with acute myocardial infarction (MI) complicated by cardiogenic shock.
    EKG shows ST elevation in leads II, III, aVF consistent with inferior wall MI.
    Troponin I elevated to 2.5 ng/mL. Ejection fraction 30% on echocardiography.
    
    Differential diagnosis includes:
    1. Acute coronary syndrome with mechanical complication
    2. Ventricular free wall rupture
    3. Acute mitral regurgitation due to papillary muscle rupture
    4. Acute VSD
    
    Treatment plan:
    - Emergent cardiac catheterization and PCI
    - IABP support
    - Inotropic support with dobutamine
    - Aggressive fluid management
    """ * 10  # Make it large
    
    encrypted = encrypt_string(large_diagnosis)
    decrypted = decrypt_string(encrypted)
    
    assert large_diagnosis == decrypted, "Large text not preserved!"
    print(f"  Text size: {len(large_diagnosis)} characters")
    print(f"  Encrypted size: {len(encrypted)} characters")
    print("  ✅ Large text test PASSED")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 MedTrust AI - Encryption Test Suite")
    print("="*60)
    
    try:
        test_basic_encryption()
        test_dict_encryption()
        test_empty_values()
        test_special_characters()
        test_large_text()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\n🔐 Encryption is working correctly.")
        print("📋 You can safely deploy the application.\n")
        return 0
        
    except Exception as e:
        print("\n" + "="*60)
        print("❌ TEST FAILED")
        print("="*60)
        print(f"\nError: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
