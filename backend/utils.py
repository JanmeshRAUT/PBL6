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
TRUSTED_NETWORK = ipaddress.ip_network("192.168.1.0/24")
TRUST_THRESHOLD = 40

# Email placeholders (REPLACE before running)
EMAIL_SENDER = "janmeshraut.mitadt@gmail.com"
EMAIL_PASSWORD = "ejnf urgs ipmc kgdg"  # <-- replace
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
        subject = "🔐 Your MedTrust EHR Login OTP"
        # --- Professional HTML Email Template ---
        body = f"""
        <html>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f8fb; margin:0; padding:0;">
          <table width="100%" bgcolor="#f4f8fb" cellpadding="0" cellspacing="0" style="padding: 0; margin: 0;">
            <tr>
              <td align="center">
                <table width="420" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="border-radius:12px; box-shadow:0 4px 24px rgba(37,99,235,0.08); margin:2rem 0;">
                  <tr>
                    <td style="padding:2rem 2rem 1rem 2rem; text-align:center;">
                      <h2 style="margin:0; color:#2563eb; font-size:1.5rem; font-weight:700; letter-spacing:-1px;">
                        MedTrust <span style="color:#10b981;">AI</span>
                      </h2>
                      <p style="margin:0.5rem 0 0 0; color:#64748b; font-size:1rem;">
                        Secure Electronic Health Records Access
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:1.5rem 2rem 0.5rem 2rem;">
                      <p style="margin:0; color:#1e293b; font-size:1.05rem;">
                        Hi <strong>{name}</strong>,
                      </p>
                      <p style="margin:1rem 0 0.5rem 0; color:#334155; font-size:1rem;">
                        Your One-Time Password (OTP) for login is:
                      </p>
                      <div style="margin:1.5rem 0; text-align:center;">
                        <span style="
                          display:inline-block;
                          background:#f1f5f9;
                          color:#2563eb;
                          font-size:2.2rem;
                          font-weight:700;
                          letter-spacing:0.25rem;
                          padding:0.75rem 2.5rem;
                          border-radius:10px;
                          border:1px solid #e2e8f0;
                          box-shadow:0 2px 8px rgba(37,99,235,0.08);
                        ">{otp}</span>
                      </div>
                      <p style="margin:0.5rem 0 0 0; color:#64748b; font-size:0.97rem;">
                        <strong>Valid for 3 minutes.</strong> Please do not share this OTP with anyone.
                      </p>
                      <p style="margin:1.5rem 0 0 0; color:#64748b; font-size:0.95rem;">
                        If you did not request this OTP, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2rem 2rem 1.5rem 2rem; text-align:center;">
                      <div style="margin:1.5rem 0 0 0; color:#94a3b8; font-size:0.9rem;">
                        <hr style="border:none; border-top:1px solid #e2e8f0; margin:1.5rem 0;">
                        <span>
                          MedTrust AI &copy; {datetime.utcnow().year}<br>
                          <span style="color:#2563eb;">Secure EHR Platform</span>
                        </span>
                      </div>
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
        
        # ✅ PROFESSIONAL STYLES
        title_style = ParagraphStyle(
            'ProTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e3a8a'),
            spaceAfter=6,
            alignment=1,
            fontName='Helvetica-Bold',
            letterSpacing=1
        )
        
        subtitle_style = ParagraphStyle(
            'ProSubtitle',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#64748b'),
            alignment=1,
            spaceAfter=20,
            fontName='Helvetica'
        )
        
        section_header_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            textColor=colors.white,
            spaceAfter=10,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            leftIndent=8
        )
        
        field_label_style = ParagraphStyle(
            'FieldLabel',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#334155'),
            spaceAfter=2,
            fontName='Helvetica-Bold',
            letterSpacing=0.5
        )
        
        field_value_style = ParagraphStyle(
            'FieldValue',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=8,
            fontName='Helvetica'
        )
        
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'),
            alignment=1,
            spaceAfter=4
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
        
        # ✅ HEADER: LOGO + TITLE
        header_data = [
            [
                Paragraph("<b>🏥 MEDTRUST AI</b><br/><font size=8>Electronic Health Records System</font>", subtitle_style),
                Paragraph("<b>PATIENT HEALTH REPORT</b><br/><font size=8>Confidential Medical Document</font>", title_style)
            ]
        ]
        header_table = Table(header_data, colWidths=[2*inch, 4*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('LINEBELOW', (0, 0), (-1, -1), 2, colors.HexColor('#2563eb')),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.3*inch))
        
        # ✅ PATIENT DEMOGRAPHICS SECTION
        elements.append(Paragraph("PATIENT DEMOGRAPHICS", section_header_style))
        
        demo_data = [
            [
                Paragraph("<b>Full Name</b>", field_label_style),
                Paragraph(safe_get("name", "Unknown"), field_value_style),
                Paragraph("<b>Date of Birth / Age</b>", field_label_style),
                Paragraph(f"{safe_get('age', '0')} years old", field_value_style),
            ],
            [
                Paragraph("<b>Gender</b>", field_label_style),
                Paragraph(safe_get("gender"), field_value_style),
                Paragraph("<b>Email Address</b>", field_label_style),
                Paragraph(safe_get("email"), field_value_style),
            ]
        ]
        
        demo_table = Table(demo_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        demo_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#dbeafe')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#dbeafe')),
        ]))
        elements.append(demo_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ CLINICAL DIAGNOSIS SECTION
        elements.append(Paragraph("CLINICAL DIAGNOSIS", section_header_style))
        
        diag_data = [
            [
                Paragraph("<b>Primary Diagnosis</b>", field_label_style),
                Paragraph(safe_get("diagnosis", "Pending"), field_value_style),
            ]
        ]
        
        diag_table = Table(diag_data, colWidths=[1.5*inch, 4.5*inch])
        diag_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#d1fae5')),
        ]))
        elements.append(diag_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ TREATMENT PLAN SECTION
        elements.append(Paragraph("TREATMENT PLAN", section_header_style))
        
        treatment_text = safe_get("treatment", "No treatment plan specified")
        elements.append(Paragraph(treatment_text, field_value_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ CLINICAL NOTES SECTION
        elements.append(Paragraph("CLINICAL NOTES & OBSERVATIONS", section_header_style))
        
        notes_text = safe_get("notes", "No additional clinical notes")
        elements.append(Paragraph(notes_text, field_value_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # ✅ VISIT HISTORY SECTION
        elements.append(Paragraph("VISIT & FOLLOW-UP INFORMATION", section_header_style))
        
        visit_data = [
            [
                Paragraph("<b>Last Clinical Visit</b>", field_label_style),
                Paragraph(safe_get("last_visit", "Not recorded"), field_value_style),
            ]
        ]
        
        visit_table = Table(visit_data, colWidths=[1.5*inch, 4.5*inch])
        visit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef3c7')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#fcd34d')),
        ]))
        elements.append(visit_table)
        elements.append(Spacer(1, 0.4*inch))
        
        # ✅ FOOTER: SIGNATURE + METADATA
        footer_line_table = Table([["" * 100]], colWidths=[6*inch])
        footer_line_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ]))
        elements.append(footer_line_table)
        elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Paragraph("DOCUMENT INFORMATION", footer_style))
        elements.append(Paragraph(
            f"<b>Generated on:</b> {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}<br/>"
            f"<b>System:</b> MedTrust AI - Secure Electronic Health Records<br/>"
            f"<b>Document Status:</b> CONFIDENTIAL - Medical Information<br/>"
            f"<b>Access Control:</b> Role-Based & AI-Driven Trust System",
            footer_style
        ))
        elements.append(Spacer(1, 0.1*inch))
        
        elements.append(Paragraph(
            "This document contains sensitive personal health information and is intended for authorized healthcare professionals only. "
            "Unauthorized distribution is prohibited. All access is logged and audited.",
            ParagraphStyle(
                'Disclaimer',
                parent=styles['Normal'],
                fontSize=7,
                textColor=colors.HexColor('#ef4444'),
                alignment=0,
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
