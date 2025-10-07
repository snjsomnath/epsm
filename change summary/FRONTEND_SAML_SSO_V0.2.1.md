# Frontend SAML SSO Support - v0.2.1

**Date:** October 7, 2025  
**Release:** v0.2.1  
**Status:** ✅ COMPLETED

## Overview

This release adds complete frontend support for SAML Single Sign-On (SSO) authentication with Chalmers University's Identity Provider. It complements the backend SAML implementation from v0.2.0 with a fully functional user interface.

## Features Implemented

### 1. SAML API Integration (`auth-api.ts`)

#### New API Endpoints

**`getLoginInfo()`**
- Detects authentication method (SAML vs local)
- Returns configuration:
  ```typescript
  {
    method: 'local' | 'saml',
    saml_login_url?: string,
    saml_enabled: boolean,
    environment: 'development' | 'production'
  }
  ```
- Backend endpoint: `/api/auth/login-info/`

**`getCurrentUser()`**
- Fetches authenticated user from backend session
- Syncs SAML-authenticated users with frontend
- Returns user object or null if not authenticated
- Backend endpoint: `/api/auth/current-user/`

**`redirectToSAMLLogin(returnUrl?)`**
- Redirects to SAML login flow
- Optional return URL after authentication
- Redirects to: `/saml/login/?next={returnUrl}`

### 2. Enhanced AuthContext (`AuthContext.tsx`)

#### New State
- `loginInfo: LoginInfo | null` - Tracks authentication configuration
- Loads on component mount

#### New Methods

**`signInWithSAML()`**
- Initiates SAML authentication flow
- Redirects to `/saml/login/`
- No form submission required

**`refreshAuth()`**
- Checks for existing SAML session on page load
- Calls `getCurrentUser()` API
- Creates session if user is authenticated
- Syncs backend session with frontend state

#### Enhanced Session Handling
- Detects SAML sessions on page load
- Creates frontend session from backend authentication
- Stores session in localStorage
- Auto-refresh on mount

### 3. Updated Login Page (`LoginPage.tsx`)

#### Conditional UI Rendering

**Production Mode (SAML Enabled)**
```
┌─────────────────────────────┐
│  Email/Password Form        │
└─────────────────────────────┘
          OR
┌─────────────────────────────┐
│ Login with Chalmers CID     │  ← Prominent SAML button
└─────────────────────────────┘
```

**Development Mode (Local Auth)**
```
┌─────────────────────────────┐
│  Email/Password Form        │
└─────────────────────────────┘
          OR
┌─────────────────────────────┐
│ Demo Login (demo@chalmers)  │  ← Development only
└─────────────────────────────┘
```

#### Visual Design
- **SAML Button**: Chalmers green (`#00d0be`) with white text
- **Demo Button**: Outlined style, only visible in development
- **Conditional Dividers**: Show/hide based on authentication method

### 4. Type Definitions

Added `LoginInfo` interface:
```typescript
export interface LoginInfo {
  method: 'local' | 'saml';
  saml_login_url?: string;
  saml_enabled: boolean;
  environment: 'development' | 'production';
}
```

## User Flows

### Development Environment (Local Auth)
1. User visits login page
2. `getLoginInfo()` returns `{ saml_enabled: false, environment: 'development' }`
3. Shows email/password form + demo login button
4. User can sign in with local credentials or demo account

### Production Environment (SAML SSO)
1. User visits login page
2. `getLoginInfo()` returns `{ saml_enabled: true, environment: 'production' }`
3. Shows email/password form + "Login with Chalmers CID" button
4. User clicks SAML button
5. Redirects to `/saml/login/`
6. Chalmers IdP handles authentication
7. User redirected back with SAML session
8. `refreshAuth()` creates frontend session from backend

### Session Restoration
1. User has existing SAML session (cookie-based)
2. Frontend checks localStorage for session
3. If no local session, calls `getCurrentUser()`
4. If backend returns user, creates frontend session
5. User is automatically logged in

## Files Changed

### Frontend
1. **`frontend/src/lib/auth-api.ts`** (+108 lines)
   - Added `LoginInfo` interface
   - Added `getLoginInfo()` function
   - Added `getCurrentUser()` function
   - Added `redirectToSAMLLogin()` function

2. **`frontend/src/context/AuthContext.tsx`** (+45 lines)
   - Added `loginInfo` state
   - Added `signInWithSAML()` method
   - Added `refreshAuth()` method
   - Enhanced session initialization

3. **`frontend/src/components/auth/LoginPage.tsx`** (+47 lines)
   - Conditional SAML button rendering
   - Environment-aware demo login
   - Enhanced UI with dividers

### Version Files
4. **`VERSION`** - Updated to `0.2.1`
5. **`frontend/package.json`** - Updated to `0.2.1`
6. **`CHANGELOG.md`** - Added v0.2.1 entry

## Testing Checklist

### Development Environment
- [x] Email/password login works
- [x] Demo login button visible
- [x] SAML button hidden
- [x] Session persistence works

### Production Environment (Post-VM Setup)
- [ ] SAML button visible
- [ ] Demo button hidden
- [ ] SAML redirect to Chalmers IdP
- [ ] Successful authentication creates session
- [ ] Session persists across page reloads
- [ ] Logout redirects to SAML logout

## Integration with Backend

### Backend Endpoints Required (from v0.2.0)
✅ `/api/auth/login-info/` - Returns authentication configuration  
✅ `/api/auth/current-user/` - Returns authenticated user  
✅ `/saml/login/` - SAML login redirect  
✅ `/saml/logout/` - SAML logout with Single Logout  
✅ `/api/auth/logout/` - Backend logout handler

### Backend Configuration
- `DJANGO_SETTINGS_MODULE=config.settings.production` enables SAML
- `SAML_IDP_METADATA_URL` must be configured
- djangosaml2 and pysaml2 installed

## Environment Variables

No new frontend environment variables required. Backend configuration determines authentication method.

## Benefits

### 1. **Seamless Environment Switching**
- No code changes needed between dev and production
- Authentication method auto-detected
- UI adapts automatically

### 2. **Improved Security**
- SAML SSO in production (enterprise-grade)
- Local auth in development (convenience)
- No credentials stored in frontend

### 3. **Better UX**
- Single button click for SAML login
- Automatic session restoration
- Clean, intuitive interface

### 4. **Production Ready**
- Chalmers branding (green button)
- Professional authentication flow
- Session persistence

## Next Steps (When VM Ready)

1. **Deploy to Chalmers VM**
   - Follow `docs/DEPLOYMENT_CHALMERS.md`
   - Configure SAML with Björn (Chalmers IT)

2. **Test SAML Flow**
   - Verify Chalmers CID login
   - Check user attribute mapping
   - Test session persistence

3. **Production Validation**
   - Confirm SAML button appears
   - Verify demo button hidden
   - Test logout with Single Logout

## Compatibility

- **Backend:** Requires v0.2.0 or higher (SAML support)
- **Browser:** All modern browsers (Chrome, Firefox, Safari, Edge)
- **Node:** 18+ (for development)
- **React:** 18.2.0

## Deployment

### Docker Images (GitHub Actions)
- **Frontend:** `ghcr.io/snjsomnath/epsm-frontend:0.2.1`
- **Backend:** `ghcr.io/snjsomnath/epsm-backend:0.2.0` (no changes)

### Production Deployment
```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Restart services
docker-compose -f docker-compose.production.yml up -d

# Verify SAML configuration
curl https://epsm.chalmers.se/api/auth/login-info/
```

## Known Limitations

1. **SAML Testing**: Requires Chalmers IdP configuration (pending VM setup)
2. **Session Duration**: Uses backend session timeout (default: 2 weeks)
3. **Single Logout**: Depends on Chalmers IdP SLO support

## Documentation

- **Deployment Guide:** `docs/DEPLOYMENT_CHALMERS.md`
- **Backend SAML:** `change summary/DOCKER_BUILD_FIX_V0.2.0.md`
- **Architecture:** `docs/ARCHITECTURE.md`

## Commits

```
64338a4 feat: add frontend SAML SSO support for v0.2.1
89f66ee docs: add Docker build fix documentation for v0.2.0
f37b98a fix: replace python3-saml with pysaml2 for SAML SSO
```

## Release Tag

- **Tag:** v0.2.1
- **Commit:** 64338a4
- **Release Date:** October 7, 2025
- **GitHub Release:** https://github.com/snjsomnath/epsm/releases/tag/v0.2.1

## Summary

v0.2.1 completes the SAML SSO implementation by adding full frontend support. Users in production can now seamlessly log in using their Chalmers CID credentials with a single button click. The UI intelligently adapts between development (local auth) and production (SAML) environments without code changes.

**Ready for Chalmers deployment once VM is provisioned!** 🎉
