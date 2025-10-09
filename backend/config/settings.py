import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-secret-key-here')

DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [h for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend,frontend').split(',') if h]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'simulation',
    'database',
    'channels',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Security settings
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
CSRF_COOKIE_SECURE = not DEBUG  # Only require HTTPS for CSRF in production
SESSION_COOKIE_SECURE = not DEBUG  # Only require HTTPS for sessions in production
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0  # Only HSTS in production
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
ALLOWED_UPLOAD_EXTENSIONS = ['.idf', '.epw']
MAX_UPLOAD_FILES = 10

# Rate limiting
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
}

# Enable throttling in production, but disable in DEBUG to avoid development 429s
if not DEBUG:
    REST_FRAMEWORK.update({
        'DEFAULT_THROTTLE_CLASSES': [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle'
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': '100/day',
            'user': '1000/day',
            'file_upload': '50/hour'
        }
    })

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.routing.application'

# Database configuration - Dual database setup
DATABASES = {
    'default': {
        # Docker PostgreSQL for Django-managed tables (users, simulations, etc.)
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'epsm_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    },
    'materials_db': {
        # Docker PostgreSQL for materials/constructions data
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('MATERIALS_DB_NAME', 'epsm_materials'),
        'USER': os.getenv('MATERIALS_DB_USER', 'epsm_user'),
        'PASSWORD': os.getenv('MATERIALS_DB_PASSWORD', ''),
        'HOST': os.getenv('MATERIALS_DB_HOST', 'database'),
        'PORT': os.getenv('MATERIALS_DB_PORT', '5432'),
    }
    ,
    'results_db': {
        # Dedicated Postgres database for simulation results/time-series
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('RESULTS_DB_NAME', 'epsm_results'),
        'USER': os.getenv('RESULTS_DB_USER', 'epsm_results_user'),
        'PASSWORD': os.getenv('RESULTS_DB_PASSWORD', ''),
        'HOST': os.getenv('RESULTS_DB_HOST', 'database'),
        'PORT': os.getenv('RESULTS_DB_PORT', '5432'),
    }
}

# Database routing
DATABASE_ROUTERS = ['config.db_router.DatabaseRouter']

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Simulation settings
SIMULATION_RESULTS_DIR = os.path.join(MEDIA_ROOT, 'simulation_results')

# Create necessary directories
os.makedirs(MEDIA_ROOT, exist_ok=True)
os.makedirs(SIMULATION_RESULTS_DIR, exist_ok=True)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings - allow configuration via environment variable (comma-separated)
# Example in production: CORS_ALLOWED_ORIGINS=https://epsm.chalmers.se
env_cors = os.getenv('CORS_ALLOWED_ORIGINS', '')
if env_cors:
    # split comma-separated env var and strip whitespace
    CORS_ALLOWED_ORIGINS = [u.strip() for u in env_cors.split(',') if u.strip()]
else:
    # sensible defaults for development / docker
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://frontend:5173",   # Docker service name
    ]

# Allow credentials by default (the project uses session auth / cookies)
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Simulation settings - Docker-based
# No local EnergyPlus installation needed - using nrel/energyplus Docker image
SIMULATION_DOCKER_IMAGE = os.getenv('ENERGYPLUS_DOCKER_IMAGE', 'nrel/energyplus:23.2.0')
SIMULATION_TIMEOUT = int(os.getenv('SIMULATION_TIMEOUT', '600'))  # 10 minutes default
WEATHER_FILES_DIR = BASE_DIR / 'weather_files'
SIMULATION_RESULTS_DIR = BASE_DIR / 'media/simulation_results'

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 3600  # 1 hour hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 3300  # 55 minutes soft limit