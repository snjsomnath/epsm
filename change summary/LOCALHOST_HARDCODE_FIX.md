# Localhost Hardcode Fix - Production Backend Issue

**Date:** October 12, 2025  
**Issue:** Multiple hardcoded `localhost` URLs causing simulation backend to fail in production  
**Status:** ✅ FIXED

## Problem Summary

The simulation backend was failing in production because multiple files had hardcoded `http://localhost:8000` URLs instead of using the `VITE_API_BASE_URL` environment variable. This caused:

- Simulation runs to fail (incorrect backend URL)
- Download/results links to point to localhost
- API calls to fail in production environment
- Database connections to fail (backend Python files)

## Files Fixed

### Frontend Files (5 fixes)

#### 1. `/opt/epsm/frontend/src/components/baseline/BaselinePage.tsx`
**Line 87** - Simulation run endpoint

**Before:**
```typescript
const backendUrl = 'http://localhost:8000';
```

**After:**
```typescript
const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
```

**Impact:** Critical - this was preventing simulations from running in production

---

#### 2. `/opt/epsm/frontend/src/components/baseline/ResultsTab.tsx`
**Lines 952 & 960** - Download and results links

**Before:**
```typescript
onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/download/`, '_blank')}
onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/results/`, '_blank')}
```

**After:**
```typescript
onClick={() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  window.open(`${baseUrl}/api/simulation/${result.simulationId}/download/`, '_blank');
}}
onClick={() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  window.open(`${baseUrl}/api/simulation/${result.simulationId}/results/`, '_blank');
}}
```

**Impact:** High - users couldn't download results or view HTML reports in production

---

#### 3. `/opt/epsm/frontend/src/components/simulation/archive/ResultsTab.tsx`
**Lines 228 & 236** - Same download/results link issue

**Before:**
```typescript
onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/download/`, '_blank')}
onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/results/`, '_blank')}
```

**After:**
```typescript
onClick={() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  window.open(`${baseUrl}/api/simulation/${result.simulationId}/download/`, '_blank');
}}
onClick={() => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  window.open(`${baseUrl}/api/simulation/${result.simulationId}/results/`, '_blank');
}}
```

**Impact:** High - archive results couldn't be accessed in production

---

#### 4. `/opt/epsm/frontend/src/components/home/HomePage.tsx`
**Line 192** - System resources API call

**Before:**
```typescript
const isDev = process.env.NODE_ENV === 'development';
const baseUrl = isDev ? 'http://localhost:8000' : '';
const response = await axios.get(`${baseUrl}/api/simulation/system-resources/`);
```

**After:**
```typescript
// Use VITE_API_BASE_URL environment variable
// Falls back to localhost for development
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const response = await axios.get(`${baseUrl}/api/simulation/system-resources/`);
```

**Impact:** Medium - system resources wouldn't display correctly in production

---

### Backend Files (1 fix)

#### 5. `/opt/epsm/backend/direct_materials_api.py`
**Line 15** - Database connection configuration

**Before:**
```python
MATERIALS_DB_CONFIG = {
    'host': 'localhost',
    'database': 'epsm_local', 
    'user': 'ssanjay',
    'password': '',
    'port': 5432
}
```

**After:**
```python
MATERIALS_DB_CONFIG = {
    'host': os.getenv('MATERIALS_DB_HOST', 'localhost'),
    'database': os.getenv('MATERIALS_DB_NAME', 'epsm_local'), 
    'user': os.getenv('MATERIALS_DB_USER', 'ssanjay'),
    'password': os.getenv('MATERIALS_DB_PASSWORD', ''),
    'port': int(os.getenv('MATERIALS_DB_PORT', '5432'))
}
```

**Impact:** Critical - materials database couldn't be accessed in production

---

## Environment Variables Used

### Frontend (VITE)
- `VITE_API_BASE_URL` - Base URL for backend API
  - Development: defaults to `http://localhost:8000`
  - Production: set in docker-compose (e.g., `https://epsm.ita.chalmers.se` or relative `/`)

### Backend (Django/Python)
- `MATERIALS_DB_HOST` - Materials database host (default: `localhost`)
- `MATERIALS_DB_NAME` - Materials database name (default: `epsm_local`)
- `MATERIALS_DB_USER` - Materials database user (default: `ssanjay`)
- `MATERIALS_DB_PASSWORD` - Materials database password (default: empty)
- `MATERIALS_DB_PORT` - Materials database port (default: `5432`)

## Configuration Files

The following files already properly define these environment variables:

1. **`.env.example`** - Template with all required variables
2. **`docker-compose.production.yml`** - Production configuration
3. **`.env.production.example`** - Production-specific template

## Verification Checklist

After deployment, verify:

- [ ] Simulations can be started from BaselinePage
- [ ] "View HTML Report" button opens correct URL
- [ ] "Download Results" button downloads from correct URL
- [ ] System resources display on homepage
- [ ] Materials database connection works
- [ ] All API calls use production backend URL

## Testing

### Development
All changes maintain backward compatibility:
- Development still defaults to `http://localhost:8000`
- No environment variables required for local development
- Existing `.env` files work without changes

### Production
Set in `.env.production` or docker-compose environment:
```bash
# Frontend
VITE_API_BASE_URL=https://epsm.ita.chalmers.se
# or use relative path:
VITE_API_BASE_URL=/

# Backend
MATERIALS_DB_HOST=database
MATERIALS_DB_NAME=epsm_materials
MATERIALS_DB_USER=epsm_user
MATERIALS_DB_PASSWORD=your_secure_password
MATERIALS_DB_PORT=5432
```

## Files That Were Already Correct

These files were already using environment variables properly:
- `/opt/epsm/frontend/src/lib/auth-api.ts` ✅
- `/opt/epsm/frontend/src/lib/queryBuilder.ts` ✅
- `/opt/epsm/frontend/src/lib/database-api.ts` ✅
- `/opt/epsm/frontend/src/lib/auth.ts` ✅
- `/opt/epsm/frontend/src/lib/database-browser.ts` ✅
- `/opt/epsm/backend/config/settings.py` ✅

## Deployment Steps

1. **Pull latest changes** from repository
2. **Rebuild frontend and backend** containers:
   ```bash
   docker-compose -f docker-compose.production.yml build --no-cache frontend backend
   ```
3. **Restart services**:
   ```bash
   docker-compose -f docker-compose.production.yml up -d --force-recreate frontend backend
   ```
4. **Verify environment variables** are set in `.env.production`
5. **Test simulation** end-to-end

## Additional Notes

- All changes preserve fallback to `localhost:8000` for development
- TypeScript/ESLint warnings in output are pre-existing (missing type declarations)
- Changes are non-breaking for existing development setups
- Production deployments should explicitly set `VITE_API_BASE_URL` in docker-compose

## Related Issues

- Materials database connection in production
- CORS issues with hardcoded origins
- WebSocket connections (check SimulationPage.tsx for similar patterns)

## Prevention

To prevent future hardcoding:

1. **Always use** `import.meta.env.VITE_API_BASE_URL` in frontend
2. **Always use** `os.getenv()` with sensible defaults in backend
3. **Code review** should check for literal `localhost` or `127.0.0.1`
4. **Add linting rule** to detect hardcoded URLs (future improvement)
