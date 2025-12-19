#!/usr/bin/env python3
"""Test Gmail SMTP credentials"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_SENDER = "janmeshraut.mitadt@gmail.com"
EMAIL_PASSWORD = "njvx xusb hbzy naaf"  # Your App Password

try:
    print("🔍 Testing Gmail SMTP connection...")
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        print("✅ TLS connection established")
        
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        print("✅ Login successful!")
        
        # Send test email
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Test Email - MedTrust"
        msg["From"] = EMAIL_SENDER
        msg["To"] = EMAIL_SENDER
        msg.attach(MIMEText("This is a test email", "plain"))
        
        server.sendmail(EMAIL_SENDER, EMAIL_SENDER, msg.as_string())
        print("✅ Test email sent successfully!")
        
except smtplib.SMTPAuthenticationError as e:
    print("❌ Authentication failed:", e)
    print("\n⚠️ Solutions:")
    print("1. Check that 2-Step Verification is enabled")
    print("2. Generate a new App Password: https://myaccount.google.com/apppasswords")
    print("3. Use the 16-character App Password (without spaces)")
except Exception as e:
    print("❌ Error:", e)
