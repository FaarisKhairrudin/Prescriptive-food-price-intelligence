import hmac
import hashlib
import base64
import json
import time
import os

SECRET_KEY = os.environ.get("GEMINI_API_KEY", "narapangan_local_secret_key_change_me")

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = os.urandom(16)
    rounds = 100000
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, rounds)
    salt_b64 = base64.b64encode(salt).decode('utf-8')
    key_b64 = base64.b64encode(key).decode('utf-8')
    return f"pbkdf2_sha256${rounds}${salt_b64}${key_b64}"

def verify_password(password: str, hashed: str) -> bool:
    """Verifies a password against its PBKDF2 hash."""
    try:
        parts = hashed.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        rounds = int(parts[1])
        salt = base64.b64decode(parts[2].encode('utf-8'))
        key = base64.b64decode(parts[3].encode('utf-8'))
        new_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, rounds)
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False

def create_token(payload: dict) -> str:
    """Creates a base64-encoded, HMAC-SHA256 signed JWT token."""
    # Set expiration: 24 hours from now
    payload = payload.copy()
    payload["exp"] = int(time.time()) + 86400
    
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    
    header_b64 = base64.urlsafe_b64encode(header_json).decode('utf-8').rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip("=")
    
    msg = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), msg, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_token(token: str) -> dict | None:
    """Verifies a signed JWT token and returns its decoded payload."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, sig_b64 = parts
        
        # Verify signature
        msg = f"{header_b64}.{payload_b64}".encode('utf-8')
        signature = hmac.new(SECRET_KEY.encode('utf-8'), msg, hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip("=")
        
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
            
        # Add base64 padding back
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Check expiration
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception:
        return None
