"""
Development settings for EPSM
"""
from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Development-specific CORS
CORS_ALLOW_ALL_ORIGINS = True

# Email to console for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
