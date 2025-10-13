#!/bin/bash
# Quick diagnostic - run this on production server

echo "=== Quick WebSocket Diagnostic ==="
echo ""

# 1. Check if Redis has password
echo "1. Redis password status:"
if docker exec epsm_redis_prod redis-cli ping 2>&1 | grep -q "NOAUTH"; then
    echo "   ❌ Redis requires password but none provided"
elif docker exec epsm_redis_prod redis-cli ping 2>&1 | grep -q "PONG"; then
    echo "   ✅ Redis running WITHOUT password"
else
    echo "   ⚠️  Redis status unclear"
fi
echo ""

# 2. Check backend Redis connection
echo "2. Backend Redis connection:"
docker exec epsm_backend_prod python3 -c "
import redis
import os
pwd = os.getenv('REDIS_PASSWORD', '')
try:
    r = redis.Redis(host='redis', port=6379, password=pwd if pwd else None, socket_connect_timeout=3)
    r.ping()
    print('   ✅ Backend CAN connect to Redis')
except Exception as e:
    print(f'   ❌ Backend CANNOT connect: {e}')
" 2>&1
echo ""

# 3. Check if Daphne is running
echo "3. Daphne status:"
if docker exec epsm_backend_prod pgrep -f daphne > /dev/null; then
    echo "   ✅ Daphne is running"
else
    echo "   ❌ Daphne is NOT running"
fi
echo ""

# 4. Test WebSocket endpoint internally
echo "4. Internal WebSocket test:"
docker exec epsm_backend_prod curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    http://localhost:8000/ws/system-resources/ 2>&1 | {
    read code
    if [ "$code" = "101" ]; then
        echo "   ✅ WebSocket upgrade successful (HTTP 101)"
    else
        echo "   ❌ WebSocket upgrade failed (HTTP $code)"
    fi
}
echo ""

# 5. Check recent backend logs for errors
echo "5. Recent backend WebSocket errors:"
docker logs epsm_backend_prod --since 5m 2>&1 | grep -i "websocket\|channel\|redis" | tail -5 | sed 's/^/   /'
if [ $? -ne 0 ]; then
    echo "   (No errors found)"
fi
echo ""

echo "=== End Diagnostic ==="
