# DTCC Installation Guide

## Overview

The DTCC (Digital Twin Cities Centre) library is now successfully integrated into EPSM for downloading Swedish building data and converting it to EnergyPlus IDF files.

## Installation Method

**DTCC is installed from source (GitHub), not from PyPI.**

### Why not PyPI?

The `dtcc` package on PyPI (versions 0.9.1, 0.9.2) has broken dependencies:
- It declares `dtcc-core` as a dependency
- `dtcc-core` does not exist on PyPI
- Installation fails with: `ERROR: No matching distribution found for dtcc-core`

This is a packaging issue on the DTCC maintainers' side.

### The Solution

Install from the official GitHub repository:
```bash
pip install git+https://github.com/dtcc-platform/dtcc.git
```

This automatically:
1. Clones the dtcc repository
2. Clones and builds dtcc-core from GitHub
3. Installs all dependencies
4. Builds and installs the packages

## System Dependencies

DTCC requires GDAL (Geospatial Data Abstraction Library) to be installed at the system level:

```bash
apt-get install -y gdal-bin libgdal-dev
```

**This is now included in the Dockerfiles.**

## Implementation

### 1. Dockerfile Changes

Both `Dockerfile.dev` and `Dockerfile.prod` now include:

```dockerfile
# Install system dependencies including GDAL for dtcc
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    docker.io \
    gdal-bin \
    libgdal-dev \
    git \
    && rm -rf /var/lib/apt/lists/*
```

### 2. Requirements.txt

The `backend/requirements.txt` includes:

```
# dtcc - Install from source (PyPI version has broken dependencies)
# Must install after GDAL system dependencies are installed
git+https://github.com/dtcc-platform/dtcc.git
```

### 3. Dependency Order

**CRITICAL:** GDAL must be installed BEFORE pip installs dtcc.

Docker build order:
1. ✅ Install system packages (including GDAL)
2. ✅ Copy requirements.txt
3. ✅ Run `pip install -r requirements.txt` (which installs dtcc from GitHub)

This is automatic with the Dockerfile setup.

## Verification

To verify DTCC is properly installed:

```bash
# Inside container
docker-compose exec backend python -c "import dtcc; print('✅ DTCC OK')"

# Or check health endpoint
curl http://localhost:8000/api/geojson/health/
```

Expected response:
```json
{
  "status": "healthy",
  "dtcc_available": true,
  "ladybug_tools_available": true
}
```

## Reproducibility

### Development Environment

When you run:
```bash
docker-compose up --build
```

The container will:
1. Build from `Dockerfile.dev`
2. Install GDAL system packages
3. Install dtcc from GitHub automatically
4. Everything works out of the box ✅

### Production Environment

When deploying:
```bash
docker-compose -f docker-compose.production.yml up --build
```

Same process using `Dockerfile.prod`:
1. GDAL installed
2. dtcc installed from GitHub
3. Fully reproducible ✅

### CI/CD Pipelines

The GitHub Actions workflow (if you have one) should:
1. Build Docker images (which includes GDAL + dtcc)
2. Push to registry
3. Deploy

No manual steps required!

## What Gets Installed

When `pip install git+https://github.com/dtcc-platform/dtcc.git` runs:

**Core packages:**
- `dtcc` - Main DTCC package
- `dtcc-core` - Core functionality (from GitHub)

**Dependencies (auto-installed):**
- Fiona - Reading/writing geospatial data
- geopandas - Geographic data manipulation
- rasterio - Raster data processing
- laspy - LiDAR point cloud data
- meshio - Mesh file I/O
- scikit-image - Image processing
- scipy - Scientific computing
- h5py - HDF5 file format
- pillow - Image processing
- protobuf - Data serialization
- pyassimp - 3D model loading
- rasterstats - Zonal statistics
- And more...

All of these are Python packages and install automatically with pip.

## Troubleshooting

### Error: "gdal-config not found"

**Problem:** GDAL not installed at system level

**Solution:** 
```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up
```

The Dockerfile now includes GDAL, so rebuilding will fix this.

### Error: "Could not find dtcc-core"

**Problem:** Trying to install from PyPI instead of GitHub

**Solution:** Check requirements.txt has:
```
git+https://github.com/dtcc-platform/dtcc.git
```

Not:
```
dtcc  # ❌ This won't work
```

### Import warnings about assimp

You may see:
```
WARNING: Unable to find assimp, reading and writing .dae and .fbx files will not work
```

This is **normal** and **not a problem**. EPSM doesn't use .dae or .fbx files.

### View method warnings

You may see:
```
WARNING: Method view already exists, replacing it.
```

This is **normal** internal DTCC behavior and can be ignored.

## Testing

After rebuilding containers, test the full pipeline:

1. **Health check:**
   ```bash
   curl http://localhost:8000/api/geojson/health/
   ```

2. **Download Swedish building data:**
   ```bash
   curl -X POST http://localhost:8000/api/geojson/process-geojson/ \
     -H "Content-Type: application/json" \
     -d '{
       "bounds": {
         "north": 57.71,
         "south": 57.70,
         "east": 11.98,
         "west": 11.97
       }
     }'
   ```

3. **Expected result:** IDF file generated successfully

## Docker Image Size

Adding GDAL increases the image size:

**Before:** ~500-600 MB
**After:** ~1.2-1.5 GB

This is **normal** and **necessary** for geospatial processing. GDAL brings many system libraries.

## Alternative: Multi-stage Build (Future Optimization)

To reduce final image size, you could use a multi-stage build:

```dockerfile
# Build stage with all build tools
FROM python:3.11-slim as builder
RUN apt-get update && apt-get install -y gdal-bin libgdal-dev build-essential git
RUN pip install git+https://github.com/dtcc-platform/dtcc.git

# Runtime stage with only runtime deps
FROM python:3.11-slim
RUN apt-get update && apt-get install -y libgdal36 --no-install-recommends
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
```

**For now, the current approach is simpler and works reliably.**

## Summary

✅ **Fully Reproducible:** All dependencies in Dockerfile
✅ **No Manual Steps:** Everything automatic in docker build
✅ **Development & Production:** Same approach for both
✅ **CI/CD Ready:** Works in automated pipelines
✅ **Tested & Working:** Health check confirms installation

## Questions or Issues?

- **DTCC Source:** https://github.com/dtcc-platform/dtcc
- **DTCC Documentation:** https://dtcc.chalmers.se/
- **Contact DTCC:** dtcc@chalmers.se (you're at Chalmers!)

## Version History

- **v0.9.2.dev0** - Installed from GitHub (develop branch)
- **dtcc-core v0.9.3.dev0** - Dependency, auto-installed

## Related Documentation

- `docs/GEOJSON_QUICK_START.md` - How to use the GeoJSON processor
- `docs/GEOJSON_STATUS.md` - Current implementation status
- `backend/geojson_processor/README.md` - API documentation
