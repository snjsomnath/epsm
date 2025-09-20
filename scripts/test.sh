#!/bin/bash

# EPSM Test Script
# This script runs all tests for the EPSM application

set -e

echo "🧪 Running EPSM Tests..."

# Ensure test environment is up
echo "🏗️  Setting up test environment..."
docker-compose up -d database redis

# Wait for database
echo "⏳ Waiting for database..."
until docker-compose exec -T database pg_isready -U epsm_user -d epsm_db; do
    sleep 2
done

# Run backend tests
echo "🔧 Running backend tests..."
docker-compose exec backend python manage.py test --parallel --keepdb

# Run frontend tests
echo "🌐 Running frontend tests..."
docker-compose exec frontend npm test -- --run --reporter=verbose

# Run integration tests
echo "🔗 Running integration tests..."
if [ -d "./tests" ]; then
    # Add integration test commands here
    echo "   Integration tests would run here"
fi

# Cleanup
echo "🧹 Cleaning up test environment..."
docker-compose down

echo "✅ All tests completed successfully!"