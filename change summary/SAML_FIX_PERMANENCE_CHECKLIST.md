# SAML Fix Permanence Checklist

**Date:** October 10, 2025  
**Purpose:** Ensure SAML metadata fixes persist across rebuilds and deployments

---

## ✅ Files That Need to Be in Git (COMPLETED)

These files contain the SAML fixes and MUST be committed to git:

- [x] `backend/simulation/saml_metadata_view.py` - Custom metadata view
- [x] `backend/config/urls.py` - SAML URL routing
- [x] `backend/config/settings/production.py` - SAML configuration
- [x] `change summary/SAML_SSO_AUTH_FIX_OCT_2025.md` - Documentation

**Verification:**
```bash
git status
# Should show these files as committed
git log --oneline -1
# Should show: "fix: SAML SSO authentication..."
```

---

## ✅ Verify Files Are NOT in .dockerignore

Check that our Python files are NOT excluded:

```bash
cd /opt/epsm/backend
grep -E "simulation/|config/|\.py$" .dockerignore
```

**Expected:** No matches (Python files are allowed)

**Current .dockerignore exclusions:**
- `*.md` files (documentation - OK, not needed in image)
- `docs/` directory (OK, not needed in image)  
- `*.log`, `__pycache__/`, etc. (OK, temporary files)

**Our SAML files are safe:** ✅
- `simulation/saml_metadata_view.py` - NOT excluded
- `config/urls.py` - NOT excluded
- `config/settings/production.py` - NOT excluded

---

## ✅ Dockerfile.prod Copies All Files

The production Dockerfile has:
```dockerfile
# Copy project
COPY . /app/
```

This copies ALL files from the backend directory (except .dockerignore exclusions).

**Our SAML files will be copied:** ✅

---

## 🔄 Future Rebuild Process

When rebuilding the backend in the future:

### Option 1: Standard Rebuild (Recommended)
```bash
cd /opt/epsm

# Pull latest code from git
git pull origin main

# Rebuild without cache to ensure fresh build
docker-compose -f docker-compose.production.yml build --no-cache backend

# Restart the container
docker-compose -f docker-compose.production.yml up -d backend

# Wait for healthcheck
sleep 20

# Verify SAML metadata
curl -s https://epsm.chalmers.se/saml/metadata/ | grep "KeyDescriptor"
# Should show: <ns0:KeyDescriptor> (no 'use' attribute)
```

### Option 2: Quick Rebuild (Uses Cache)
```bash
cd /opt/epsm
git pull origin main
docker-compose -f docker-compose.production.yml up -d --build backend
```

**Note:** If changes don't appear, use Option 1 (--no-cache)

---

## 🧪 Verification After Rebuild

After any rebuild, verify the fix is working:

### 1. Check Files Are in Container
```bash
docker-compose -f docker-compose.production.yml exec backend ls -la /app/simulation/saml_metadata_view.py
docker-compose -f docker-compose.production.yml exec backend ls -la /app/config/urls.py
```

### 2. Check Custom Metadata View Is Called
```bash
# Access metadata endpoint
curl -s https://epsm.chalmers.se/saml/metadata/ > /dev/null

# Check logs
docker-compose -f docker-compose.production.yml logs backend --tail=50 | grep "Custom SAML metadata view called"
```

**Expected:** Should see "Custom SAML metadata view called" in logs

### 3. Verify Metadata Content
```bash
# No 'use' attribute
curl -s https://epsm.chalmers.se/saml/metadata/ | grep "use=\"signing\""
# Expected: (empty)

curl -s https://epsm.chalmers.se/saml/metadata/ | grep "use=\"encryption\""
# Expected: (empty)

# No SHA1
curl -s https://epsm.chalmers.se/saml/metadata/ | grep -i "sha1"
# Expected: (empty)

# KeyDescriptor exists without 'use'
curl -s https://epsm.chalmers.se/saml/metadata/ | grep "KeyDescriptor"
# Expected: <ns0:KeyDescriptor> (no attributes)
```

---

## 🚨 Troubleshooting

### If SAML fix doesn't work after rebuild:

1. **Check if files are committed:**
   ```bash
   git status
   git log --oneline -5 | grep "SAML"
   ```

2. **Verify Docker is using latest code:**
   ```bash
   docker-compose -f docker-compose.production.yml exec backend cat /app/config/urls.py | grep -A 10 "SAML SSO"
   ```
   Should show custom metadata view configuration

3. **Force complete rebuild:**
   ```bash
   docker-compose -f docker-compose.production.yml down backend
   docker rmi epsm-backend:latest
   docker-compose -f docker-compose.production.yml build --no-cache backend
   docker-compose -f docker-compose.production.yml up -d backend
   ```

4. **Check for import errors:**
   ```bash
   docker-compose -f docker-compose.production.yml logs backend | grep -i "error\|traceback" | tail -30
   ```

---

## 📝 Key Files Overview

### 1. `backend/simulation/saml_metadata_view.py`
**Purpose:** Custom view that removes `use` attributes and SHA1 algorithms from metadata

**Critical code:**
```python
def custom_metadata(request):
    # Generates metadata using pysaml2
    # Removes use="signing" and use="encryption"
    # Removes SHA1 algorithms
    return HttpResponse(metadata_string, content_type='application/xml')
```

### 2. `backend/config/urls.py`
**Purpose:** Routes `/saml/metadata/` to our custom view instead of default

**Critical code:**
```python
if not settings.DEBUG:
    from simulation.saml_metadata_view import custom_metadata
    from djangosaml2 import views as saml2_views
    
    saml_urlpatterns = [
        path('saml/metadata/', custom_metadata, name='saml2_metadata'),
        # ... other SAML endpoints
    ]
    urlpatterns += saml_urlpatterns
```

### 3. `backend/config/settings/production.py`
**Purpose:** SAML configuration without explicit `use` attributes

**Critical change:** Removed `key_descriptor` configuration, relies on global cert config

---

## 🎯 Success Criteria

After rebuild, all these should be TRUE:

- ✅ `custom_metadata` view is imported without errors
- ✅ `/saml/metadata/` endpoint returns XML
- ✅ KeyDescriptor has NO `use` attribute
- ✅ No SHA1 algorithms in metadata
- ✅ Custom metadata view is logged when accessed
- ✅ SAML login redirects to `/saml/acs/` without "Access Denied"

---

## 🔐 Git Commit Information

**Commit Hash:** a9e9cca  
**Commit Message:** `fix: SAML SSO authentication - connect custom metadata view and fix certificate usage`  
**Date:** Fri Oct 10 11:27:32 2025 +0200  
**Files Changed:** 4 files, 539 insertions(+), 4 deletions(-)

**To verify commit is pushed:**
```bash
git log --oneline origin/main -5
# Should include the SAML fix commit
```

---

## 📧 Contact if Issues Arise

If SAML breaks after a rebuild:

1. **Check this checklist** - Follow verification steps
2. **Review git history:** `git log --oneline --grep="SAML"`
3. **Check documentation:** `/opt/epsm/change summary/SAML_SSO_AUTH_FIX_OCT_2025.md`
4. **Contact:** Sanjay Somanath (sanjay.somanath@chalmers.se)

---

**Last Updated:** October 10, 2025  
**Status:** ✅ All files committed and verified  
**Next Action:** Push to origin/main when ready for permanent backup
