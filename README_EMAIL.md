Email Feature (Quick option)

This project includes a lightweight "Option 1" implementation for email notifications:
- Immediate registration confirmation (sent when a user registers for an event via POST /api/register/)
- Reminder emails (management command send_reminders)
- Post-event thank-you emails (management command send_thankyou)

Development defaults
- By default the project uses Django's console email backend so emails are printed to the console during development.
- Configure SMTP or a transactional provider for real sending (see Settings snippet in settings.py).

How to run locally (development)

1. Install dependencies and create virtualenv (if not already):

   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt  # if you have one; otherwise install Django

2. Apply migrations:

   python manage.py makemigrations attendance
   python manage.py migrate

3. Create a superuser (to access admin site):

   python manage.py createsuperuser

4. Run the dev server:

   python manage.py runserver

5. Test registration endpoint (logged-in user):

   POST /api/register/ with form data eventId=1 (or use curl)

6. View outgoing emails in the runserver console (console backend).

Reminder and thank-you scheduling (cron)

For production you can set up a daily cron job that runs the management commands:

# Run reminders every day at 01:00
0 1 * * * /path/to/venv/bin/python /path/to/project/manage.py send_reminders

# Run thank-you job every day at 02:00
0 2 * * * /path/to/venv/bin/python /path/to/project/manage.py send_thankyou

Switching to SMTP / transactional provider
- Set environment variables in your deployment for EMAIL_BACKEND, EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD and EMAIL_FROM.
- Or use django-anymail to integrate SendGrid/Mailgun easily.

SendGrid quick setup (SMTP)

1. Create an API key in SendGrid (Full Access or Mail Send permission).
2. Use the SMTP interface with the following env vars:

   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=<your-sendgrid-api-key>
   SMTP_TEST_FROM=you@yourdomain.com
   SMTP_TEST_TO=your-test-recipient@domain.com

3. Enable SMTP in Django by setting:

   export DJANGO_EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend

4. Test sending using the included script:

   SMTP_HOST=smtp.sendgrid.net SMTP_PORT=587 SMTP_USER=apikey SMTP_PASSWORD=SG.xxxxx SMTP_TEST_TO=you@domain.com python scripts/test_smtp.py

The script will attempt an SMTP TLS connection and send a simple test message.

Notes
- This is a minimal implementation intended for small groups and testing. For production (robust retry, monitoring) use a background worker (Celery) and a transactional provider.
