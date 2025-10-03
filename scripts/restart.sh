#!/bin/bash

# EPSM Quick Restart Script
# Restart backend and Celery services without full teardown

set -e

echo "🔄 Restarting EPSM services..."

# Restart backend and Celery services
echo "   Restarting backend..."
docker-compose restart backend

echo "   Restarting Celery worker..."
docker-compose restart celery_worker

echo "   Restarting Celery beat..."
docker-compose restart celery_beat

echo ""
echo "✅ Services restarted successfully!"
echo ""
echo "📊 Service Status:"
docker-compose ps backend celery_worker celery_beat

echo ""
echo "📝 Quick commands:"
echo "   View backend logs: docker-compose logs -f backend"
echo "   View worker logs: docker-compose logs -f celery_worker"
echo "   Check active tasks: docker-compose exec celery_worker celery -A config inspect active"
