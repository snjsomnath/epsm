#!/bin/bash

# Test WebSocket connections to production server
# Run this from your local machine

echo "=========================================="
echo "EPSM Production WebSocket Live Test"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROD_URL="epsm.chalmers.se"

echo -e "${BLUE}Testing WebSocket endpoints on ${PROD_URL}...${NC}"
echo ""

# Test 1: System Resources WebSocket
echo -e "${BLUE}Test 1:${NC} Testing /ws/system-resources/"
echo "Command: websocat wss://${PROD_URL}/ws/system-resources/"
echo ""

if command -v websocat &> /dev/null; then
    timeout 5 websocat -n1 wss://${PROD_URL}/ws/system-resources/ 2>&1 | head -5 || echo "Connection failed or timeout"
else
    echo -e "${YELLOW}⚠ websocat not installed. Install with: brew install websocat${NC}"
    echo "Testing with curl instead..."
    curl -i -N \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
        https://${PROD_URL}/ws/system-resources/ 2>&1 | head -20
fi
echo ""

# Test 2: Simulation Progress WebSocket
echo -e "${BLUE}Test 2:${NC} Testing /ws/simulation-progress/test-id/"
echo ""

if command -v websocat &> /dev/null; then
    timeout 5 websocat -n1 wss://${PROD_URL}/ws/simulation-progress/test-id/ 2>&1 | head -5 || echo "Connection failed or timeout"
else
    echo "Testing with curl..."
    curl -i -N \
        -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Version: 13" \
        -H "Sec-WebSocket-Key: $(openssl rand -base64 16)" \
        https://${PROD_URL}/ws/simulation-progress/test-id/ 2>&1 | head -20
fi
echo ""

echo "=========================================="
echo "SSH to server for detailed diagnostics:"
echo "=========================================="
echo ""
echo "ssh ssanjay@${PROD_URL} 'cd /opt/epsm && bash scripts/test-websocket.sh'"
echo ""
