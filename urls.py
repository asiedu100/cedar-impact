from django.urls import path
from . import views

urlpatterns = [
    path('create/', views.create_invite, name='create_invite'),
    path('verify/', views.verify_invite, name='verify_invite'),
]
