# SAML Metadata Endpoint Fix - October 9, 2025

## Issue
Björn from Chalmers IT reported that https://epsm.chalmers.se/saml/metadata/ was redirecting to the login page instead of serving SAML SP metadata XML.

## Root Cause
The nginx configuration was using `proxy_set_header X-Forwarded-Proto $scheme;` for SAML endpoints, which was setting the protocol to `http` instead of `https` when proxying to the backend. This caused Django's `SECURE_SSL_REDIRECT = True` setting to redirect HTTP requests to HTTPS, creating a redirect loop that nginx resolved by serving the frontend application.

## Solution
Updated nginx configuration to explicitly set `X-Forwarded-Proto: https` for SAML endpoints:

### Files Modified
1. **Production config** (`nginx/nginx.conf` - not in git): Fixed for immediate production use
2. **Development config** (`.docker/nginx/nginx.conf` - in git): Fixed and committed for future builds

### Configuration Change
```nginx
# SAML endpoints
location /saml/ {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;  # Changed from $scheme to https
}
```

## Verification
- ✅ **URL**: https://epsm.chalmers.se/saml/metadata/
- ✅ **Status**: 200 OK (was getting frontend HTML before)
- ✅ **Content-Type**: text/xml; charset=utf-8
- ✅ **Content**: Valid SAML SP metadata XML (4745 bytes)
- ✅ **Entity ID**: https://epsm.chalmers.se/saml/metadata/
- ✅ **Required endpoints**: ACS, SLS properly configured

## Next Steps
1. ✅ **Committed**: Changes pushed to main branch (commit 7151985)
2. **Share with Björn**: The metadata URL now works correctly
3. **Future builds**: Will automatically include the SAML configuration

## Metadata URL for Chalmers IT
**Working URL**: https://epsm.chalmers.se/saml/metadata/

This URL can now be shared with Björn for SAML IdP configuration.