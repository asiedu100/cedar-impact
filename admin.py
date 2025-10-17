from django.contrib import admin
from .models import Event, Registration

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'datetime', 'location')
    search_fields = ('name', 'location')
    list_filter = ('datetime',)

@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'created_at', 'attended')
    list_filter = ('attended', 'created_at')
    search_fields = ('user__username', 'event__name')
