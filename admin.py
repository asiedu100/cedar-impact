from django.contrib import admin
from .models import InviteToken


@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'created_at', 'expires_at', 'used_at')
