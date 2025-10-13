#!/bin/bash

# Test WebSocket connectivity for EPSM production
# This script checks if WebSocket connections are working properly

set -e

echo "=========================================="
echo "EPSM WebSocket Connectivity Test"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if backend container is running Daphne
echo "Test 1: Checking if Daphne ASGI server is running..."
if docker ps | grep -q epsm_backend_prod; then
    echo -e "${GREEN}✓${NC} Backend container is running"
    
    # Check if daphne process exists
    if docker exec epsm_backend_prod pgrep -f daphne > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Daphne process is running"
    else
        echo -e "${RED}✗${NC} Daphne process NOT found!"
        echo "  Backend may not be configured for WebSocket support"
    fi
else
    echo -e "${RED}✗${NC} Backend container NOT running"
    exit 1
fi
echo ""

# Test 2: Check Redis connectivity from backend
echo "Test 2: Checking Redis connectivity..."
if docker exec epsm_backend_prod sh -c "python -c 'import redis; r=redis.Redis(host=\"redis\", port=6379); r.ping(); print(\"OK\")'" 2>/dev/null | grep -q OK; then
    echo -e "${GREEN}✓${NC} Backend can connect to Redis"
else
    echo -e "${RED}✗${NC} Backend CANNOT connect to Redis"
    echo "  Channel layer will not work without Redis"
fi
echo ""

# Test 3: Check if channel layer is configured
echo "Test 3: Checking Django Channels configuration..."
CHANNEL_TEST=$(docker exec epsm_backend_prod python -c "
from django.conf import settings
import sys
if hasattr(settings, 'CHANNEL_LAYERS'):
    print('CONFIGURED')
else:
    print('NOT_CONFIGURED')
" 2>/dev/null)

if [ "$CHANNEL_TEST" = "CONFIGURED" ]; then
    echo -e "${GREEN}✓${NC} Channel layers are configured"
else
    echo -e "${RED}✗${NC} Channel layers NOT configured"
fi
echo ""

# Test 4: Check Nginx WebSocket proxy configuration
echo "Test 4: Checking Nginx WebSocket proxy..."
if docker exec epsm_nginx_prod grep -q "proxy_set_header Upgrade" /etc/nginx/nginx.conf 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Nginx has WebSocket upgrade headers"
else
    echo -e "${YELLOW}⚠${NC} Nginx may not have WebSocket proxy configured"
fi
echo ""

# Test 5: Test WebSocket connection from inside backend container
echo "Test 5: Testing WebSocket connection internally..."
TEST_RESULT=$(docker exec epsm_backend_prod sh -c "
python3 << 'PYEOF'
import asyncio
import websockets
import sys

async def test_ws():
    try:
        # Test connection to localhost (backend itself)
        async with websockets.connect('ws://localhost:8000/ws/simulation-progress/test-id/', timeout=5) as ws:
            print('CONNECTED')
            return True
    except Exception as e:
        print(f'FAILED: {e}')
        return False

asyncio.run(test_ws())
PYEOF
" 2>&1)

if echo "$TEST_RESULT" | grep -q "CONNECTED"; then
    echo -e "${GREEN}✓${NC} WebSocket endpoint is accessible internally"
elif echo "$TEST_RESULT" | grep -q "websockets"; then
    echo -e "${YELLOW}⚠${NC} websockets library not installed, trying alternative test"
else
    echo -e "${RED}✗${NC} WebSocket endpoint not accessible"
    echo "  Error: $TEST_RESULT"
fi
echo ""

# Test 6: Check backend logs for WebSocket errors
echo "Test 6: Checking recent backend logs for WebSocket errors..."
WS_ERRORS=$(docker logs epsm_backend_prod --since 10m 2>&1 | grep -i "websocket\|channel\|daphne" | tail -5)
if [ -z "$WS_ERRORS" ]; then
    echo -e "${GREEN}✓${NC} No recent WebSocket errors in logs"
else
    echo -e "${YELLOW}⚠${NC} Recent WebSocket-related logs:"
    echo "$WS_ERRORS"
fi
echo ""

# Test 7: Check if port 8000 is listening
echo "Test 7: Checking if backend is listening on port 8000..."
if docker exec epsm_backend_prod netstat -tln 2>/dev/null | grep -q ":8000"; then
    echo -e "${GREEN}✓${NC} Backend is listening on port 8000"
else
    if docker exec epsm_backend_prod ss -tln 2>/dev/null | grep -q ":8000"; then
        echo -e "${GREEN}✓${NC} Backend is listening on port 8000"
    else
        echo -e "${RED}✗${NC} Backend NOT listening on port 8000"
    fi
fi
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "If all tests pass but WebSocket still fails:"
echo "1. Check browser console for detailed error"
echo "2. Verify SSL certificate is valid"
echo "3. Check if firewall is blocking WebSocket"
echo "4. Review Nginx error logs: docker logs epsm_nginx_prod"
echo "5. Review backend logs: docker logs epsm_backend_prod"
echo ""
echo "To test WebSocket from browser console:"
echo "  const ws = new WebSocket('wss://epsm.chalmers.se/ws/simulation-progress/test/');"
echo "  ws.onopen = () => console.log('Connected');"
echo "  ws.onerror = (e) => console.error('Error:', e);"
echo ""
