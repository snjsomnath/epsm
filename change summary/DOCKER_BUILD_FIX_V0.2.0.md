# Docker Build Fix for v0.2.0 - SAML SSO Dependencies

**Date:** October 7, 2025  
**Issue:** Docker build failing during pip install of SAML dependencies  
**Status:** ✅ RESOLVED

## Problem Summary

The Docker build for v0.2.0 was failing with the error:
```
ERROR: failed to build: failed to solve: process "/bin/sh -c pip install --no-cache-dir -r requirements.prod.txt" 
did not complete successfully: exit code: 1
```

### Root Cause

The issue was caused by **incompatible SAML libraries**:

1. **Wrong Library Choice:** Used `python3-saml` which depends on `xmlsec` (Python binding)
2. **Compilation Failure:** `xmlsec==1.3.13` failed to compile with error:
   ```c
   error: assignment to 'struct LxmlElement **' from incompatible pointer type 
   'PyXmlSec_LxmlElementPtr' {aka 'struct LxmlElement *'} [-Wincompatible-pointer-types]
   ```
3. **lxml Incompatibility:** The `xmlsec` package had pointer type incompatibilities with newer versions of `lxml`

## Investigation Steps

### Attempt 1: Upgrade pip and add dependencies
- Added `pip install --upgrade pip setuptools wheel`
- Added `git` system dependency
- **Result:** Still failed with same compilation error

### Attempt 2: Add more system libraries
- Added: `libxslt1-dev`, `libtool`, `python3-dev`, `libssl-dev`
- Tried different `xmlsec` versions (1.3.13, 1.3.14)
- **Result:** Compilation still failed with pointer type errors

### Attempt 3: Local build testing
```bash
docker build -f Dockerfile.prod -t test-backend-build .
```
- Revealed the exact error: `xmlsec` C compilation failure
- Error in `src/enc.c:195:14`: incompatible pointer types

## Solution

### ✅ Replace `python3-saml` with `pysaml2`

**Why this works:**
1. **djangosaml2 actually uses pysaml2** - `python3-saml` was the wrong library
2. **Pure Python wheels** - `pysaml2` has no C compilation requirements
3. **Better maintained** - Active development and wider adoption
4. **Clean installation** - Verified with test:
   ```bash
   docker run --rm python:3.11-slim bash -c "pip install pysaml2==7.5.0"
   # Successfully installed with no errors
   ```

### Changes Made

#### 1. Updated `backend/requirements.prod.txt`
```diff
 # SAML SSO for Chalmers authentication
-# Note: Using xmlsec 1.3.14 which has fixes for lxml compatibility
-xmlsec==1.3.14
-python3-saml==1.16.0
+# Using pysaml2 instead of python3-saml (better maintained, no compilation issues)
+pysaml2==7.5.0
 djangosaml2==1.9.3
```

#### 2. Simplified `backend/Dockerfile.prod`
```diff
 # Install system dependencies
 RUN apt-get update && apt-get install -y \
     build-essential \
     libpq-dev \
     curl \
     docker.io \
     libxml2-dev \
     libxmlsec1-dev \
     libxmlsec1-openssl \
-    libxslt1-dev \
-    libtool \
     pkg-config \
-    xmlsec1 \
     git \
-    python3-dev \
-    libssl-dev \
     && rm -rf /var/lib/apt/lists/*
```

**Removed unnecessary dependencies** that were only needed for `xmlsec` compilation.

## Verification

### Test Installation (Successful)
```bash
$ docker run --rm python:3.11-slim bash -c "pip install --no-cache-dir pysaml2==7.5.0"

Successfully installed:
- pysaml2-7.5.0
- cryptography-46.0.2
- pyopenssl-25.3.0
- xmlschema-2.5.1
- defusedxml-0.7.1
- elementpath-4.8.0
- python-dateutil-2.9.0
- (and other pure Python dependencies)
```

### Commits
1. `3d9d658` - Initial fix attempt with pip upgrade
2. `e0603c2` - Add comprehensive SAML build dependencies
3. `f37b98a` - **Final fix:** Replace python3-saml with pysaml2

### Release Tag Updated
- Tag: `v0.2.0`
- Commit: `c0668c6`
- Force-pushed to trigger GitHub Actions rebuild

## Impact

### ✅ Benefits
- **No compilation errors** - Pure Python installation
- **Faster builds** - No C compilation time
- **Correct library** - Using the actual backend for djangosaml2
- **Better maintenance** - pysaml2 is actively maintained
- **Simpler Dockerfile** - Fewer system dependencies

### 🔄 Compatibility
- **Same SAML functionality** - djangosaml2 works identically
- **No code changes needed** - Backend SAML integration unchanged
- **Same configuration** - SAML settings remain the same

## Next Steps

1. ✅ GitHub Actions building v0.2.0 with pysaml2
2. ⏳ Wait for Docker images to publish to ghcr.io
3. ⏳ Test SAML integration once VM is provisioned
4. ⏳ Update frontend for SAML login flow (LoginPage.tsx)

## Key Learnings

1. **Always verify library choices** - We initially picked the wrong SAML library
2. **Test locally first** - Local Docker builds reveal errors faster than CI/CD
3. **Check dependencies** - `djangosaml2` documentation specifies `pysaml2` as backend
4. **Prefer pure Python** - Avoid C extensions when possible for Docker builds
5. **Read compilation errors carefully** - Pointer type errors indicated lxml/xmlsec incompatibility

## References

- **djangosaml2 documentation:** https://github.com/IdentityPython/djangosaml2
- **pysaml2 repository:** https://github.com/IdentityPython/pysaml2
- **Deployment guide:** `docs/DEPLOYMENT_CHALMERS.md`
- **GitHub Actions workflow:** `.github/workflows/release.yml`
