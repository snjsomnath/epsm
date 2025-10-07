# No WWW Subdomain - Configuration Update

**Date:** 7 October 2025  
**Status:** ✅ Complete  
**Reason:** Chalmers IT confirmation - no www subdomain available

## Background

Chalmers IT confirmed that the domain setup will be:
- **Service URL:** `epsm.chalmers.se` (no www subdomain)
- **VM Hostname:** `epsm.ita.chalmers.se`
- **Host IP:** 129.16.69.25

This is completely standard and actually simpler than having both `www` and non-www versions.

## Changes Made

### 1. Production Settings (`backend/config/settings/production.py`)

**Updated:**
- `ALLOWED_HOSTS`: Removed `'www.epsm.chalmers.se'`
- `CORS_ALLOWED_ORIGINS`: Removed `"https://www.epsm.chalmers.se"`
- Added comment: "Chalmers IT confirmed: only epsm.chalmers.se (no www subdomain) - 7 Oct 2025"

**Before:**
```python
ALLOWED_HOSTS = [
    'epsm.chalmers.se',
    'www.epsm.chalmers.se',
    'localhost',
]

CORS_ALLOWED_ORIGINS = [
    "https://epsm.chalmers.se",
    "https://www.epsm.chalmers.se",
]
```

**After:**
```python
# Chalmers IT confirmed: only epsm.chalmers.se (no www subdomain) - 7 Oct 2025
ALLOWED_HOSTS = [
    'epsm.chalmers.se',
    'localhost',  # For internal Docker communication
]

CORS_ALLOWED_ORIGINS = [
    "https://epsm.chalmers.se",
]
```

### 2. Backup Production Settings (`backend/config/settings.backup/production.py`)

Same updates applied to backup configuration for consistency.

### 3. Deployment Guide (`change summary/DEPLOYMENT_CHALMERS.md`)

**Updated:**
- VM provisioning status to reflect IT confirmation
- SSL certificate command (removed `-d www.epsm.chalmers.se`)
- Nginx configuration (removed `www.epsm.chalmers.se` from `server_name`)
- SSH command examples with confirmed hostname
- Added note: "Only `epsm.chalmers.se` is configured (no www subdomain) as confirmed by Chalmers IT"
- Updated next steps checklist

## SAML Configuration

**No changes needed!** SAML URLs remain the same:
- Entity ID: `https://epsm.chalmers.se/saml/metadata/`
- ACS URL: `https://epsm.chalmers.se/saml/acs/`
- SLO URL: `https://epsm.chalmers.se/saml/sls/`

These are already correct in `production.py`.

## Nginx Configuration

When creating `nginx/nginx.conf` on the VM, use:

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name epsm.chalmers.se;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name epsm.chalmers.se;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    # ... rest of config
}
```

## SSL Certificate Command

```bash
# Only one domain needed
sudo certbot certonly --standalone -d epsm.chalmers.se

# Copy certificates
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem nginx/ssl/
```

## Testing Checklist

After deployment, verify:

- [ ] `http://epsm.chalmers.se` redirects to `https://epsm.chalmers.se`
- [ ] `https://epsm.chalmers.se` loads the application
- [ ] SAML login works with Chalmers CID
- [ ] SSL certificate is valid (Let's Encrypt)
- [ ] No CORS errors in browser console
- [ ] All API endpoints accessible

## Files Modified

1. ✅ `backend/config/settings/production.py`
2. ✅ `backend/config/settings.backup/production.py`
3. ✅ `change summary/DEPLOYMENT_CHALMERS.md`

## Files NOT Modified (No Changes Needed)

- **SAML URLs** in `production.py` already correct
- **Privacy views** (`backend/simulation/privacy_views.py`) already use `epsm.chalmers.se`
- **Docker Compose files** - use environment variables, no hardcoded domains
- **Frontend code** - uses relative URLs via API client

## Impact

**Zero negative impact!** This simplification actually:
- ✅ Reduces configuration complexity
- ✅ Simplifies SSL certificate management (one domain instead of two)
- ✅ Follows modern web standards (most sites don't use www anymore)
- ✅ Makes URLs shorter and easier to remember

## Next Steps

1. ✅ **Respond to Chalmers IT** confirming no www is fine
2. ⏳ Wait for VM provisioning and SSH credentials
3. ⏳ Deploy using updated `DEPLOYMENT_CHALMERS.md` guide
4. ⏳ Test SAML integration with Björn

## References

- **IT Ticket:** T-2510-2511
- **VM Hostname:** `epsm.ita.chalmers.se`
- **Service URL:** `https://epsm.chalmers.se`
- **Contact:** Chalmers IT Support

---

**Summary:** All configurations updated to use only `epsm.chalmers.se` without www subdomain. No functional changes to SAML or application logic required.
