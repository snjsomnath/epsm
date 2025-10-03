# Celery Task Queue Migration Guide

## Overview

The EPSM application has been migrated from using Python's `threading` module to **Celery** for asynchronous task processing. This provides better scalability, reliability, and monitoring capabilities for EnergyPlus simulations.

## Architecture Changes

### Before (Threading-based)
```
Frontend → Django View → Background Thread → EnergyPlus
                            ↓
                        Simulation DB
```

### After (Celery-based)
```
Frontend → Django View → Celery Task Queue → Celery Worker → EnergyPlus
                            ↓                      ↓
                        Redis Broker        Simulation DB
                            ↓
                        Task Results
```

## Key Benefits

1. **Task Queuing**: Multiple simulation requests are queued and processed based on available workers
2. **Reliability**: Failed tasks can be retried automatically
3. **Monitoring**: Task status can be tracked via Celery Flower or custom endpoints
4. **Scalability**: Multiple workers can be spawned across different machines
5. **Resource Management**: Better control over concurrent simulations
6. **Crash Recovery**: Tasks survive application restarts (when using persistent broker)

## Components Added

### 1. Backend Infrastructure

#### `backend/config/celery.py`
- Main Celery application configuration
- Task discovery and broker settings
- Time limits and worker configuration

#### `backend/simulation/tasks.py`
- `run_energyplus_batch_task`: Main task for running batch parametric simulations
- `cleanup_old_results`: Periodic task to clean up old simulation files
- `health_check_task`: Simple health check for monitoring

#### `backend/simulation/models.py`
- Added `celery_task_id` field to `Simulation` model for tracking

#### `backend/simulation/views.py`
- Modified `run_simulation` to dispatch Celery tasks instead of threads
- Added `celery_task_status` endpoint for checking task progress
- Added `cancel_task` endpoint for canceling running tasks

### 2. Docker Services

#### Redis
- Acts as message broker between Django and Celery workers
- Stores task results and state
- Already included in docker-compose.yml, enhanced with health check

#### Celery Worker
- Processes queued simulation tasks
- Can be scaled horizontally by running multiple instances
- Configured with concurrency=4 (adjustable based on system resources)

#### Celery Beat (Optional)
- Handles periodic tasks like cleanup
- Runs scheduled jobs (cron-like functionality)

### 3. Frontend Updates

#### `frontend/src/components/simulation/SimulationPage.tsx`
- Updated to check both Celery task status and simulation status
- Backward compatible with old status endpoint
- Enhanced error handling for task failures

## Installation & Setup

### 1. Update Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies:
- `celery[redis]>=5.3.0,<6.0`
- `redis>=5.0.0,<6.0`

### 2. Database Migration

Run Django migrations to add the `celery_task_id` field:

```bash
python manage.py makemigrations simulation
python manage.py migrate
```

### 3. Start Services with Docker Compose

```bash
# Stop existing services
docker-compose down

# Start all services including Celery
docker-compose up -d

# Check service status
docker-compose ps
```

You should see:
- `epsm_database_dev`: PostgreSQL database
- `epsm_backend_dev`: Django application
- `epsm_frontend_dev`: React frontend
- `epsm_redis_dev`: Redis broker
- `epsm_celery_worker_dev`: Celery worker
- `epsm_celery_beat_dev`: Celery beat scheduler

### 4. Verify Celery Workers

```bash
# View Celery worker logs
docker-compose logs -f celery_worker

# Check worker status
docker-compose exec celery_worker celery -A config inspect active
```

## Usage

### Starting Simulations

The API remains the same from the frontend perspective:

```typescript
POST /api/simulation/run/
```

Response now includes:
```json
{
  "simulation_id": "uuid-here",
  "task_id": "celery-task-id-here",
  "message": "Simulation task queued successfully",
  "file_count": 3
}
```

### Checking Task Status

Two endpoints are available:

#### 1. Celery Task Status (Recommended)
```
GET /api/simulation/task/{task_id}/status/
```

Response:
```json
{
  "task_id": "task-id-here",
  "state": "PROGRESS",
  "status": "running",
  "progress": 45,
  "current": 45,
  "total": 100,
  "message": "Processing simulation 3 of 10...",
  "simulation_id": "uuid-here"
}
```

States:
- `PENDING`: Task is queued but not started
- `PROGRESS`: Task is running (custom state)
- `SUCCESS`: Task completed successfully
- `FAILURE`: Task failed
- `REVOKED`: Task was cancelled

#### 2. Simulation Status (Backward Compatible)
```
GET /api/simulation/{simulation_id}/status/
```

Response:
```json
{
  "status": "running",
  "progress": 45,
  "simulationId": "uuid-here",
  "error": null
}
```

### Canceling Tasks

```
POST /api/simulation/task/{task_id}/cancel/
```

Response:
```json
{
  "status": "cancelled",
  "task_id": "task-id-here",
  "message": "Task cancellation requested"
}
```

## Monitoring

### Using Docker Logs

```bash
# Watch Celery worker logs
docker-compose logs -f celery_worker

# Watch all logs
docker-compose logs -f
```

### Using Celery Commands

```bash
# Inspect active tasks
docker-compose exec celery_worker celery -A config inspect active

# Check worker stats
docker-compose exec celery_worker celery -A config inspect stats

# Purge all pending tasks (be careful!)
docker-compose exec celery_worker celery -A config purge
```

### Using Celery Flower (Optional)

Flower is a web-based monitoring tool for Celery. To enable:

1. Add to `requirements.txt`:
```
flower>=2.0.0
```

2. Add to `docker-compose.yml`:
```yaml
  flower:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: epsm_flower_dev
    command: celery -A config flower --port=5555
    ports:
      - "5555:5555"
    environment:
      # Same as celery_worker
    depends_on:
      - redis
      - celery_worker
    networks:
      - epsm_network
```

3. Access at: http://localhost:5555

## Configuration

### Environment Variables

Add to your `.env` or docker-compose environment:

```bash
# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Task Limits
CELERY_TASK_TIME_LIMIT=3600        # 1 hour hard limit
CELERY_TASK_SOFT_TIME_LIMIT=3300   # 55 min soft limit

# Worker Configuration
CELERY_WORKER_CONCURRENCY=4         # Number of concurrent tasks
CELERY_WORKER_PREFETCH_MULTIPLIER=1 # Tasks to prefetch
```

### Scaling Workers

To handle more concurrent simulations:

```yaml
# In docker-compose.yml
celery_worker:
  # ... existing config ...
  command: celery -A config worker --loglevel=info --concurrency=8
```

Or run multiple worker instances:

```bash
docker-compose up -d --scale celery_worker=3
```

## Troubleshooting

### Workers Not Starting

```bash
# Check logs
docker-compose logs celery_worker

# Common issues:
# 1. Redis not running
docker-compose ps redis

# 2. Import errors - rebuild
docker-compose build celery_worker
docker-compose up -d celery_worker
```

### Tasks Stuck in PENDING

```bash
# Check if workers are connected
docker-compose exec celery_worker celery -A config inspect active

# Restart worker
docker-compose restart celery_worker
```

### High Memory Usage

```bash
# Configure worker to restart after N tasks
# In docker-compose.yml celery_worker command:
command: celery -A config worker --loglevel=info --max-tasks-per-child=50
```

### Tasks Timing Out

Increase time limits in `backend/config/celery.py`:

```python
app.conf.update(
    task_time_limit=7200,      # 2 hours
    task_soft_time_limit=6600,  # 1h 50m
)
```

## Migration Checklist

- [x] Install Celery and Redis dependencies
- [x] Create Celery configuration (`backend/config/celery.py`)
- [x] Create task definitions (`backend/simulation/tasks.py`)
- [x] Update Simulation model with `celery_task_id` field
- [x] Migrate `run_simulation` view to dispatch Celery tasks
- [x] Add task status endpoints (`celery_task_status`, `cancel_task`)
- [x] Update docker-compose with Redis health check
- [x] Add Celery worker service to docker-compose
- [x] Add Celery beat service to docker-compose
- [x] Update frontend to use new task status endpoints
- [x] Run database migrations
- [x] Test simulation workflow end-to-end
- [ ] Monitor production deployment
- [ ] Set up Flower for monitoring (optional)

## Performance Considerations

### Optimal Worker Configuration

For a machine with N CPU cores:

- **Conservative**: `concurrency = N - 1` (leave 1 core for system)
- **Aggressive**: `concurrency = N * 2` (for I/O-bound tasks)
- **EnergyPlus**: Start with `concurrency = max(1, N - 1)` since EnergyPlus itself is CPU-intensive

### Memory Management

Each worker task may consume significant memory (500MB-2GB per EnergyPlus simulation):

```python
# In tasks.py or celery.py
app.conf.update(
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
)
```

### Task Priorities

Future enhancement - add task priorities:

```python
@shared_task(priority=5)  # Higher priority (0-10)
def urgent_simulation_task(...):
    pass
```

## Rollback Plan

If you need to revert to the threading approach:

1. Comment out Celery task dispatch in `views.py`
2. Uncomment the old threading code
3. Remove `celery_worker` and `celery_beat` from docker-compose
4. Keep Redis for potential future use

## Next Steps

1. **Add Result Retention Policy**: Configure how long task results stay in Redis
2. **Implement Task Priorities**: Allow urgent simulations to jump the queue
3. **Add Retry Logic**: Automatically retry failed simulations
4. **Implement Task Chaining**: Chain multiple simulation tasks together
5. **Add Email Notifications**: Notify users when long-running simulations complete
6. **Monitor Performance**: Track task execution times and optimize

## References

- [Celery Documentation](https://docs.celeryproject.org/)
- [Django + Celery Best Practices](https://docs.celeryproject.org/en/stable/django/first-steps-with-django.html)
- [Redis Documentation](https://redis.io/documentation)
- [Celery Flower](https://flower.readthedocs.io/)
