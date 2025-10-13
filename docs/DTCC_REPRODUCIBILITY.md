# DTCC Installation - Quick Reference

## ✅ Is it Reproducible?

**YES!** All installation steps are now automated in the Dockerfiles.

## What Was Changed

### 1. Dockerfile.dev
Added GDAL system dependencies:
```dockerfile
gdal-bin
libgdal-dev  
git
```

### 2. Dockerfile.prod
Added the same GDAL dependencies to production Dockerfile.

### 3. requirements.txt
Changed from:
```
dtcc  # ❌ Broken on PyPI
```

To:
```
git+https://github.com/dtcc-platform/dtcc.git  # ✅ Works
```

## How It Works

When you run `docker-compose up --build`:

1. **Dockerfile installs GDAL** (system-level)
   ```dockerfile
   RUN apt-get install -y gdal-bin libgdal-dev git
   ```

2. **pip installs dtcc from GitHub** (automatically)
   ```dockerfile
   RUN pip install -r requirements.txt
   ```
   
   This runs:
   ```bash
   pip install git+https://github.com/dtcc-platform/dtcc.git
   ```

3. **dtcc installation automatically:**
   - Clones dtcc repo
   - Clones dtcc-core repo
   - Builds both packages
   - Installs all dependencies

## No Manual Steps Required!

❌ **Before:** Manual apt-get, manual pip install, manual restart
✅ **Now:** Just `docker-compose up --build`

## Testing Reproducibility

To verify everything works from scratch:

```bash
# Clean slate
docker-compose down -v
docker system prune -a  # Optional: clean all images

# Rebuild and start
docker-compose up --build

# Wait for startup, then test
curl http://localhost:8000/api/geojson/health/
```

Expected:
```json
{
  "status": "healthy",
  "dtcc_available": true,
  "ladybug_tools_available": true
}
```

## CI/CD Pipelines

Your GitHub Actions or deployment pipelines will work automatically:

```yaml
# In your .github/workflows/deploy.yml
- name: Build Docker images
  run: docker-compose build
  
# That's it! GDAL and dtcc install automatically
```

## New Team Members

When someone new clones the repo:

```bash
git clone https://github.com/snjsomnath/epsm.git
cd epsm
docker-compose up --build
```

**Everything works!** No manual installation steps.

## Production Deployment

Same process:

```bash
docker-compose -f docker-compose.production.yml up --build
```

GDAL and dtcc install automatically from Dockerfile.prod.

## What If Build Fails?

If the build fails with GDAL errors:

1. **Check internet connection** - needs to download packages
2. **Check Docker resources** - GDAL requires ~1GB download
3. **Check disk space** - final image is ~1.5GB

If dtcc installation fails:

1. **GitHub access** - needs to clone from github.com
2. **Build tools** - Dockerfile includes build-essential
3. **GDAL** - must install before pip runs

## Summary

✅ **Fully automated** - No manual steps
✅ **Reproducible** - Same result every time  
✅ **Version controlled** - All in Dockerfile
✅ **CI/CD ready** - Works in pipelines
✅ **Team friendly** - New developers just run docker-compose

## See Also

- `docs/DTCC_INSTALLATION.md` - Detailed guide
- `backend/Dockerfile.dev` - Development container config
- `backend/Dockerfile.prod` - Production container config
- `backend/requirements.txt` - Python dependencies
