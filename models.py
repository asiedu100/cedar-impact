from django.db import models
from django.conf import settings

class Event(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    datetime = models.DateTimeField()
    location = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.name} @ {self.datetime}"

class Registration(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    attended = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user} -> {self.event}"
