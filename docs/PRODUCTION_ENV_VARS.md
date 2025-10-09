# Production Environment Variables

This document lists all required and optional environment variables for deploying EPSM in production.

## Last Updated
October 9, 2025

## Critical Environment Variables

### Django Backend

#### Required
- `DJANGO_DEBUG=False` - **MUST** be set to False in production
- `DJANGO_SECRET_KEY` - A strong secret key (generate with `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`)
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/dbname`)
- `REDIS_URL` - Redis connection string (e.g., `redis://redis:6379/0`)

#### Security & Domain Configuration
- `ALLOWED_HOSTS` - Comma-separated list of allowed hosts
  - Example: `epsm.chalmers.se,epsm.ita.chalmers.se,localhost,backend`
  - Default: `localhost,127.0.0.1,backend,frontend,epsm.chalmers.se,epsm.ita.chalmers.se`

- `CSRF_TRUSTED_ORIGINS` - Comma-separated list of trusted origins for CSRF validation
  - Example: `https://epsm.chalmers.se,https://epsm.ita.chalmers.se`
  - Default: `https://epsm.chalmers.se,https://epsm.ita.chalmers.se`
  - **Important**: Must include `https://` protocol prefix

- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
  - Example: `https://epsm.chalmers.se,https://epsm.ita.chalmers.se`
  - Default includes both development and production origins
  - **Important**: Must include `https://` protocol prefix

#### Database Configuration
- `DB_NAME` - PostgreSQL database name (default: `epsm_db`)
- `DB_USER` - PostgreSQL username (default: `epsm_user`)
- `DB_PASSWORD` - PostgreSQL password (default: `epsm_secure_password`)
- `DB_HOST` - PostgreSQL host (default: `database`)
- `DB_PORT` - PostgreSQL port (default: `5432`)

#### Celery Configuration
- `CELERY_BROKER_URL` - Redis URL for Celery broker (default: `redis://redis:6379/0`)
- `CELERY_RESULT_BACKEND` - Redis URL for results (default: `redis://redis:6379/0`)

### Frontend

#### Build-time Variables
These are embedded into the frontend build and cannot be changed at runtime:

- `VITE_API_URL` - Backend API URL
  - Production: `https://epsm.chalmers.se`
  - Development: `http://localhost:8000`

### SSL/TLS Certificates

For HTTPS deployment, ensure SSL certificates are properly configured:

- Certificate files should be placed in `.docker/nginx/ssl/`
  - `fullchain.pem` - Full certificate chain
  - `privkey.pem` - Private key

## Example Production .env File

```bash
# Django Backend
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=your-very-long-and-random-secret-key-here
ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se,backend
CSRF_TRUSTED_ORIGINS=https://epsm.chalmers.se,https://epsm.ita.chalmers.se
CORS_ALLOWED_ORIGINS=https://epsm.chalmers.se,https://epsm.ita.chalmers.se

# Database
DB_NAME=epsm_db
DB_USER=epsm_user
DB_PASSWORD=your-secure-database-password
DB_HOST=database
DB_PORT=5432
DATABASE_URL=postgresql://epsm_user:your-secure-database-password@database:5432/epsm_db

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Frontend (build-time only)
VITE_API_URL=https://epsm.chalmers.se
```

## Troubleshooting

### 403 Forbidden Errors on API Endpoints

**Symptoms**: API calls to `/api/auth/login-info/` or `/api/auth/current-user/` return 403 Forbidden

**Solution**: 
1. Ensure `CSRF_TRUSTED_ORIGINS` includes your production domain with `https://` prefix
2. Ensure `ALLOWED_HOSTS` includes your production domain
3. Restart backend containers after changing environment variables

### 404 Not Found on Media Files

**Symptoms**: Images like `/media/chalmers_logo_light_theme.png` return 404

**Solution**:
1. Ensure logo files exist in `backend/media/` directory
2. Check nginx configuration for proper media file routing
3. Verify file permissions allow nginx to read media files

### CORS Errors

**Symptoms**: Browser console shows CORS-related errors

**Solution**:
1. Ensure `CORS_ALLOWED_ORIGINS` includes your frontend domain with protocol
2. Verify `CORS_ALLOW_CREDENTIALS=True` in Django settings
3. Check that nginx is properly forwarding headers

## Deployment Checklist

Before deploying to production:

- [ ] Set `DJANGO_DEBUG=False`
- [ ] Generate and set a strong `DJANGO_SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS` with production domains
- [ ] Configure `CSRF_TRUSTED_ORIGINS` with `https://` prefixes
- [ ] Configure `CORS_ALLOWED_ORIGINS` with `https://` prefixes
- [ ] Set strong database password
- [ ] Configure SSL certificates in nginx
- [ ] Run database migrations
- [ ] Collect static files
- [ ] Test all API endpoints return expected responses
- [ ] Verify media files are accessible
- [ ] Test SAML SSO login flow (if enabled)

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Rotate `DJANGO_SECRET_KEY` periodically**
3. **Use environment-specific credentials** (don't reuse dev credentials in production)
4. **Enable HTTPS** for all production deployments
5. **Restrict database access** to backend containers only
6. **Use strong passwords** for all services (minimum 16 characters, mixed case, numbers, symbols)
7. **Enable rate limiting** in production (automatically enabled when `DEBUG=False`)
8. **Monitor logs** for suspicious activity
9. **Keep dependencies updated** to patch security vulnerabilities

## Additional Resources

- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [EPSM Deployment Guide](./DEPLOYMENT.md)
- [Docker Compose Production Configuration](../docker-compose.prod.yml)
