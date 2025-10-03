# Celery Task Queue - Quick Reference

## 🚀 Quick Start

### Run the Migration Script
```bash
./scripts/migrate_to_celery.sh
```

This script will:
1. Stop existing services
2. Build new Celery services
3. Run database migrations
4. Start all services including Redis, Celery worker, and Celery beat
5. Perform health checks

## 📊 Service Overview

| Service | Port | Description |
|---------|------|-------------|
| Backend | 8000 | Django API |
| Frontend | 5173 | React UI |
| Redis | 6379 | Task broker & result backend |
| Celery Worker | - | Processes simulation tasks |
| Celery Beat | - | Periodic task scheduler |
| Database | 5432 | PostgreSQL |

## 🔍 Monitoring Commands

### Check Service Status
```bash
# All services
docker-compose ps

# Celery worker specifically
docker-compose ps celery_worker
```

### View Logs
```bash
# All logs
docker-compose logs -f

# Celery worker only
docker-compose logs -f celery_worker

# Celery beat only
docker-compose logs -f celery_beat

# Backend only
docker-compose logs -f backend
```

### Celery Inspection
```bash
# Check if workers are alive
docker-compose exec celery_worker celery -A config inspect ping

# View active tasks
docker-compose exec celery_worker celery -A config inspect active

# View worker statistics
docker-compose exec celery_worker celery -A config inspect stats

# List registered tasks
docker-compose exec celery_worker celery -A config inspect registered

# Check scheduled tasks (beat)
docker-compose exec celery_worker celery -A config inspect scheduled
```

## 🎯 Testing the Setup

### 1. Test Task Health Check
```bash
curl http://localhost:8000/api/simulation/system-resources/
```

### 2. Start a Simulation
```bash
# Upload and run simulation via frontend
# OR use curl:
curl -X POST http://localhost:8000/api/simulation/run/ \
  -F "idf_files=@test.idf" \
  -F "weather_file=@test.epw" \
  -F "parallel=true" \
  -F "batch_mode=true"
```

### 3. Check Task Status
```bash
# Get task_id from previous response
curl http://localhost:8000/api/simulation/task/{task_id}/status/
```

### 4. Monitor Task Execution
```bash
# Watch worker logs
docker-compose logs -f celery_worker

# Should see:
# [INFO] Task simulation.run_energyplus_batch[...] received
# [INFO] Task simulation.run_energyplus_batch[...] succeeded
```

## ⚙️ Configuration

### Adjust Worker Concurrency
Edit `docker-compose.yml`:
```yaml
celery_worker:
  command: celery -A config worker --loglevel=info --concurrency=4
  # Change concurrency=4 to desired number
```

Then restart:
```bash
docker-compose restart celery_worker
```

### Scale Workers Horizontally
```bash
# Run 3 worker instances
docker-compose up -d --scale celery_worker=3
```

### Change Task Time Limits
Edit `backend/config/celery.py`:
```python
app.conf.update(
    task_time_limit=3600,       # 1 hour (3600 seconds)
    task_soft_time_limit=3300,  # 55 minutes (3300 seconds)
)
```

## 🛠️ Common Operations

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart celery_worker
docker-compose restart backend
```

### Clear Task Queue
```bash
# Purge all pending tasks (CAREFUL!)
docker-compose exec celery_worker celery -A config purge
```

### Stop Services
```bash
docker-compose down
```

### Rebuild After Code Changes
```bash
# Rebuild and restart
docker-compose build celery_worker backend
docker-compose up -d
```

## 🐛 Troubleshooting

### Workers Not Starting
```bash
# Check logs
docker-compose logs celery_worker

# Common issues:
# 1. Redis not running
docker-compose ps redis

# 2. Import errors
docker-compose build celery_worker
```

### Tasks Stuck in PENDING
```bash
# Check broker connection
docker-compose exec celery_worker celery -A config inspect ping

# If no response:
docker-compose restart celery_worker redis
```

### High Memory Usage
```bash
# Monitor resources
docker stats

# Reduce concurrency
# Edit docker-compose.yml: --concurrency=2
docker-compose up -d celery_worker
```

### Task Timeouts
```bash
# Check worker logs for SoftTimeLimitExceeded
docker-compose logs celery_worker | grep -i timeout

# Increase limits in backend/config/celery.py
```

### Connection Refused Errors
```bash
# Check Redis health
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check worker can reach Redis
docker-compose exec celery_worker celery -A config inspect ping
```

## 📈 Performance Tuning

### For CPU-Intensive Tasks (EnergyPlus)
```yaml
# Recommended: CPU cores - 1
celery_worker:
  command: celery -A config worker --concurrency=3  # for 4-core machine
```

### For I/O-Bound Tasks
```yaml
# Can use more workers than CPU cores
celery_worker:
  command: celery -A config worker --concurrency=8
```

### Memory Management
```python
# backend/config/celery.py
app.conf.update(
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    worker_prefetch_multiplier=1,    # Only fetch 1 task at a time
)
```

## 📚 Endpoints

### Simulation Endpoints
- `POST /api/simulation/run/` - Start simulation (returns `task_id`)
- `GET /api/simulation/{id}/status/` - Check simulation status
- `GET /api/simulation/{id}/results/` - Get simulation results

### Celery Task Endpoints
- `GET /api/simulation/task/{task_id}/status/` - Check task status
- `POST /api/simulation/task/{task_id}/cancel/` - Cancel running task

## 🔗 Useful Links

- **Full Documentation**: [`docs/CELERY_MIGRATION.md`](../docs/CELERY_MIGRATION.md)
- **Migration Summary**: [`CELERY_MIGRATION_SUMMARY.md`](../CELERY_MIGRATION_SUMMARY.md)
- **Celery Docs**: https://docs.celeryproject.org/
- **Redis Docs**: https://redis.io/documentation

## 🆘 Getting Help

1. Check the logs: `docker-compose logs -f celery_worker`
2. Verify services are running: `docker-compose ps`
3. Check worker status: `docker-compose exec celery_worker celery -A config status`
4. Review full documentation in `docs/CELERY_MIGRATION.md`
5. Open an issue on GitHub with logs and reproduction steps

## ✅ Quick Health Check

Run this to verify everything is working:
```bash
# 1. Check all services
docker-compose ps

# 2. Ping workers
docker-compose exec celery_worker celery -A config inspect ping

# 3. Test backend
curl http://localhost:8000/api/simulation/system-resources/

# 4. Check Redis
docker-compose exec redis redis-cli ping

# All should return positive responses!
```

## 🎉 Success Indicators

You'll know the migration worked when:
- ✅ `docker-compose ps` shows all services running
- ✅ Worker logs show: `[INFO] celery@... ready`
- ✅ Starting a simulation returns a `task_id`
- ✅ Task status endpoint returns meaningful progress
- ✅ Worker logs show task execution
- ✅ Simulation completes and results are returned

---

**Need more details?** See [`docs/CELERY_MIGRATION.md`](../docs/CELERY_MIGRATION.md) for comprehensive documentation.
