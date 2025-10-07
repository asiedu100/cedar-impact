import secrets
import hashlib
from django.db import models


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


class InviteToken(models.Model):
    token_hash = models.CharField(max_length=128, unique=True)
    email = models.EmailField(null=True, blank=True)
    role = models.CharField(max_length=32, default='executive')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by_email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return f"Invite for {self.email or 'anyone'} ({self.role})"

    @classmethod
    def create_token(cls, email=None, role='executive', expires_at=None):
        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        obj = cls.objects.create(token_hash=token_hash, email=email, role=role, expires_at=expires_at)
        return token, obj

    def verify(self, token: str):
        if self.used_at:
            return False
        if self.expires_at and self.expires_at < models.timezone.now():
            return False
        return self.token_hash == hash_token(token)
