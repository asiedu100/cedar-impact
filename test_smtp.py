#!/usr/bin/env python3
"""Quick SMTP test script. Set SMTP_* env vars and run to test sending an email.
Example:
  SMTP_HOST=smtp.sendgrid.net SMTP_PORT=587 SMTP_USER=apikey SMTP_PASSWORD=SG.xxxxx python scripts/test_smtp.py
"""
import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
FROM = os.environ.get('SMTP_TEST_FROM', 'noreply@cedarimpact.local')
TO = os.environ.get('SMTP_TEST_TO')
SUBJECT = 'SMTP test from Cedar Impact'
BODY = 'This is a test email from the Cedar Impact SMTP test script.'

if not all([SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, TO]):
    print('Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_TEST_TO environment variables')
    exit(1)

msg = EmailMessage()
msg['Subject'] = SUBJECT
msg['From'] = FROM
msg['To'] = TO
msg.set_content(BODY)

try:
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
        s.ehlo()
        s.starttls()
        s.ehlo()
        s.login(SMTP_USER, SMTP_PASSWORD)
        s.send_message(msg)
    print('Email sent successfully')
except Exception as e:
    print('Failed to send email:', e)
    raise
