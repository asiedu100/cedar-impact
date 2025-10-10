from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from attendance.models import Event, Registration
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Send thank-you emails to attendees for events that ended yesterday'

    def handle(self, *args, **options):
        yesterday = timezone.now() - timedelta(days=1)
        events = Event.objects.filter(datetime__date=yesterday.date())
        for ev in events:
            regs = Registration.objects.filter(event=ev, attended=True)
            for r in regs:
                try:
                    subject = f"Thank you for attending {ev.name}"
                    message = f"Hi {r.user.get_full_name() or r.user.username},\n\nThank you for attending {ev.name} on {ev.datetime}. We appreciate your participation!\n\nBest,\nCedar Impact"
                    send_mail(subject, message, getattr(settings, 'EMAIL_FROM', 'noreply@cedarimpact.local'), [r.user.email])
                except Exception as exc:
                    self.stderr.write(str(exc))
