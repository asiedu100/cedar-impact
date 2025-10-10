from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.core.mail import send_mail
from django.conf import settings
from .models import Event, Registration
from django.contrib.auth import get_user_model


# Public test endpoint: accepts name,email,eventId and creates/uses a user to register and send confirmation.
# This is for quick local testing and should be removed or protected in production.
@require_POST
def register_public(request):
    User = get_user_model()
    name = request.POST.get('name') or ''
    email = request.POST.get('email')
    event_id = request.POST.get('eventId')
    if not email or not event_id:
        return JsonResponse({'success': False, 'error': 'email and eventId required'}, status=400)

    user, created_user = User.objects.get_or_create(email=email, defaults={'username': email.split('@')[0], 'first_name': name})
    # if new user, set unusable password so account isn't usable until user sets password
    if created_user:
        try:
            user.set_unusable_password()
            user.save()
        except Exception:
            pass

    event = get_object_or_404(Event, id=event_id)
    reg, created = Registration.objects.get_or_create(user=user, event=event)
    if created:
        subject = f"Registration confirmed: {event.name}"
        message = f"Hi {user.get_full_name() or user.username},\n\nYou are registered for {event.name} on {event.datetime}.\n\nLocation: {event.location}\n\nSee you there!\nCedar Impact"
        send_mail(subject, message, getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'), [user.email])
    return JsonResponse({'success': True, 'created': created})


from django.contrib.admin.views.decorators import staff_member_required
import csv
from django.http import HttpResponse


@staff_member_required
def export_attendance_csv(request):
    # Export all registration/attendance rows as CSV
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

@require_POST
@login_required
def register_for_event(request):
    event_id = request.POST.get('eventId') or request.json.get('eventId')
    event = get_object_or_404(Event, id=event_id)
    reg, created = Registration.objects.get_or_create(user=request.user, event=event)
    if created:
        # send confirmation email
        subject = f"Registration confirmed: {event.name}"
        message = f"Hi {request.user.get_full_name() or request.user.username},\n\nYou are registered for {event.name} on {event.datetime}.\n\nLocation: {event.location}\n\nSee you there!\nCedar Impact"
        send_mail(subject, message, getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'), [request.user.email])
    return JsonResponse({'success': True, 'created': created})
