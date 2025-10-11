from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model
import csv
import json
from .models import Event, Registration

# -------------------------------
# Public test endpoint
# Accepts name, email, eventId and creates/uses a user to register and send confirmation
# -------------------------------
@require_POST
def register_public(request):
    User = get_user_model()
    name = request.POST.get('name') or ''
    email = request.POST.get('email')
    event_id = request.POST.get('eventId')

    if not email or not event_id:
        return JsonResponse({'success': False, 'error': 'email and eventId required'}, status=400)

    # Create or get user
    user, created_user = User.objects.get_or_create(
        email=email,
        defaults={'username': email.split('@')[0], 'first_name': name}
    )
    if created_user:
        user.set_unusable_password()
        user.save()

    # Get event
    event = get_object_or_404(Event, id=event_id)

    # Register user
    reg, created = Registration.objects.get_or_create(user=user, event=event)

    # Send confirmation email if newly registered
    if created:
        subject = f"Registration confirmed: {event.name}"
        message = (
            f"Hi {user.get_full_name() or user.username},\n\n"
            f"You are registered for {event.name} on {event.datetime}.\n\n"
            f"Location: {event.location}\n\nSee you there!\nCedar Impact"
        )
        send_mail(
            subject,
            message,
            getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'),
            [user.email],
            fail_silently=True
        )

    return JsonResponse({'success': True, 'created': created})

# -------------------------------
# Export attendance as CSV
# -------------------------------
@staff_member_required
def export_attendance_csv(request):
    rows = Registration.objects.select_related('user', 'event').all()
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance_export.csv"'
    writer = csv.writer(response)
    writer.writerow(['Name', 'Email', 'Role', 'Event', 'Event Date', 'Registered At', 'Attended'])

    for r in rows:
        writer.writerow([
            r.user.get_full_name() or r.user.username,
            r.user.email,
            getattr(r.user, 'role', ''),
            r.event.name,
            r.event.datetime.isoformat(),
            r.created_at.isoformat(),
            'yes' if r.attended else 'no'
        ])

    return response

# -------------------------------
# Register logged-in user for an event
# Handles POST form data or JSON requests
# -------------------------------
@login_required
@require_POST
def register_for_event(request):
    # Parse JSON if content type is JSON
    data = {}
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)

    event_id = request.POST.get('eventId') or data.get('eventId')
    if not event_id:
        return JsonResponse({'success': False, 'error': 'eventId required'}, status=400)

    event = get_object_or_404(Event, id=event_id)
    reg, created = Registration.objects.get_or_create(user=request.user, event=event)

    if created:
        subject = f"Registration confirmed: {event.name}"
        message = (
            f"Hi {request.user.get_full_name() or request.user.username},\n\n"
            f"You are registered for {event.name} on {event.datetime}.\n\n"
            f"Location: {event.location}\n\nSee you there!\nCedar Impact"
        )
        send_mail(
            subject,
            message,
            getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'),
            [request.user.email],
            fail_silently=True
        )

    return JsonResponse({'success': True, 'created': created})
