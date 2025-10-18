"""
Production settings for EPSM
Extends base settings with production-specific configuration for Chalmers deployment
Implements REFEDS Personalized Access Entity Category for SAML SSO
"""
from ..settings import *
import os

DEBUG = False

# Chalmers IT confirmed: only epsm.chalmers.se (no www subdomain) - 7 Oct 2025
# Allow environment variable override for ALLOWED_HOSTS, otherwise use defaults
ALLOWED_HOSTS = [
    h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'epsm.chalmers.se,epsm.ita.chalmers.se,localhost,backend').split(',')
    if h.strip()
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

# Proxy/SSL Headers (nginx sets X-Forwarded-Proto)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    "https://epsm.chalmers.se",
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

# Add SAML session middleware for production
MIDDLEWARE += [
    'djangosaml2.middleware.SamlSessionMiddleware',
]

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Fallback for local superuser
    'djangosaml2.backends.Saml2Backend',  # Primary: Chalmers SSO
]

# SAML Settings for Chalmers Identity Provider
# Implements REFEDS Personalized Access Entity Category
# https://refeds.org/category/personalized
SAML_CONFIG = {
    'xmlsec_binary': '/usr/bin/xmlsec1',
    'entityid': 'https://epsm.chalmers.se/saml/metadata/',
    
    # Certificate configuration for both signing and encryption
    'key_file': '/app/saml_certs/sp_private_key.pem',
    'cert_file': '/app/saml_certs/sp_certificate.pem',
    
    # Security: Force stronger algorithms at the global level
    'signing_algorithm': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    'digest_algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256',
    
    # Additional security settings to enforce strong algorithms
    'preferred_binding': {
        'single_sign_on_service': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
        'single_logout_service': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT',
    },
    
    # Force the signing and digest algorithms
    'policy': {
        'default': {
            'sign_alg': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
            'digest_alg': 'http://www.w3.org/2001/04/xmlenc#sha256',
        }
    },
    
    'service': {
        'sp': {
            'name': 'EPSM - Energy Performance Simulation Manager',
            'name_id_format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
            
            # Security: Enable signing for outgoing requests but allow unsigned responses from IdP
            # Updated Oct 2025: Chalmers IdP sends unsigned responses, so we must allow them
            'want_assertions_signed': False,  # Allow unsigned assertions from Chalmers IdP
            'want_response_signed': False,    # Allow unsigned responses from Chalmers IdP
            'authn_requests_signed': True,    # Still sign our outgoing requests
            'logout_requests_signed': True,   # Still sign our logout requests
            
            # Certificate configuration: No 'use' attribute so cert can be used for both signing and encryption
            # Björn's feedback: "If you can remove 'use="signing"' it will be used for both signing and encryption"
            # Note: pysaml2 doesn't support 'key_descriptor' without 'use', so we rely on global cert config
            # The custom metadata view will strip 'use' attributes from the generated metadata
            
            'endpoints': {
                'assertion_consumer_service': [
                    ('https://epsm.chalmers.se/saml/acs/', 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'),
                ],
                'single_logout_service': [
                    ('https://epsm.chalmers.se/saml/sls/', 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-REDIRECT'),
                ],
            },
            
            # REFEDS Personalized Access required attributes
            'required_attributes': [
                'eduPersonPrincipalName',  # or samlSubjectID
                'mail',
                'givenName',
                'sn',
            ],
            
            # REFEDS Personalized Access optional attributes
            'optional_attributes': [
                'displayName',
                'eduPersonScopedAffiliation',
                'schacHomeOrganization',
                'eduPersonAssurance',
                'samlSubjectID',
            ],
            
            # Allow unsolicited responses (IdP-initiated login)
            'allow_unsolicited': True,
        },
    },
    
    # Chalmers Identity Provider metadata
    'metadata': {
        'remote': [
            {
                # Chalmers IdP metadata URL (provided by Björn)
                'url': os.environ.get(
                    'SAML_IDP_METADATA_URL',
                    'https://www.ita.chalmers.se/idp.chalmers.se.xml'
                ),
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

# Map REFEDS Personalized Access SAML attributes to Django User model
# See: https://wiki.sunet.se/display/SWAMID/4.1+Entity+Categories+for+Service+Providers
SAML_ATTRIBUTE_MAPPING = {
    # Primary unique identifier (REFEDS standard)
    # urn:oasis:names:tc:SAML:attribute:subject-id or eduPersonPrincipalName
    'eduPersonPrincipalName': ('username',),  # ssanjay@chalmers.se -> ssanjay
    'samlSubjectID': ('username',),  # Alternative persistent identifier
    
    # Email address (urn:oid:0.9.2342.19200300.100.1.3)
    'mail': ('email',),
    
    # Display name (urn:oid:2.16.840.1.113730.3.1.241)
    'displayName': ('first_name', 'last_name'),  # Split by custom_update_user
    
    # Given name (urn:oid:2.5.4.42)
    'givenName': ('first_name',),
    
    # Surname (urn:oid:2.5.4.4)
    'sn': ('last_name',),
    
    # Note: The following are handled in custom_update_user but not directly mapped:
    # - eduPersonScopedAffiliation (urn:oid:1.3.6.1.4.1.5923.1.1.1.9)
    # - schacHomeOrganization (urn:oid:1.3.6.1.4.1.25178.1.2.9)
    # - eduPersonAssurance (urn:oid:1.3.6.1.4.1.5923.1.1.1.11)
}

# Automatically create user account on first SSO login
SAML_CREATE_UNKNOWN_USER = True

# Use eduPersonPrincipalName/samlSubjectID as the username (extracted by custom hook)
SAML_DJANGO_USER_MAIN_ATTRIBUTE = 'username'
SAML_USE_NAME_ID_AS_USERNAME = False

# Custom user creation/update function (handles REFEDS attribute extraction)
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
        'config.saml_hooks': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',  # Detailed attribute mapping debugging
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
