#!/usr/bin/env python3
"""
Generate invite tokens for admin accounts.

Usage:
  # generate 5 tokens (no emails)
  python3 scripts/generate_invites.py 5

  # generate tokens for specific emails (comma separated)
  python3 scripts/generate_invites.py --emails admin1@example.com,admin2@example.com

This script must be run from the project root. It uses Django's ORM and will create InviteToken records.
"""
import os
import sys
import django
from datetime import timedelta
from django.utils import timezone

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'networking_hub.settings')
    django.setup()
    from networking_hub.models import InviteToken

    args = sys.argv[1:]
    if not args:
        print('Usage: python3 scripts/generate_invites.py <count>')
        print('Or: python3 scripts/generate_invites.py --emails a@b.com,c@d.com')
        sys.exit(1)

    if args[0].startswith('--emails'):
        parts = args[0].split('=', 1)
        if len(parts) == 2:
            emails = parts[1].split(',')
        else:
            emails = []
    else:
        try:
            count = int(args[0])
        except Exception:
            print('Invalid count')
            sys.exit(1)
        emails = [None] * count

    created = []
    for email in emails:
        token, obj = InviteToken.create_token(email=email, role='admin', expires_at=timezone.now() + timedelta(days=30))
        created.append((token, email))

    print('\nGenerated invite tokens (role=admin):')
    for t, e in created:
        if e:
            print(f'  token: {t}  (email: {e})')
        else:
            print(f'  token: {t}  (no email)')
    print('\nStore these tokens safely and distribute to your admins. Tokens expire in 30 days by default.')
