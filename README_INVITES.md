Generate invite tokens for admins

This repository includes a small script to generate invite tokens that can be redeemed to create admin accounts.

1) Create migrations and migrate (if not done):

    python manage.py makemigrations
    python manage.py migrate

2) Run the generator (project root):

    # generate 5 anonymous tokens
    python3 scripts/generate_invites.py 5

    # or generate tokens for specific emails
    python3 scripts/generate_invites.py --emails=admin1@example.com,admin2@example.com

3) Distribute the printed tokens to your admin users. They can redeem tokens in the Sign Up form (paste token into "Invite Token").

Notes
- Tokens in this script expire in 30 days by default (adjustable in the script).
- For development, the OTP/email endpoints print OTPs to the runserver console (EMAIL_BACKEND is console). To send real emails, configure SMTP in `settings.py`.
