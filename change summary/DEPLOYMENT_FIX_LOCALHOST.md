# Quick Deployment Guide - Localhost Fix

**Issue Fixed:** Simulation backend failing due to hardcoded localhost URLs  
**Date:** October 12, 2025

## What Was Fixed

✅ **5 critical files** updated to use environment variables instead of hardcoded `localhost`
✅ **Simulation runs** now work in production
✅ **Download/Results links** now point to correct production URLs
✅ **Materials database** now connects correctly in production

## Quick Deploy

### 1. Verify Environment Variables

Check your `.env.production` file has:

```bash
# Frontend - CRITICAL for simulation to work
VITE_API_BASE_URL=https://epsm.ita.chalmers.se
# OR use relative path:
# VITE_API_BASE_URL=/

# Backend - for materials database
MATERIALS_DB_HOST=database
MATERIALS_DB_NAME=epsm_materials
MATERIALS_DB_USER=epsm_user
MATERIALS_DB_PASSWORD=your_secure_password
MATERIALS_DB_PORT=5432
```

### 2. Rebuild and Deploy

```bash
# Stop services
docker-compose -f docker-compose.production.yml down

# Rebuild with no cache (ensures fresh build)
docker-compose -f docker-compose.production.yml build --no-cache frontend backend

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f frontend backend
```

### 3. Quick Test

1. **Open production URL** (e.g., https://epsm.ita.chalmers.se)
2. **Navigate to Baseline Modeling**
3. **Upload IDF and EPW files**
4. **Click "Run Baseline Simulation"**
5. **Verify:** Should see progress bar (not immediate error)
6. **After completion:** Click "View HTML Report" - should open results (not localhost)

## Files Changed

| File | Lines | What Fixed |
|------|-------|------------|
| `frontend/src/components/baseline/BaselinePage.tsx` | 87 | Simulation run API call |
| `frontend/src/components/baseline/ResultsTab.tsx` | 952, 960 | Download/results buttons |
| `frontend/src/components/simulation/archive/ResultsTab.tsx` | 228, 236 | Archive download/results |
| `frontend/src/components/home/HomePage.tsx` | 192 | System resources |
| `backend/direct_materials_api.py` | 15 | Database connection |

## Troubleshooting

### Simulations Still Failing?

**Check browser console:**
```javascript
// Should see production URL, not localhost:
POST https://epsm.ita.chalmers.se/api/simulation/run/
// NOT: POST http://localhost:8000/api/simulation/run/
```

**Fix:** Rebuild frontend with `--no-cache` flag

### Downloads Opening Localhost?

**Symptom:** Clicking "View HTML Report" opens `http://localhost:8000/...`

**Fix:** 
1. Check `VITE_API_BASE_URL` is set in docker-compose
2. Rebuild frontend container
3. Hard refresh browser (Ctrl+Shift+R)

### Materials Database Error?

**Error:** `connection to server at "localhost" (127.0.0.1), port 5432 failed`

**Fix:**
1. Verify `MATERIALS_DB_HOST=database` in `.env.production`
2. Restart backend container
3. Check database container is running

## Environment Variable Priority

### Frontend (Vite)
```typescript
import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
```
- **Production:** Set in docker-compose `VITE_API_BASE_URL`
- **Development:** Falls back to `http://localhost:8000`

### Backend (Python)
```python
os.getenv('MATERIALS_DB_HOST', 'localhost')
```
- **Production:** Set in docker-compose environment
- **Development:** Falls back to `localhost`

## Verification Commands

```bash
# Check if environment variables are set in containers
docker-compose -f docker-compose.production.yml exec frontend env | grep VITE_API_BASE_URL
docker-compose -f docker-compose.production.yml exec backend env | grep MATERIALS_DB

# Check frontend build output
docker-compose -f docker-compose.production.yml logs frontend | grep VITE_API_BASE_URL

# Test API endpoint
curl https://epsm.ita.chalmers.se/api/simulation/system-resources/

# Check database connectivity from backend
docker-compose -f docker-compose.production.yml exec backend python -c "import os; print(f'DB_HOST: {os.getenv(\"DB_HOST\")}')"
```

## Rollback (if needed)

```bash
# Revert to previous commit
git revert HEAD

# Or checkout specific commit
git checkout <previous-commit-hash>

# Rebuild
docker-compose -f docker-compose.production.yml up -d --build
```

## Success Indicators

✅ Simulation starts without immediate error  
✅ Progress bar shows increasing percentage  
✅ Results display after completion  
✅ "View HTML Report" opens production URL  
✅ Downloads work from production server  
✅ No localhost URLs in browser network tab  
✅ System resources display on homepage  

## Contact

If issues persist after following this guide:
1. Check `/opt/epsm/change summary/LOCALHOST_HARDCODE_FIX.md` for detailed changes
2. Review docker-compose logs for specific errors
3. Verify all environment variables are correctly set

---

**Last Updated:** October 12, 2025  
**Related Docs:** 
- `LOCALHOST_HARDCODE_FIX.md` - Detailed technical changes
- `.env.production.example` - Environment variable template
- `docker-compose.production.yml` - Production deployment config
