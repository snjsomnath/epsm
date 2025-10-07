"""
Authentication URL patterns
"""
from django.urls import path
from . import auth_views

urlpatterns = [
    path('login-info/', auth_views.login_info, name='login_info'),
    path('current-user/', auth_views.current_user, name='current_user'),
    path('login/', auth_views.local_login, name='local_login'),
    path('logout/', auth_views.logout_view, name='logout'),
]
