from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from attendance.models import Event, Registration
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Send reminder emails for events happening in two days'

    def handle(self, *args, **options):
        target = timezone.now() + timedelta(days=2)
        events = Event.objects.filter(datetime__date=target.date())
        for ev in events:
            regs = Registration.objects.filter(event=ev)
            for r in regs:
                try:
                    subject = f"Reminder: {ev.name} in 2 days"
                    message = f"Hi {r.user.get_full_name() or r.user.username},\n\nThis is a reminder that {ev.name} is coming up on {ev.datetime}.\nLocation: {ev.location}\n\nSee you there!\nCedar Impact"
                    send_mail(subject, message, getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'), [r.user.email])
                except Exception as exc:
                    self.stderr.write(str(exc))
