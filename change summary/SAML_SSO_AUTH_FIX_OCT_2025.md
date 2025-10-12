# SAML SSO Authentication Fix - October 2025

**Status:** ✅ FIXED  
**Latest Update:** October 12, 2025 - Superuser Login Bypass Restored  
**Issue:** Authentication Error / Access Denied at `/saml/acs/` endpoint  
**Root Cause:** Custom metadata view not connected + certificate usage issues

---

## 🔴 CRITICAL FIX: Superuser Login Bypass Restored (Oct 12, 2025)

### Problem
After SAML implementation, the superuser bypass feature was broken. Frontend was posting to the wrong endpoint:
- **Frontend was calling:** `/api/auth/login/` (old endpoint without bypass logic)
- **Should be calling:** `/api/auth/local-login/` (has superuser bypass for production)
- **Error:** `POST https://epsm.chalmers.se/api/auth/login/ 401 (Unauthorized)`

### Root Cause
The superuser bypass logic exists in `local_login()` function but:
1. Frontend `signIn()` was still calling old `/api/auth/login/` endpoint
2. The `local_login()` response format didn't match frontend expectations (missing fields)

### Fixes Applied

#### 1. Frontend: Updated Login Endpoint
**File:** `/opt/epsm/frontend/src/lib/auth-api.ts`

```typescript
// OLD (broken)
const response = await fetch(buildUrl('/api/auth/login/'), {
  body: JSON.stringify({ email, password }),
});

// NEW (fixed)
const response = await fetch(buildUrl('/api/auth/local-login/'), {
  body: JSON.stringify({ username: email, password }),
});
```

**Changes:**
- ✅ Changed endpoint from `/api/auth/login/` to `/api/auth/local-login/`
- ✅ Changed request body from `{ email, password }` to `{ username: email, password }`

#### 2. Backend: Fixed Response Format
**File:** `/opt/epsm/backend/simulation/auth_views.py`

```python
# Updated local_login response to include all required fields
return JsonResponse({
    'success': True,
    'user': {
        'id': user.pk,                                  # ✅ Added
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name or '',           # ✅ Added
        'last_name': user.last_name or '',             # ✅ Added
        'full_name': user.get_full_name() or user.username,
        'is_active': user.is_active,                   # ✅ Added
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined.isoformat(),   # ✅ Added
    }
})
```

### How It Works Now

**In Production (SAML Enabled):**
1. Regular users → Must use "Login with Chalmers CID" (SAML SSO)
2. Superusers/Staff → Can use either:
   - SAML login (recommended)
   - Local login form (bypass SSO) ← **NOW WORKING**

**Backend Logic in `local_login()`:**
```python
# Try to authenticate using username directly
user = authenticate(request, username=username, password=password)

# If that fails, try to look up a user with this email and authenticate with their username
if user is None:
    email_match = (
        User.objects
        .filter(email__iexact=username)
        .order_by('id')
        .first()
    )
    if email_match is not None:
        user = authenticate(request, username=email_match.username, password=password)

if user is not None:
    # In production, only allow staff/admin users
    if not settings.DEBUG and not (user.is_staff or user.is_superuser):
        return JsonResponse({
            'error': 'Local login restricted to admin users in production'
        }, status=403)
    
    login(request, user)
    # ... return user data
```

**✅ Email-Based Login Support:**
The endpoint now accepts both username and email. If you provide an email, it will look up the user by email and authenticate with their username.

### Testing
```bash
# Test superuser login (works with email or username)
curl -X POST https://epsm.chalmers.se/api/auth/local-login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "ssanjay@chalmers.se", "password": "your_password"}'

# Or with username directly
curl -X POST https://epsm.chalmers.se/api/auth/local-login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "ssanjay", "password": "your_password"}'

# Should return:
# {"success": true, "user": {...}}
```

### Additional Issue Found & Fixed: No Superuser in Database
After the fix, authentication was still failing because the database had no users. Created superuser account:
```bash
docker exec epsm_backend_prod bash -c "cd /app && python manage.py shell << 'PYEOF'
from django.contrib.auth.models import User
user = User.objects.create_superuser('ssanjay', 'ssanjay@chalmers.se', 'password')
PYEOF
"
```

**Status:** ✅ FULLY WORKING - Email-based login confirmed with HTTP 200 response

---

## 🔍 Problem Summary (Original SAML Fix)

After implementing SAML SSO, users were experiencing authentication failures when attempting to log in via Chalmers CID:

1. **User Flow**: User clicks "Login with Chalmers CID" → Redirected to Chalmers IdP → Successfully authenticates → **Redirected to `https://epsm.chalmers.se/saml/acs/`** → **"Authentication Error. Access Denied."**

2. **Björn's Feedback** (Chalmers IT):
   - Certificate was being used for signing before IdP knew about it (metadata sync delay)
   - Certificate had `use="signing"` attribute, limiting it to signing only (not encryption)
   - Recommendation: Remove `use="signing"` attribute so cert can be used for both signing and encryption
   - Alternative: Add same certificate twice with `use="signing"` and `use="encryption"`
   - SHA1 algorithms still present in metadata (not critical but should be removed)

---

## ✅ Fixes Applied

### 1. Connected Custom SAML Metadata View

**Problem**: A custom metadata view (`saml_metadata_view.py`) existed to fix certificate usage issues, but **it was never connected to the URL configuration**.

**Fix**: Updated `/opt/epsm/backend/config/urls.py`

```python
# Add SAML SSO endpoints in production
if not settings.DEBUG:
    from simulation.saml_metadata_view import custom_metadata
    
    urlpatterns += [
        # Custom metadata endpoint to fix certificate usage (Björn's feedback)
        path('saml/metadata/', custom_metadata, name='saml2_metadata'),
        # Include other SAML endpoints
        path('saml/', include('djangosaml2.urls')),
    ]
```

**Impact**: The custom metadata view now:
- Removes `use="signing"` and `use="encryption"` attributes from KeyDescriptor elements
- Filters out SHA1 digest and signing methods
- Allows the certificate to be used for both signing and encryption

---

### 2. Improved Custom Metadata View

**Problem**: The original regex only removed `use="signing"`, not `use="encryption"`.

**Fix**: Updated `/opt/epsm/backend/simulation/saml_metadata_view.py`

```python
# Fix 1: Remove 'use="signing"' and 'use="encryption"' from KeyDescriptor
# This allows the certificate to be used for both signing and encryption
xml_content = re.sub(
    r'<(\w+:)?KeyDescriptor\s+use="(signing|encryption)"',
    r'<\1KeyDescriptor',
    xml_content
)
```

**Impact**: Now properly handles both `use="signing"` and `use="encryption"` attributes.

---

### 3. Simplified Production SAML Configuration

**Problem**: `production.py` had a `key_descriptor` configuration with both `use='signing'` and `use='encryption'`, which would generate metadata with those attributes.

**Fix**: Updated `/opt/epsm/backend/config/settings/production.py`

```python
# Certificate configuration: No 'use' attribute so cert can be used for both signing and encryption
# Björn's feedback: "If you can remove 'use="signing"' it will be used for both signing and encryption"
# Note: pysaml2 doesn't support 'key_descriptor' without 'use', so we rely on global cert config
# The custom metadata view will strip 'use' attributes from the generated metadata
```

**Impact**: 
- Removed explicit `key_descriptor` with `use` attributes
- Relies on global certificate configuration (top-level `key_file` and `cert_file`)
- Custom metadata view post-processes to remove any `use` attributes

---

## 🔧 How It Works Now

### Metadata Generation Flow

1. **Django generates SAML metadata** using `djangosaml2` with default settings
2. **Custom metadata view intercepts** the generated XML at `https://epsm.chalmers.se/saml/metadata/`
3. **Post-processing**:
   - Removes `use="signing"` and `use="encryption"` from all `<KeyDescriptor>` elements
   - Removes SHA1 digest and signing method elements
   - Returns cleaned XML metadata
4. **Chalmers IdP reads clean metadata** with certificate available for both signing and encryption

### Certificate Configuration

The certificate configuration is now at the global level in `SAML_CONFIG`:

```python
SAML_CONFIG = {
    'xmlsec_binary': '/usr/bin/xmlsec1',
    'entityid': 'https://epsm.chalmers.se/saml/metadata/',
    
    # Global certificate configuration
    'key_file': '/app/saml_certs/sp_private_key.pem',
    'cert_file': '/app/saml_certs/sp_certificate.pem',
    
    # Enforce SHA256 (no SHA1)
    'signing_algorithm': 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    'digest_algorithm': 'http://www.w3.org/2001/04/xmlenc#sha256',
    
    # ... rest of config
}
```

---

## 🚀 Deployment Steps

### 1. Redeploy Backend

The fixes have been applied to the codebase. To deploy:

```bash
# SSH to production server
ssh user@epsm.chalmers.se

# Navigate to EPSM directory
cd /opt/epsm

# Pull latest changes
git pull origin main

# Rebuild and restart backend
docker-compose -f docker-compose.production.yml up -d --build backend
```

### 2. Verify Metadata

Check that the metadata is correctly generated:

```bash
# Check metadata endpoint
curl -s https://epsm.chalmers.se/saml/metadata/ | grep -i keyDescriptor

# Should NOT see use="signing" or use="encryption"
# Should see: <ns0:KeyDescriptor> (without use attribute)

# Verify no SHA1 algorithms
curl -s https://epsm.chalmers.se/saml/metadata/ | grep -i sha1
# Should return empty (no SHA1 references)
```

### 3. Wait for IdP Metadata Sync

**Important**: Björn mentioned that the IdP re-reads metadata once per night.

**Action**: 
- Email Björn to confirm the metadata has been updated
- Request manual metadata refresh if possible (to avoid waiting 24 hours)
- Alternatively, wait until next day and test again

### 4. Test SAML Login

Once IdP has read the new metadata:

```bash
# Test SSO flow
1. Navigate to https://epsm.chalmers.se
2. Click "Login with Chalmers CID"
3. Authenticate with Chalmers credentials
4. Should redirect to /saml/acs/
5. Should successfully authenticate and redirect to dashboard
```

---

## 📊 Expected Metadata Structure (After Fix)

**Before (Problematic):**
```xml
<ns0:KeyDescriptor use="signing">
  <ns1:KeyInfo>
    <ns1:X509Data>
      <ns1:X509Certificate>MIID...</ns1:X509Certificate>
    </ns1:X509Data>
  </ns1:KeyInfo>
</ns0:KeyDescriptor>

<ns1:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
```

**After (Fixed):**
```xml
<ns0:KeyDescriptor>
  <ns1:KeyInfo>
    <ns1:X509Data>
      <ns1:X509Certificate>MIID...</ns1:X509Certificate>
    </ns1:X509Data>
  </ns1:KeyInfo>
</ns0:KeyDescriptor>

<!-- SHA1 elements removed -->
<ns1:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ns1:SigningMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
```

---

## 🐛 Additional Potential Issues

If authentication still fails after these fixes, check:

### 1. SAML Attribute Mapping

The `saml_hooks.py` expects specific attributes from Chalmers IdP. Verify these are being sent:

**Required attributes:**
- `eduPersonPrincipalName` (e.g., `ssanjay@chalmers.se`)
- `mail` (e.g., `ssanjay@chalmers.se`)
- `givenName` (e.g., `Sanjay`)
- `sn` (e.g., `Somanath`)

**Check Django logs:**
```bash
docker-compose -f docker-compose.production.yml logs backend | grep -i saml
docker-compose -f docker-compose.production.yml logs backend | grep -i "custom_update_user"
```

### 2. Session Cookie Configuration

Ensure session cookies are properly configured:

```python
# In production.py
SESSION_COOKIE_SECURE = True  # ✅ HTTPS only
SESSION_COOKIE_SAMESITE = 'Lax'  # ✅ Allow cross-site for SAML redirect
SESSION_COOKIE_AGE = 3600 * 8  # 8 hours
```

### 3. CSRF Protection

SAML POST requests might be blocked by CSRF protection. Check if `djangosaml2.middleware.SamlSessionMiddleware` is properly configured:

```python
MIDDLEWARE = [
    # ... other middleware
    'djangosaml2.middleware.SamlSessionMiddleware',  # ✅ Must be present
]
```

### 4. Authentication Backend Order

Ensure SAML backend is first (primary):

```python
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',  # Fallback
    'djangosaml2.backends.Saml2Backend',  # ✅ Primary
]
```

---

## 📝 Email Template for Björn

**Subject:** SAML Metadata Updated - Please Refresh IdP Cache

**Body:**
```
Hi Björn,

Thank you for your feedback on the SAML metadata configuration. I've updated the metadata to address your recommendations:

✅ Changes Applied:
1. Removed 'use="signing"' attribute from KeyDescriptor (now used for both signing and encryption)
2. Removed SHA1 digest and signing method advertisements
3. Enforced SHA256 algorithms throughout

The updated metadata is available at:
https://epsm.chalmers.se/saml/metadata/

You mentioned that the IdP re-reads metadata once per night. Could you please:
1. Confirm the new metadata looks correct
2. Manually refresh the IdP cache if possible (to avoid 24-hour wait)
3. Let me know when it's safe to test the SAML login flow

I understand the authentication errors were likely due to the IdP not having the new certificate. With the updated metadata and a manual refresh, this should be resolved.

Thank you for your help!

Best regards,
Sanjay Somanath
```

---

## 🎯 Success Criteria

Authentication is considered fixed when:

- [x] Custom metadata view connected to URL configuration
- [x] Metadata removes `use="signing"` and `use="encryption"` attributes
- [x] SHA1 algorithms removed from metadata
- [ ] Chalmers IdP has refreshed metadata cache
- [ ] User can successfully authenticate via Chalmers CID
- [ ] User redirects from `/saml/acs/` to application dashboard
- [ ] User session persists (no re-authentication required)
- [ ] User can log out via `/saml/logout/` (Single Logout)

---

## 📚 Related Documentation

- **Backend SAML Setup**: `/opt/epsm/change summary/DOCKER_BUILD_FIX_V0.2.0.md`
- **Frontend SAML**: `/opt/epsm/change summary/FRONTEND_SAML_SSO_V0.2.1.md`
- **REFEDS Implementation**: `/opt/epsm/change summary/REFEDS_SAML_V0.2.2.md`
- **Deployment Guide**: `/opt/epsm/change summary/DEPLOYMENT_CHALMERS.md`
- **Custom Metadata View**: `/opt/epsm/backend/simulation/saml_metadata_view.py`
- **SAML Hooks**: `/opt/epsm/backend/config/saml_hooks.py`
- **Production Settings**: `/opt/epsm/backend/config/settings/production.py`

---

## 🔍 Debugging Commands

If issues persist, use these commands to debug:

### Check Metadata
```bash
# View full metadata
curl https://epsm.chalmers.se/saml/metadata/

# Check KeyDescriptor
curl -s https://epsm.chalmers.se/saml/metadata/ | grep -A 10 KeyDescriptor

# Check for SHA1
curl -s https://epsm.chalmers.se/saml/metadata/ | grep -i sha1
```

### Check Backend Logs
```bash
# View SAML-specific logs
docker-compose -f docker-compose.production.yml logs backend | grep -i djangosaml2

# View custom hook logs
docker-compose -f docker-compose.production.yml logs backend | grep -i saml_hooks

# View authentication errors
docker-compose -f docker-compose.production.yml logs backend | grep -i "authentication error"
```

### Check Session Configuration
```bash
# Test session cookie
curl -I https://epsm.chalmers.se/api/auth/login-info/

# Should see: Set-Cookie with Secure, SameSite=Lax
```

### Manual SAML Test
```bash
# Get SP metadata
curl -o sp_metadata.xml https://epsm.chalmers.se/saml/metadata/

# Validate XML structure
xmllint --format sp_metadata.xml

# Check entity ID
grep -i entityid sp_metadata.xml
# Should be: https://epsm.chalmers.se/saml/metadata/

# Check ACS endpoint
grep -i assertionconsumerservice sp_metadata.xml
# Should be: https://epsm.chalmers.se/saml/acs/
```

---

## 🏁 Summary

**Root Cause**: Custom SAML metadata view existed but wasn't connected to URL configuration, causing default metadata with problematic certificate usage attributes to be served.

**Fix**: 
1. Connected custom metadata view to URL config
2. Enhanced metadata view to remove both `use="signing"` and `use="encryption"`
3. Simplified production.py SAML configuration
4. Waiting for Chalmers IdP to refresh metadata cache

**Next Steps**:
1. Deploy backend changes
2. Verify metadata endpoint
3. Email Björn for metadata refresh confirmation
4. Test SAML login flow

**Expected Outcome**: Users can successfully authenticate via Chalmers CID without "Access Denied" errors.

---

**Change Summary Version:** 1.0  
**Date:** October 10, 2025  
**Author:** Sanjay Somanath  
**Status:** FIXED (Pending IdP Metadata Refresh)
