# Simulation Execution Fix - Complete Resolution

**Date**: October 12, 2025  
**Issues**: Multiple problems causing simulations to fail  
**Status**: ✅ ALL FIXED

## Problems Encountered

### 1. Missing Database Tables ✅ FIXED
**Error**: `relation "simulation_results" does not exist`

**Cause**: Results database (`epsm_results`) was not being migrated during deployment.

**Fix**: Updated deployment scripts to migrate all three databases.
- See: `DATABASE_MIGRATION_FIX_OCT2024.md`

### 2. Docker Volume Mount Issue ✅ FIXED
**Error**: `input_file: File does not exist: /var/simdata/energyplus/input.idf`

**Cause**: Backend container was trying to mount container-internal paths to the host Docker daemon.

**Root Cause Explanation**:
- Backend runs **inside a Docker container** (`epsm_backend_prod`)
- Backend spawns **EnergyPlus in another Docker container** by calling the **host Docker daemon**
- When backend says "mount `/app/media/...`", the host Docker daemon doesn't know that path
- The path `/app/media` only exists **inside** the backend container
- The host Docker daemon needs the **host path** to the volume

**Solution**: Set `HOST_MEDIA_ROOT` environment variable to the Docker volume path on the host.

```yaml
# docker-compose.production.yml
backend:
  environment:
    - HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
  volumes:
    - media_data_prod:/app/media
    - /var/run/docker.sock:/var/run/docker.sock  # Access host Docker daemon
```

**How it works**:
1. Backend sees files at `/app/media/simulation_results/...` (container path)
2. Backend translates this to `/var/lib/docker/volumes/epsm_media_data_prod/_data/simulation_results/...` (host path)
3. Backend tells host Docker daemon to mount the host path
4. EnergyPlus container can now access the files

## Technical Details

### Docker-in-Docker Architecture

```
┌─────────────────────────────────────────────────────┐
│ Host Machine                                         │
│                                                      │
│  ┌──────────────────────────────────────────┐      │
│  │ Backend Container (epsm_backend_prod)    │      │
│  │                                          │      │
│  │  Path: /app/media/simulation_results/   │      │
│  │         ↓                                 │      │
│  │  Translates to:                          │      │
│  │  /var/lib/docker/volumes/epsm_media...  │      │
│  │         ↓                                 │      │
│  │  Calls Docker CLI ─────────────────────► │      │
│  └──────────────────────────────────────────┘      │
│                   ↓                                 │
│  ┌──────────────────────────────────────────┐      │
│  │ Docker Daemon                             │      │
│  │  Mounts: /var/lib/docker/volumes/...     │      │
│  └──────────────────────────────────────────┘      │
│                   ↓                                 │
│  ┌──────────────────────────────────────────┐      │
│  │ EnergyPlus Container                      │      │
│  │  Sees: /var/simdata/energyplus/input.idf │      │
│  └──────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### Code Implementation

**In `backend/simulation/services.py`** (lines 160-180):

```python
# Get the host-accessible path if backend is running in Docker
host_media_root = os.environ.get('HOST_MEDIA_ROOT')

# Translate container path to host path
if host_media_root and str(simulation_dir).startswith(str(settings.MEDIA_ROOT)):
    rel = os.path.relpath(str(simulation_dir), str(settings.MEDIA_ROOT))
    mount_source = os.path.join(host_media_root, rel)
else:
    mount_source = simulation_dir

# Mount the host path
docker_command = [
    'docker', 'run', '--rm',
    '-v', f'{mount_source}:/var/simdata/energyplus',  # Host path → Container path
    'nrel/energyplus:23.2.0',
    ...
]
```

## Files Changed

### 1. `/opt/epsm/docker-compose.production.yml`

**Backend service**:
```yaml
environment:
  - HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

**Celery worker service**:
```yaml
environment:
  - HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

### Why Both Services?

Both backend and celery_worker can run simulations:
- **Backend**: Handles baseline simulations (single IDF files)
- **Celery Worker**: Handles scenario simulations (parametric variants)

Both need to spawn EnergyPlus containers, so both need `HOST_MEDIA_ROOT`.

## Verification Steps

### 1. Check Environment Variable

```bash
docker-compose -f docker-compose.production.yml exec backend env | grep HOST_MEDIA_ROOT
# Should output: HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

### 2. Run Test Simulation

1. Upload a valid IDF file
2. Upload a weather file (EPW)
3. Click "Run Baseline Simulation"
4. Wait for completion (progress bar reaches 100%)
5. Check results - should show energy use data, not errors

### 3. Check Simulation Output

```bash
# Find the latest simulation ID
docker-compose -f docker-compose.production.yml exec backend \
  ls -lt /app/media/simulation_results/ | head -5

# Check for EnergyPlus output files
docker-compose -f docker-compose.production.yml exec backend \
  ls -la /app/media/simulation_results/<simulation-id>/<idf-name>/

# Should see:
# - output.htm (EnergyPlus HTML report)
# - output.html (copy for browser access)
# - output.err (error log - check for warnings)
# - output.csv (timeseries data)
# - run_output.log (Docker execution log)
```

### 4. Check Run Log

```bash
docker-compose -f docker-compose.production.yml exec backend \
  cat /app/media/simulation_results/<simulation-id>/<idf-name>/run_output.log
```

Should see:
```
DOCKER COMMAND: docker run --rm -v /var/lib/docker/volumes/epsm_media_data_prod/_data/simulation_results/... [OK]
STDOUT: [EnergyPlus output]
returncode: 0  [SUCCESS]
```

Should NOT see:
```
input_file: File does not exist  [BAD]
returncode: 1  [ERROR]
```

## Environment Variable Options

### Production (Docker Volumes)
```bash
HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

### Development (Bind Mounts)
```bash
# macOS
HOST_MEDIA_ROOT=/Users/ssanjay/GitHub/epsm/backend/media

# Linux
HOST_MEDIA_ROOT=/home/user/epsm/backend/media
```

### Cloud/Kubernetes (Adjust per platform)
```bash
# AWS ECS with EFS
HOST_MEDIA_ROOT=/mnt/efs/epsm/media

# Azure with Azure Files
HOST_MEDIA_ROOT=/mnt/azure/epsm/media

# Kubernetes with PVC
HOST_MEDIA_ROOT=/var/lib/kubelet/pods/<pod-id>/volumes/kubernetes.io~nfs/epsm-media-pvc
```

## Related Issues Resolved

This fix also resolves:
- ❌ "HTML results file not found" errors
- ❌ Simulations completing at 100% but showing no data
- ❌ Energy use metrics all showing 0
- ❌ Zone data not being extracted
- ❌ Hourly timeseries data missing

All of these were symptoms of EnergyPlus not actually running.

## Deployment Checklist

When deploying to a new environment:

1. ✅ Set `HOST_MEDIA_ROOT` environment variable
2. ✅ Ensure `/var/run/docker.sock` is mounted to backend/celery containers
3. ✅ Ensure `media_data_prod` volume is created
4. ✅ Verify Docker daemon is accessible from containers
5. ✅ Test with a simple IDF simulation
6. ✅ Check run logs for mount errors
7. ✅ Verify output.htm files are generated

## Troubleshooting

### Error: "File does not exist: /var/simdata/energyplus/input.idf"

**Check**:
```bash
# 1. Is HOST_MEDIA_ROOT set?
docker-compose exec backend env | grep HOST_MEDIA_ROOT

# 2. Does the volume exist?
docker volume ls | grep media_data_prod

# 3. Can backend access Docker?
docker-compose exec backend docker ps

# 4. Check actual volume path
docker volume inspect epsm_media_data_prod | grep Mountpoint
```

### Error: "permission denied while trying to connect to Docker daemon"

**Fix**: Ensure Docker socket is mounted and has proper permissions:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
environment:
  - DOCKER_GID=999  # Set to your host Docker group ID
```

### Error: "cannot mount volume: no such file or directory"

**Cause**: `HOST_MEDIA_ROOT` points to wrong path.

**Fix**: Find correct volume path:
```bash
docker volume inspect epsm_media_data_prod
# Use the "Mountpoint" value for HOST_MEDIA_ROOT
```

## Testing

### Manual Test

1. **Clear old results**:
   ```bash
   docker-compose exec backend rm -rf /app/media/simulation_results/*
   ```

2. **Run simulation** via UI

3. **Check logs**:
   ```bash
   docker-compose logs -f celery_worker
   ```

4. **Verify output**:
   ```bash
   docker-compose exec backend find /app/media/simulation_results -name "output.htm"
   ```

### Automated Test

Create `scripts/test-simulation.sh`:
```bash
#!/bin/bash
# Test that simulations can run

COMPOSE_FILE="docker-compose.production.yml"

# Check HOST_MEDIA_ROOT
echo "Checking HOST_MEDIA_ROOT..."
docker-compose -f $COMPOSE_FILE exec -T backend env | grep HOST_MEDIA_ROOT || {
    echo "ERROR: HOST_MEDIA_ROOT not set!"
    exit 1
}

# Check Docker access
echo "Checking Docker access..."
docker-compose -f $COMPOSE_FILE exec -T backend docker ps > /dev/null || {
    echo "ERROR: Backend cannot access Docker daemon!"
    exit 1
}

echo "✅ All simulation prerequisites OK"
```

## Success Criteria

✅ `HOST_MEDIA_ROOT` is set in production environment  
✅ Backend and celery_worker can access host Docker daemon  
✅ EnergyPlus containers can mount simulation directories  
✅ Simulations complete with output.htm generated  
✅ Results are parsed and saved to database  
✅ Frontend displays energy use data correctly  

## Next Steps

1. ✅ Test baseline simulation with real IDF file
2. ✅ Test scenario simulation with construction variants
3. ⬜ Add automated health check for Docker access
4. ⬜ Document this in deployment guide
5. ⬜ Add to CI/CD verification

---

**Summary**: The simulation execution issue was caused by incorrect Docker volume mounting. Setting `HOST_MEDIA_ROOT` environment variable allows the backend to translate container paths to host paths when spawning EnergyPlus containers. This is now fixed and documented.
