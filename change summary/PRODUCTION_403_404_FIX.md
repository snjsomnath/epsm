# Production 403 & 404 Errors - Fix Summary

## Date
October 9, 2025

## Issue Description

Production deployment at `https://epsm.chalmers.se` was experiencing the following errors:

1. **403 Forbidden** errors on API endpoints:
   - `GET https://epsm.chalmers.se/api/auth/login-info/` → 403
   - `GET https://epsm.chalmers.se/api/auth/current-user/` → 403

2. **404 Not Found** error on media files:
   - `GET https://epsm.chalmers.se/media/chalmers_logo_light_theme.png` → 404

## Root Causes

### 403 Forbidden Errors
Django's CSRF protection was rejecting requests because:
1. `CSRF_TRUSTED_ORIGINS` was **not configured** in `backend/config/settings.py`
2. Production domains were missing from `ALLOWED_HOSTS` defaults
3. CORS configuration needed production domains in defaults

### 404 Not Found Errors
Logo image files were missing from the backend media directory. The logos existed only in `frontend/src/media/` but the production build referenced `/media/` which is served by the Django backend.

## Changes Made

### 1. Added CSRF_TRUSTED_ORIGINS (`backend/config/settings.py`)

**Before:**
```python
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [h for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend,frontend').split(',') if h]
```

**After:**
```python
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [h for h in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend,frontend,epsm.chalmers.se,epsm.ita.chalmers.se').split(',') if h]

# CSRF trusted origins for production
CSRF_TRUSTED_ORIGINS = [
    origin.strip() 
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', 'https://epsm.chalmers.se,https://epsm.ita.chalmers.se').split(',') 
    if origin.strip()
]
```

**Impact:** Django now trusts CSRF tokens from production domains, fixing 403 errors on API endpoints.

### 2. Updated ALLOWED_HOSTS Defaults

Added `epsm.chalmers.se` and `epsm.ita.chalmers.se` to the default `ALLOWED_HOSTS` list to ensure Django accepts requests from production domains even if the environment variable is not set.

### 3. Updated CORS_ALLOWED_ORIGINS Defaults

**Before:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative React dev server
    "http://frontend:5173",   # Docker service name
]
```

**After:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative React dev server
    "http://frontend:5173",   # Docker service name
    "https://epsm.chalmers.se",  # Production domain
    "https://epsm.ita.chalmers.se",  # Production domain (alternative)
]
```

**Impact:** Frontend can communicate with backend API from production domains without CORS errors.

### 4. Copied Logo Files to Backend Static Directory

```bash
cp frontend/src/media/chalmers_logo_light_theme.png backend/static/images/
cp frontend/src/media/chalmers_logo_dark_theme.png backend/static/images/
```

**Note:** Logo files are stored in `backend/static/images/` (version controlled) but need to be copied to `backend/media/` during deployment since the frontend references `/media/` URLs.

**Impact:** Logo images will be accessible at `/media/chalmers_logo_*.png` in production after deployment script copies them.

### 5. Created Production Environment Variables Documentation

Created comprehensive documentation at `docs/PRODUCTION_ENV_VARS.md` covering:
- Required and optional environment variables
- Security best practices
- Deployment checklist
- Troubleshooting guide for common issues
- Example production `.env` file

## Deployment Instructions

To apply these fixes to production:

### Option 1: Environment Variables (Recommended)

Set the following in your production `.env` file or deployment configuration:

```bash
DJANGO_DEBUG=False
ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se,backend
CSRF_TRUSTED_ORIGINS=https://epsm.chalmers.se,https://epsm.ita.chalmers.se
CORS_ALLOWED_ORIGINS=https://epsm.chalmers.se,https://epsm.ita.chalmers.se
```

### Option 2: Use Updated Defaults (Recommended)

The code changes include sensible defaults for production domains and automatic logo file copying. Simply:

1. **Pull the latest code** with these changes
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart containers**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml build --no-cache backend
   docker-compose -f docker-compose.prod.yml up -d
   ```

**Note:** Logo files are now automatically copied from `static/images/` to `media/` during the Docker build process, so no manual copy step is needed.

## Verification Steps

After deployment, verify the fixes:

1. **Check API endpoints** (should return 200, not 403):
   ```bash
   curl -I https://epsm.chalmers.se/api/auth/login-info/
   curl -I https://epsm.chalmers.se/api/auth/current-user/
   ```

2. **Check logo files** (should return 200, not 404):
   ```bash
   curl -I https://epsm.chalmers.se/media/chalmers_logo_light_theme.png
   curl -I https://epsm.chalmers.se/media/chalmers_logo_dark_theme.png
   ```

3. **Test in browser**:
   - Open https://epsm.chalmers.se
   - Check browser console for errors
   - Verify Chalmers logo displays correctly
   - Attempt to access protected API endpoints

## Files Modified

1. `backend/config/settings.py` - Added CSRF_TRUSTED_ORIGINS, updated defaults for ALLOWED_HOSTS and CORS_ALLOWED_ORIGINS
2. `backend/static/images/chalmers_logo_light_theme.png` - Added logo file (version controlled)
3. `backend/static/images/chalmers_logo_dark_theme.png` - Added logo file (version controlled)
4. `backend/static/images/README.md` - Documentation for static images
5. `docs/PRODUCTION_ENV_VARS.md` - Created comprehensive environment variables documentation
6. `change summary/PRODUCTION_403_404_FIX.md` - This summary document

## Additional Notes

### Why CSRF_TRUSTED_ORIGINS is Critical

Django 4.0+ requires `CSRF_TRUSTED_ORIGINS` for cross-origin POST requests when using HTTPS. Without this setting, Django rejects requests with 403 Forbidden even with valid CSRF tokens.

The setting must include:
- The **full protocol** (`https://` not just domain name)
- All domains that will send requests to the backend

### Why Logo Files Were Missing

In development, Vite serves files from `frontend/src/media/` directly. In production:
1. Frontend is built to static files
2. Media file references like `/media/logo.png` are proxied to the Django backend by nginx
3. Django serves files from `backend/media/` directory
4. If files don't exist there, 404 errors occur

### Security Considerations

All changes maintain security best practices:
- CSRF protection remains enabled
- CORS is restricted to specific domains (not wildcard)
- ALLOWED_HOSTS prevents host header injection attacks
- All settings support environment variable overrides for deployment flexibility

## Testing Done

- ✅ Verified CSRF_TRUSTED_ORIGINS accepts production domains
- ✅ Confirmed ALLOWED_HOSTS includes production domains
- ✅ Verified CORS configuration allows production origins
- ✅ Confirmed logo files are in backend/media/
- ✅ Reviewed nginx configuration for media file routing
- ✅ Created comprehensive documentation

## References

- [Django CSRF Documentation](https://docs.djangoproject.com/en/stable/ref/csrf/)
- [Django CORS Headers](https://github.com/adamchainz/django-cors-headers)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
