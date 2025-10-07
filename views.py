import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import InviteToken
from django.conf import settings


@csrf_exempt
def create_invite(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    # In a real app, you should check that request.user is admin
    data = json.loads(request.body.decode('utf-8') or '{}')
    email = data.get('email')
    role = data.get('role', 'executive')
    token, obj = InviteToken.create_token(email=email, role=role)
    # For development we return the token; in prod email it instead
    return JsonResponse({'token': token, 'invite_id': obj.id})


@csrf_exempt
def verify_invite(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    data = json.loads(request.body.decode('utf-8') or '{}')
    token = data.get('token')
    admin_code = data.get('admin_code')

    # Allow admin_code (server-side) as an alternative to invite token
    if admin_code:
        provided = (admin_code or '').strip().upper()
        expected = (getattr(settings, 'ADMIN_CODE', '') or '').strip().upper()
        if provided and expected and provided == expected:
            return JsonResponse({'valid': True, 'role': 'executive', 'email': None})

    if not token:
        return JsonResponse({'valid': False}, status=400)

    # simple scan (not optimized)
    for inv in InviteToken.objects.all():
        try:
            if inv.verify(token):
                return JsonResponse({'valid': True, 'role': inv.role, 'email': inv.email})
        except Exception:
            continue
    return JsonResponse({'valid': False}, status=404)
