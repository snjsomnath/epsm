"""
Production settings for EPSM
Extends base settings with production-specific configuration for Chalmers deployment
"""
from .base import *
import os

DEBUG = False

ALLOWED_HOSTS = [
    'epsm.chalmers.se',
    'www.epsm.chalmers.se',
    'localhost',  # For internal Docker communication
]

# Security Settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "https://epsm.chalmers.se",
    "https://www.epsm.chalmers.se",
]

# Static and Media Files
STATIC_ROOT = '/app/staticfiles'
MEDIA_ROOT = '/app/media'
STATIC_URL = '/static/'
MEDIA_URL = '/media/'

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.chalmers.se')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = 'epsm@chalmers.se'

# SAML Configuration for Chalmers SSO
INSTALLED_APPS += [
    'djangosaml2',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Fallback for local superuser
    'djangosaml2.backends.Saml2Backend',  # Primary: Chalmers SSO
]

# SAML Settings for Chalmers Identity Provider
SAML_CONFIG = {
    'xmlsec_binary': '/usr/bin/xmlsec1',
    'entityid': 'https://epsm.chalmers.se/saml/metadata/',
    
    'service': {
        'sp': {
            'name': 'EPSM - Energy Performance Simulation Manager',
            'name_id_format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
            
            'endpoints': {
                'assertion_consumer_service': [
                    ('https://epsm.chalmers.se/saml/acs/', 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'),
                ],
                'single_logout_service': [
                    ('https://epsm.chalmers.se/saml/sls/', 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT'),
                ],
            },
            
            # Attributes required from Chalmers IdP
            'required_attributes': ['uid', 'mail', 'givenName', 'sn'],
            'optional_attributes': ['eduPersonAffiliation', 'displayName'],
            
            # Allow unsolicited responses (IdP-initiated login)
            'allow_unsolicited': True,
        },
    },
    
    # Chalmers Identity Provider metadata
    'metadata': {
        'remote': [
            {
                # This URL will be provided by Chalmers IT (Björn)
                'url': os.environ.get('SAML_IDP_METADATA_URL', 'https://idp.chalmers.se/idp/shibboleth'),
            },
        ],
    },
    
    # Contact information for SP metadata
    'contact_person': [
        {
            'given_name': 'Sanjay',
            'sur_name': 'Somanath',
            'company': 'Chalmers University of Technology',
            'email_address': 'sanjay.somanath@chalmers.se',
            'contact_type': 'technical',
        },
        {
            'given_name': 'Alexander',
            'sur_name': 'Hollberg',
            'company': 'Chalmers University of Technology',
            'email_address': 'alexander.hollberg@chalmers.se',
            'contact_type': 'administrative',
        },
    ],
    
    'organization': {
        'name': [('Chalmers University of Technology', 'en')],
        'display_name': [('EPSM - Energy Performance Simulation Manager', 'en')],
        'url': [('https://www.chalmers.se', 'en')],
    },
}

# Map Chalmers SAML attributes to Django User model
SAML_ATTRIBUTE_MAPPING = {
    # Chalmers CID (e.g., 'ssanjay') -> Django username
    'uid': ('username',),
    
    # Email (e.g., 'ssanjay@chalmers.se') -> Django email
    'mail': ('email',),
    
    # Given name (e.g., 'Sanjay') -> Django first_name
    'givenName': ('first_name',),
    
    # Surname (e.g., 'Somanath') -> Django last_name
    'sn': ('last_name',),
}

# Automatically create user account on first SSO login
SAML_CREATE_UNKNOWN_USER = True

# Use CID as the username (not email or name ID)
SAML_DJANGO_USER_MAIN_ATTRIBUTE = 'username'
SAML_USE_NAME_ID_AS_USERNAME = False

# Custom user creation/update function
SAML_ATTRIBUTE_MAPPING_CALLBACK = 'config.saml_hooks.custom_update_user'

# Session configuration for SAML
SESSION_COOKIE_AGE = 3600 * 8  # 8 hours
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/app/logs/django.log',
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'djangosaml2': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',  # Detailed SAML debugging
            'propagate': False,
        },
    },
}

# Sentry Error Tracking (optional)
if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
