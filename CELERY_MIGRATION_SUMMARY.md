# Celery Migration Summary

## What Was Changed

### 1. **Backend Infrastructure**
- ✅ Created `backend/config/celery.py` - Main Celery application
- ✅ Updated `backend/config/__init__.py` - Auto-import Celery app
- ✅ Created `backend/simulation/tasks.py` - Celery task definitions
- ✅ Updated `backend/simulation/models.py` - Added `celery_task_id` field
- ✅ Updated `backend/simulation/views.py` - Replaced threading with Celery
- ✅ Updated `backend/simulation/urls.py` - Added task status endpoints
- ✅ Updated `backend/config/settings.py` - Added Celery configuration
- ✅ Updated `backend/requirements.txt` - Added Celery and Redis

### 2. **Docker Infrastructure**
- ✅ Enhanced `redis` service with health check in `docker-compose.yml`
- ✅ Added `celery_worker` service for processing tasks
- ✅ Added `celery_beat` service for periodic tasks

### 3. **Frontend**
- ✅ Updated `frontend/src/components/simulation/SimulationPage.tsx`
  - Added support for Celery task ID tracking
  - Enhanced status polling to check both task and simulation status
  - Backward compatible with old status endpoint

### 4. **Documentation**
- ✅ Created `docs/CELERY_MIGRATION.md` - Comprehensive migration guide
- ✅ Created `CELERY_MIGRATION_SUMMARY.md` - This summary

## Migration Path

### From (Threading):
```python
# Old approach in views.py
def run_simulation(request):
    # ... setup ...
    
    def run_sim_in_background():
        simulator = EnergyPlusSimulator(simulation)
        simulator.run_simulation(...)
    
    thread = threading.Thread(target=run_sim_in_background)
    thread.start()
```

### To (Celery):
```python
# New approach in views.py
def run_simulation(request):
    # ... setup ...
    
    from .tasks import run_energyplus_batch_task
    
    task = run_energyplus_batch_task.delay(
        simulation_id=str(simulation.id),
        idf_file_paths=idf_file_paths,
        weather_file_path=weather_file_obj.file_path,
        parallel=True,
        max_workers=max_workers,
        batch_mode=True,
        construction_sets=construction_sets
    )
    
    simulation.celery_task_id = task.id
    simulation.save()
```

## Key Features

### 1. **Task Queuing**
- Multiple simulation requests are automatically queued
- Workers process tasks based on availability
- No more blocking or resource starvation

### 2. **Better Monitoring**
```bash
# Check active tasks
docker-compose exec celery_worker celery -A config inspect active

# View worker logs
docker-compose logs -f celery_worker
```

### 3. **Task Cancellation**
```bash
curl -X POST http://localhost:8000/api/simulation/task/{task_id}/cancel/
```

### 4. **Reliability**
- Tasks survive application restarts (when broker is persistent)
- Failed tasks can be retried automatically
- Worker crashes don't lose queued tasks

### 5. **Scalability**
```bash
# Scale to 3 workers
docker-compose up -d --scale celery_worker=3
```

## Breaking Changes

### None! 
The migration is **backward compatible**:
- Old status endpoint still works: `/api/simulation/{id}/status/`
- New task endpoint added: `/api/simulation/task/{task_id}/status/`
- Frontend checks both endpoints (prefers new one if available)

## Required Actions

### 1. Database Migration
```bash
cd backend
python manage.py makemigrations simulation
python manage.py migrate
```

This adds the `celery_task_id` field to the `Simulation` model.

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

New packages:
- `celery[redis]>=5.3.0,<6.0`
- `redis>=5.0.0,<6.0`

### 3. Restart Services
```bash
docker-compose down
docker-compose up -d
```

Verify new services:
```bash
docker-compose ps
```

Should show:
- `epsm_redis_dev` (Running)
- `epsm_celery_worker_dev` (Running)
- `epsm_celery_beat_dev` (Running)

## Testing the Migration

### 1. Start a Simulation
Use the frontend or curl:
```bash
curl -X POST http://localhost:8000/api/simulation/run/ \
  -F "idf_files=@test.idf" \
  -F "weather_file=@test.epw" \
  -F "parallel=true" \
  -F "batch_mode=true"
```

Response should include `task_id`:
```json
{
  "simulation_id": "uuid-here",
  "task_id": "celery-task-id-here",
  "message": "Simulation task queued successfully"
}
```

### 2. Check Task Status
```bash
curl http://localhost:8000/api/simulation/task/{task_id}/status/
```

### 3. Monitor Worker Logs
```bash
docker-compose logs -f celery_worker
```

Should show task execution:
```
[INFO] Task simulation.run_energyplus_batch[task-id] received
[INFO] Task simulation.run_energyplus_batch[task-id] succeeded
```

## Performance Comparison

### Before (Threading)
- ❌ All simulations run in same process
- ❌ No queue management
- ❌ Resource contention
- ❌ Hard to monitor
- ❌ Blocks Django process

### After (Celery)
- ✅ Isolated worker processes
- ✅ Built-in task queue
- ✅ Configurable concurrency
- ✅ Rich monitoring tools
- ✅ Non-blocking Django

## Configuration Options

### Worker Concurrency
```yaml
# docker-compose.yml
celery_worker:
  command: celery -A config worker --loglevel=info --concurrency=4
```

### Task Time Limits
```python
# backend/config/celery.py
app.conf.update(
    task_time_limit=3600,       # 1 hour hard limit
    task_soft_time_limit=3300,  # 55 minutes soft limit
)
```

### Memory Management
```python
# backend/config/celery.py
app.conf.update(
    worker_max_tasks_per_child=50,  # Restart after 50 tasks
)
```

## Monitoring Commands

```bash
# Check worker status
docker-compose exec celery_worker celery -A config status

# Inspect active tasks
docker-compose exec celery_worker celery -A config inspect active

# Check worker stats
docker-compose exec celery_worker celery -A config inspect stats

# View registered tasks
docker-compose exec celery_worker celery -A config inspect registered

# Purge all pending tasks (CAREFUL!)
docker-compose exec celery_worker celery -A config purge
```

## Troubleshooting

### Workers Not Processing Tasks
```bash
# 1. Check Redis connection
docker-compose logs redis

# 2. Check worker logs
docker-compose logs celery_worker

# 3. Restart worker
docker-compose restart celery_worker
```

### Tasks Stuck in PENDING
```bash
# Check broker connection
docker-compose exec celery_worker celery -A config inspect ping

# If no response, restart:
docker-compose restart celery_worker redis
```

### Memory Issues
```bash
# Monitor memory usage
docker stats epsm_celery_worker_dev

# Reduce concurrency
# Edit docker-compose.yml: --concurrency=2
docker-compose up -d celery_worker
```

## Rollback Instructions

If you need to revert:

1. **Restore old view code:**
```python
# Uncomment threading code in views.py
# Comment out Celery task dispatch
```

2. **Remove Celery services:**
```yaml
# Comment out in docker-compose.yml:
# - celery_worker
# - celery_beat
```

3. **Restart:**
```bash
docker-compose up -d
```

## Next Steps

### Immediate
- [ ] Run database migrations
- [ ] Deploy to staging environment
- [ ] Test end-to-end workflow
- [ ] Monitor worker performance

### Future Enhancements
- [ ] Add Celery Flower for web-based monitoring
- [ ] Implement task priorities
- [ ] Add automatic retry logic
- [ ] Send email notifications on completion
- [ ] Implement result retention policies
- [ ] Add task chaining for complex workflows

## Resources

- **Full Documentation**: `docs/CELERY_MIGRATION.md`
- **Celery Docs**: https://docs.celeryproject.org/
- **Django + Celery**: https://docs.celeryproject.org/en/stable/django/
- **Redis Docs**: https://redis.io/documentation

## Questions?

For questions or issues:
1. Check `docs/CELERY_MIGRATION.md` for detailed information
2. Review worker logs: `docker-compose logs celery_worker`
3. Open an issue on GitHub with logs and steps to reproduce
