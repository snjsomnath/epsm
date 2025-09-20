#!/bin/bash

# EPSM Stop Script
# This script stops all EPSM services

set -e

echo "🛑 Stopping EPSM Application..."

# Stop all services
docker-compose down

# Optional: Remove volumes (uncomment if you want to reset data)
# echo "🗑️  Removing volumes..."
# docker-compose down -v

echo "✅ EPSM Application stopped successfully!"

# Show remaining containers (should be empty)
echo "📊 Remaining containers:"
docker-compose ps