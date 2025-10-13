#!/bin/bash

# Fix Redis connection issues in EPSM production
# This script diagnoses and fixes Redis connectivity problems

set -e

echo "=========================================="
echo "EPSM Redis Connection Fix"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if Redis container is running
echo -e "${BLUE}Step 1:${NC} Checking Redis container status..."
if docker ps | grep -q epsm_redis_prod; then
    echo -e "${GREEN}✓${NC} Redis container is running"
else
    echo -e "${RED}✗${NC} Redis container is NOT running"
    echo "Starting Redis container..."
    docker-compose -f docker-compose.production.yml up -d redis
    sleep 5
fi
echo ""

# Step 2: Check Redis password configuration
echo -e "${BLUE}Step 2:${NC} Checking Redis password configuration..."

# Check if Redis has a password set
if docker exec epsm_redis_prod redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✓${NC} Redis is running WITHOUT password"
    REDIS_HAS_PASSWORD=false
elif docker exec epsm_redis_prod redis-cli -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✓${NC} Redis is running WITH password"
    REDIS_HAS_PASSWORD=true
else
    echo -e "${RED}✗${NC} Cannot connect to Redis with or without password"
    REDIS_HAS_PASSWORD=unknown
fi
echo ""

# Step 3: Test backend connection to Redis WITHOUT password
echo -e "${BLUE}Step 3:${NC} Testing backend Redis connection (no password)..."
TEST_NO_PASS=$(docker exec epsm_backend_prod python3 << 'PYEOF'
try:
    import redis
    r = redis.Redis(host='redis', port=6379, db=0, socket_connect_timeout=5)
    r.ping()
    print('SUCCESS')
except Exception as e:
    print(f'FAILED: {e}')
PYEOF
)

if echo "$TEST_NO_PASS" | grep -q SUCCESS; then
    echo -e "${GREEN}✓${NC} Backend can connect to Redis without password"
    BACKEND_NO_PASS=true
else
    echo -e "${RED}✗${NC} Backend cannot connect to Redis without password"
    echo "  Error: $TEST_NO_PASS"
    BACKEND_NO_PASS=false
fi
echo ""

# Step 4: Check environment variables in backend
echo -e "${BLUE}Step 4:${NC} Checking backend environment variables..."
BACKEND_ENV=$(docker exec epsm_backend_prod env | grep -E "REDIS_|CELERY_" || echo "")
if [ -z "$BACKEND_ENV" ]; then
    echo -e "${YELLOW}⚠${NC} No Redis environment variables found in backend"
else
    echo "Redis-related environment variables:"
    echo "$BACKEND_ENV" | sed 's/PASSWORD=[^[:space:]]*/PASSWORD=***/' | head -10
fi
echo ""

# Step 5: Check what the backend is actually using
echo -e "${BLUE}Step 5:${NC} Checking backend Redis configuration from Django..."
DJANGO_REDIS_CONFIG=$(docker exec epsm_backend_prod python3 << 'PYEOF'
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.conf import settings

print("=" * 50)
print("Celery Broker URL:", settings.CELERY_BROKER_URL.replace(os.getenv('REDIS_PASSWORD', 'xxx'), '***'))
print("=" * 50)

if hasattr(settings, 'CHANNEL_LAYERS'):
    config = settings.CHANNEL_LAYERS.get('default', {}).get('CONFIG', {})
    hosts = config.get('hosts', [])
    if hosts:
        # Mask password in output
        masked_hosts = []
        for h in hosts:
            if isinstance(h, str) and '@' in h:
                parts = h.split('@')
                masked_hosts.append(f"redis://:***@{parts[1]}")
            else:
                masked_hosts.append(str(h))
        print("Channel Layer Hosts:", masked_hosts)
    else:
        print("Channel Layer Hosts: (empty)")
else:
    print("Channel Layers: NOT CONFIGURED")
print("=" * 50)
PYEOF
)
echo "$DJANGO_REDIS_CONFIG"
echo ""

# Step 6: Recommendations
echo "=========================================="
echo -e "${BLUE}Diagnosis & Recommendations${NC}"
echo "=========================================="
echo ""

if [ "$REDIS_HAS_PASSWORD" = "false" ] && [ "$BACKEND_NO_PASS" = "false" ]; then
    echo -e "${RED}ISSUE FOUND:${NC}"
    echo "Redis is running without password, but backend cannot connect."
    echo ""
    echo -e "${YELLOW}SOLUTION:${NC}"
    echo "1. Check if Redis container is in the same network:"
    echo "   docker network inspect epsm_network | grep redis"
    echo ""
    echo "2. Restart backend container:"
    echo "   docker-compose -f docker-compose.production.yml restart backend"
    echo ""
    
elif [ "$REDIS_HAS_PASSWORD" = "true" ] && [ "$BACKEND_NO_PASS" = "false" ]; then
    echo -e "${RED}ISSUE FOUND:${NC}"
    echo "Redis has password protection, but backend connection failed."
    echo ""
    echo -e "${YELLOW}SOLUTION:${NC}"
    echo "1. Ensure REDIS_PASSWORD is set in .env.production file"
    echo "2. Restart backend container with correct password:"
    echo "   docker-compose -f docker-compose.production.yml down backend"
    echo "   docker-compose -f docker-compose.production.yml up -d backend"
    echo ""
    
elif [ "$BACKEND_NO_PASS" = "true" ]; then
    echo -e "${GREEN}✓ Backend CAN connect to Redis${NC}"
    echo ""
    echo "But WebSocket still fails? Check these:"
    echo "1. Verify channel layer is using correct Redis database:"
    echo "   docker exec epsm_backend_prod python manage.py shell -c \"from channels.layers import get_channel_layer; cl = get_channel_layer(); import asyncio; print(asyncio.run(cl.send('test', {'type': 'test'})))\""
    echo ""
    echo "2. Check if daphne is handling WebSocket requests:"
    echo "   docker logs epsm_backend_prod | grep -i websocket"
    echo ""
    echo "3. Test WebSocket endpoint directly:"
    echo "   docker exec epsm_backend_prod curl -i -N -H 'Connection: Upgrade' -H 'Upgrade: websocket' http://localhost:8000/ws/simulation-progress/test/"
    echo ""
fi

echo ""
echo "=========================================="
echo "Quick Fix Commands"
echo "=========================================="
echo ""
echo "# Option 1: Remove Redis password (simpler, for internal network)"
echo "docker-compose -f docker-compose.production.yml down redis"
echo "# Edit docker-compose.production.yml - change redis command to:"
echo "#   command: redis-server --appendonly yes"
echo "docker-compose -f docker-compose.production.yml up -d redis"
echo "docker-compose -f docker-compose.production.yml restart backend celery_worker celery_beat"
echo ""
echo "# Option 2: Set Redis password in environment (more secure)"
echo "# Add to .env.production:"
echo "#   REDIS_PASSWORD=your_secure_password_here"
echo "docker-compose -f docker-compose.production.yml down"
echo "docker-compose -f docker-compose.production.yml up -d --force-recreate"
echo ""
