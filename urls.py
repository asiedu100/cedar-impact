from django.urls import path
from . import views

urlpatterns = [
    path('api/register/', views.register_for_event, name='register_for_event'),
    path('api/register_public/', views.register_public, name='register_public'),
    path('admin/export_attendance/', views.export_attendance_csv, name='export_attendance_csv'),
]
