"""
Encryption utility module for MedTrust AI
Handles encryption/decryption of sensitive medical data using Fernet
"""

import os
from cryptography.fernet import Fernet
import base64

class EncryptionHandler:
    """Handles encryption and decryption of sensitive data"""
    
    def __init__(self):
        """Initialize encryption handler with key from environment or file"""
        self.cipher = self._load_or_create_cipher()
    
    def _load_or_create_cipher(self):
        """Load encryption key from environment or create new one"""
        # Try to load from environment variable first
        key_str = os.getenv("ENCRYPTION_KEY")
        
        if key_str:
            try:
                return Fernet(key_str.encode())
            except Exception as e:
                print(f"❌ Invalid encryption key in environment: {e}")
                raise
        
        # Try to load from file
        # ✅ FIX: Use absolute path relative to this script
        base_dir = os.path.dirname(os.path.abspath(__file__))
        key_file = os.path.join(base_dir, ".encryption_key")
        
        if os.path.exists(key_file):
            try:
                with open(key_file, 'r') as f:
                    key_str = f.read().strip()
                return Fernet(key_str.encode())
            except Exception as e:
                print(f"❌ Error loading encryption key from file: {e}")
                raise
        
        # Generate new key and save it
        print("🔐 Generating new encryption key...")
        key = Fernet.generate_key()
        key_str = key.decode()
        
        # Save to file (WARNING: Not secure for production!)
        with open(key_file, 'w') as f:
            f.write(key_str)
        
        print(f"🔑 New encryption key saved to {key_file}")
        print(f"⚠️  For production: Set ENCRYPTION_KEY environment variable instead")
        print(f"   Key: {key_str}")
        
        return Fernet(key)
    
    def encrypt(self, data):
        """
        Encrypt a string
        
        Args:
            data: String to encrypt
            
        Returns:
            Encrypted string (can be stored in database)
        """
        if not data:
            return None
        
        try:
            # Convert to string if not already
            data_str = str(data) if not isinstance(data, str) else data
            # Encrypt and decode to string for database storage
            encrypted = self.cipher.encrypt(data_str.encode())
            return encrypted.decode()
        except Exception as e:
            print(f"❌ Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_data):
        """
        Decrypt an encrypted string
        
        Args:
            encrypted_data: Encrypted string from database
            
        Returns:
            Decrypted string
        """
        if not encrypted_data:
            return None
        
        try:
            # Convert to bytes if string, decrypt, then decode
            encrypted_bytes = encrypted_data.encode() if isinstance(encrypted_data, str) else encrypted_data
            decrypted = self.cipher.decrypt(encrypted_bytes)
            return decrypted.decode()
        except Exception as e:
            # Analyze if this looks like a Fernet token (starts with gAAAAA)
            is_encrypted_token = False
            if isinstance(encrypted_data, str) and encrypted_data.startswith("gAAAAA"):
                is_encrypted_token = True
            
            if is_encrypted_token:
                print(f"⚠️ Failed to decrypt data (Key Mismatch): {str(e)[:50]}")
                return "[Data Encrypted with Old Key]"
            else:
                # Likely legacy plain text, return as-is without error log
                return encrypted_data if isinstance(encrypted_data, str) else str(encrypted_data)
    
    def encrypt_dict(self, data, fields_to_encrypt):
        """
        Encrypt specific fields in a dictionary
        
        Args:
            data: Dictionary containing data
            fields_to_encrypt: List of field names to encrypt
            
        Returns:
            Dictionary with encrypted fields
        """
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt(encrypted_data[field])
        
        return encrypted_data
    
    def decrypt_dict(self, data, fields_to_decrypt):
        """
        Decrypt specific fields in a dictionary
        
        Args:
            data: Dictionary containing encrypted data
            fields_to_decrypt: List of field names to decrypt
            
        Returns:
            Dictionary with decrypted fields
        """
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            if field in decrypted_data and decrypted_data[field]:
                decrypted_data[field] = self.decrypt(decrypted_data[field])
        
        return decrypted_data


# Initialize global encryption handler
try:
    encryption = EncryptionHandler()
    print("✅ Encryption handler initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize encryption: {e}")
    encryption = None


# Convenience functions
def encrypt_sensitive_data(data, fields):
    """Encrypt sensitive fields in data"""
    if not encryption:
        return data
    return encryption.encrypt_dict(data, fields)


def decrypt_sensitive_data(data, fields):
    """Decrypt sensitive fields in data"""
    if not encryption:
        return data
    return encryption.decrypt_dict(data, fields)


def encrypt_string(text):
    """Encrypt a single string"""
    if not encryption:
        return text
    return encryption.encrypt(text)


def decrypt_string(encrypted_text):
    """Decrypt a single string"""
    if not encryption:
        return encrypted_text
    return encryption.decrypt(encrypted_text)
