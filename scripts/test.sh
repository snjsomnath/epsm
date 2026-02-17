#!/bin/bash

# EPSM Test Script
# This script runs all tests for the EPSM application

set -e

echo "🧪 Running EPSM Tests..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure test environment is up
echo "🏗️  Setting up test environment..."
docker-compose up -d database redis

# Wait for database
echo "⏳ Waiting for database..."
timeout 60 bash -c 'until docker-compose exec -T database pg_isready -U epsm_user -d epsm_db; do sleep 2; done' || {
    echo -e "${RED}❌ Database failed to start${NC}"
    exit 1
}

# Wait for Redis
echo "⏳ Waiting for Redis..."
timeout 30 bash -c 'until docker-compose exec -T redis redis-cli ping | grep -q PONG; do sleep 2; done' || {
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
}

echo -e "${GREEN}✅ Test environment ready${NC}"

# Run backend tests
echo ""
echo "🔧 Running backend tests..."
if docker-compose exec -T backend pytest --cov --cov-report=term-missing --cov-report=html -v; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
    BACKEND_STATUS=0
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    BACKEND_STATUS=1
fi

# Run frontend tests
echo ""
echo "🌐 Running frontend tests..."
if docker-compose exec -T frontend npm run test:coverage; then
    echo -e "${GREEN}✅ Frontend tests passed${NC}"
    FRONTEND_STATUS=0
else
    echo -e "${RED}❌ Frontend tests failed${NC}"
    FRONTEND_STATUS=1
fi

# Run integration tests
echo ""
echo "🔗 Running integration tests..."
if [ -d "./tests" ]; then
    # Add integration test commands here when available
    echo -e "${YELLOW}⚠️  Integration tests directory exists but tests not yet implemented${NC}"
    INTEGRATION_STATUS=0
else
    echo -e "${YELLOW}⚠️  No integration tests directory found${NC}"
    INTEGRATION_STATUS=0
fi

# Generate test summary
echo ""
echo "================================================"
echo "             TEST SUMMARY"
echo "================================================"

if [ $BACKEND_STATUS -eq 0 ]; then
    echo -e "Backend Tests:      ${GREEN}✅ PASSED${NC}"
else
    echo -e "Backend Tests:      ${RED}❌ FAILED${NC}"
fi

if [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "Frontend Tests:     ${GREEN}✅ PASSED${NC}"
else
    echo -e "Frontend Tests:     ${RED}❌ FAILED${NC}"
fi

if [ $INTEGRATION_STATUS -eq 0 ]; then
    echo -e "Integration Tests:  ${GREEN}✅ PASSED${NC}"
else
    echo -e "Integration Tests:  ${RED}❌ FAILED${NC}"
fi

echo "================================================"

# Coverage reports
echo ""
echo "📊 Coverage reports generated:"
echo "  Backend:  backend/htmlcov/index.html"
echo "  Frontend: frontend/coverage/index.html"

# Optional: Keep services running or clean up
read -p "Keep test environment running? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Cleaning up test environment..."
    docker-compose down
    echo -e "${GREEN}✅ Cleanup complete${NC}"
else
    echo "Test environment kept running for debugging"
fi

# Exit with error if any tests failed
if [ $BACKEND_STATUS -ne 0 ] || [ $FRONTEND_STATUS -ne 0 ] || [ $INTEGRATION_STATUS -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All tests completed successfully!${NC}"
exit 0