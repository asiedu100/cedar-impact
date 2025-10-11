Render deployment notes

1) Create a new Render Web Service (Docker or Python)

- Connect your GitHub repo and pick the `networking_hub` repository or branch.
- Environment: Python 3.11+ recommended.
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn networking_hub.wsgi --log-file -`

2) Environment variables (set in Render dashboard -> Environment):
- SECRET_KEY: a secure random string
- DEBUG: False (in production)
- ALLOWED_HOSTS: the Render service domain (e.g. `my-app.onrender.com`) or comma-separated
- DATABASE_URL: Postgres connection URL (if using Render Postgres addon)
- ADMIN_CODE: your admin invite code
- EMAIL_BACKEND / EMAIL_HOST / EMAIL_PORT / EMAIL_HOST_USER / EMAIL_HOST_PASSWORD / EMAIL_USE_TLS / DEFAULT_FROM_EMAIL: SMTP settings if you want real email delivery. Otherwise console backend prints emails to the server log.

3) Static files & collectstatic
- Render runs the start command; ensure `collectstatic` runs during build or add a release command to run:
  `python manage.py collectstatic --noinput`

4) After deployment
- Run migrations via the Render dashboard shell or add a `release` command:
  `python manage.py migrate`
- Create initial admin user via `createsuperuser` or via signup with ADMIN_CODE.

5) Recommended: add a cron job or background worker to run scheduled tasks (Send reminders). Use Render Cron or deploy a separate worker that runs `python manage.py send_reminders` on schedule.

6) Logs and debugging
- Tail logs in Render dashboard to observe console-email output when testing.

If you want, I can:
- Add a `render.yaml` example for full Render configuration (services + cron + db)
- Add a management command `send_reminders` so you can wire it to a Render Cron job (I can implement that next)
