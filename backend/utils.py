# utils.py
import socket
import ipaddress
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
import io
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors


# ---------- CONFIGURATION (no env as requested) ----------
ADMIN_EMAIL = "admin@ehr.com"
TRUSTED_NETWORK = ipaddress.ip_network("192.168.5.0/24")
TRUST_THRESHOLD = 40

# Email placeholders (REPLACE before running)
EMAIL_SENDER = "medtrustai@gmail.com"
EMAIL_PASSWORD = "ujle dfbp gswy xqcy"
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# ---------- Helpers ----------
def get_client_ip_from_request(request):
    ip = request.remote_addr or "0.0.0.0"
    # If behind proxies you might check X-Forwarded-For
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # take first IP
        ip = xff.split(",")[0].strip()
    if ip.startswith("127.") or ip == "0.0.0.0":
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
        except Exception:
            pass
    return ip

def is_ip_in_network(ip):
    try:
        addr = ipaddress.ip_address(ip)
        return addr in TRUSTED_NETWORK
    except Exception:
        return False

def send_otp_email(email, otp, name):
    try:
        if not email or "@" not in email:
            return False
        subject = "🔐 Verify your login - MedTrust AI"
        
        # --- Modern Professional HTML Email Template ---
        current_year = datetime.utcnow().year
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Login Verification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f4f7fa; color: #333333;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
                            <tr>
                                <td style="padding: 30px 40px; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); text-align: center;">
                                    <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">MEDTRUST AI</h1>
                                    <p style="margin: 5px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">Secure Health Records</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px 40px;">
                                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #334155;">Hi <strong>{name}</strong>,</p>
                                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                                        A request to log in to your account was received. Use the code below to securely sign in.
                                    </p>
                                    <div style="background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #15803d; letter-spacing: 6px; display: block;">{otp}</span>
                                    </div>
                                    <p style="margin: 0; font-size: 14px; color: #64748b; text-align: center;">
                                        This code expires in <strong>3 minutes</strong> for your security.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                                        If you didn't request this code, you can safely ignore this email.
                                    </p>
                                    <p style="margin: 0; font-size: 12px; color: #cbd5e1;">
                                        &copy; {current_year} MedTrust AI. Use responsibly.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_SENDER
        msg["To"] = email
        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, email, msg.as_string())
        return True
    except Exception as e:
        print("send_otp_email error:", e)
        return False

# PDF helper: sanitized font add + output bytes IO
def create_patient_pdf_bytes(patient: dict, font_paths=None):
    """
    Returns BytesIO with professional medical report PDF.
    Uses ReportLab with professional styling.
    """
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter, 
            topMargin=0.75*inch, 
            bottomMargin=0.75*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        elements = []
        styles = getSampleStyleSheet()
        
        # ✅ MODERN MEDICAL REPORT STYLES
        # Color Palette: Professional Medical Blue
        ACCENT_COLOR = colors.HexColor('#0f766e') # Teal-700
        HEADER_BG = colors.HexColor('#f0fdfa')    # Teal-50
        TEXT_COLOR = colors.HexColor('#334155')   # Slate-700
        LABEL_COLOR = colors.HexColor('#64748b')  # Slate-500
        
        title_style = ParagraphStyle(
            'ProTitle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=ACCENT_COLOR,
            spaceAfter=4,
            alignment=0,
            fontName='Helvetica-Bold',
            leading=26
        )
        
        subtitle_style = ParagraphStyle(
            'ProSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=LABEL_COLOR,
            alignment=0,
            spaceAfter=20,
            fontName='Helvetica',
            textTransform='uppercase',
            letterSpacing=1
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=12,
            textColor=ACCENT_COLOR,
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            textTransform='uppercase',
            borderPadding=4,
            borderColor=ACCENT_COLOR,
            borderWidth=0,
            # We'll use a line in the table instead of a border here
        )
        
        field_label_style = ParagraphStyle(
            'FieldLabel',
            parent=styles['Normal'],
            fontSize=9,
            textColor=LABEL_COLOR,
            spaceAfter=2,
            fontName='Helvetica-Bold',
        )
        
        field_value_style = ParagraphStyle(
            'FieldValue',
            parent=styles['Normal'],
            fontSize=11,
            textColor=TEXT_COLOR,
            spaceAfter=8,
            fontName='Helvetica',
            leading=14
        )
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'),
            alignment=1,
            spaceAfter=4,
            fontName='Helvetica'
        )
        
        # ✅ SAFE VALUE GETTER
        def safe_get(key, default="Not specified"):
            value = patient.get(key, default)
            if value is None or value == "" or value == "—":
                return default
            try:
                return str(value).encode('utf-8', 'replace').decode('utf-8')
            except:
                return str(value)
        
        # ✅ HEADER: Modern Layout
        # Logo placeholder (text)
        header_data = [
            [
                Paragraph("<b>MEDTRUST AI</b>", ParagraphStyle('Logo', parent=title_style, fontSize=18, textColor=colors.HexColor('#0f766e'))),
                Paragraph("<b>CONFIDENTIAL MEDICAL REPORT</b>", ParagraphStyle('ReportTitle', parent=subtitle_style, alignment=2))
            ]
        ]
        header_table = Table(header_data, colWidths=[3*inch, 3*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LINEBELOW', (0, 0), (-1, -1), 2, ACCENT_COLOR),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ PATIENT DEMOGRAPHICS SECTION
        elements.append(Paragraph("Patient Profile", section_header_style))
        elements.append(Table([[""]], colWidths=[6*inch], style=[('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))]))
        elements.append(Spacer(1, 0.1*inch))
        
        demo_data = [
            [
                Paragraph("FULL NAME", field_label_style),
                Paragraph(safe_get("name", "Unknown"), field_value_style),
                Paragraph("AGE / GENDER", field_label_style),
                Paragraph(f"{safe_get('age', '—')} yrs / {safe_get('gender')}", field_value_style),
            ],
            [
                Paragraph("EMAIL", field_label_style),
                Paragraph(safe_get("email"), field_value_style),
                Paragraph("REPORT DATE", field_label_style),
                Paragraph(datetime.utcnow().strftime("%B %d, %Y"), field_value_style),
            ]
        ]
        
        demo_table = Table(demo_data, colWidths=[1.25*inch, 2.25*inch, 1.25*inch, 1.25*inch])
        demo_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(demo_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ CLINICAL DIAGNOSIS SECTION
        elements.append(Paragraph("Clinical Diagnosis", section_header_style))
        elements.append(Table([[""]], colWidths=[6*inch], style=[('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))]))
        elements.append(Spacer(1, 0.1*inch))
        
        # Highlight box for diagnosis
        diag_data = [[Paragraph(safe_get("diagnosis", "Pending Evaluation"), field_value_style)]]
        diag_table = Table(diag_data, colWidths=[6*inch])
        diag_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), HEADER_BG),
            ('border', (0, 0), (-1, -1), 0.5, colors.HexColor('#ccfbf1')),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('ROUNDEDCORNERS', [8, 8, 8, 8]), 
        ]))
        elements.append(diag_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ TREATMENT PLAN SECTION
        elements.append(Paragraph("Treatment Plan", section_header_style))
        elements.append(Table([[""]], colWidths=[6*inch], style=[('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))]))
        elements.append(Spacer(1, 0.1*inch))
        
        treatment_text = safe_get("treatment", "No treatment plan specified")
        elements.append(Paragraph(treatment_text, field_value_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ CLINICAL NOTES SECTION
        elements.append(Paragraph("Clinical Notes & Observations", section_header_style))
        elements.append(Table([[""]], colWidths=[6*inch], style=[('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))]))
        elements.append(Spacer(1, 0.1*inch))
        
        notes_text = safe_get("notes", "No additional clinical notes")
        elements.append(Paragraph(notes_text, field_value_style))
        elements.append(Spacer(1, 0.5*inch))
        
        # ✅ FOOTER: Metadata
        footer_line = Table([[""]], colWidths=[6.5*inch])
        footer_line.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(footer_line)
        elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Paragraph(
            f"Generated via MedTrust AI System | {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            footer_style
        ))
        
        elements.append(Paragraph(
            "This document is a confidential medical record. Unauthorized access or distribution is strictly prohibited.",
            ParagraphStyle(
                'Disclaimer',
                parent=styles['Normal'],
                fontSize=8,
                textColor=colors.HexColor('#ef4444'),
                alignment=1,
                fontName='Helvetica-Oblique'
            )
        ))
        
        # ✅ BUILD PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
        
    except Exception as e:
        print(f"❌ PDF generation error: {e}")
        import traceback
        traceback.print_exc()
        
        # ✅ ERROR PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        
        error_elements = [
            Paragraph("<b>PDF Generation Error</b>", styles['Heading1']),
            Spacer(1, 0.2*inch),
            Paragraph(f"An error occurred while generating the medical report:<br/><br/>{str(e)}", styles['Normal']),
        ]
        doc.build(error_elements)
        buffer.seek(0)
        return buffer
