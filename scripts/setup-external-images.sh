#!/bin/bash
# EPSM Setup Script - Ensures all required external images are available

set -e

echo "🔧 EPSM Setup: Pulling required external Docker images..."

# List of external images required by EPSM
EXTERNAL_IMAGES=(
    "nrel/energyplus:23.2.0"
    "redis:7-alpine"
    "postgres:15-alpine"
    "nginx:alpine"
    "node:18-alpine"
    "python:3.11-slim"
)

# Pull each external image
for image in "${EXTERNAL_IMAGES[@]}"; do
    echo "📦 Pulling $image..."
    docker pull "$image"
done

echo "✅ All external images are now available!"
echo ""
echo "🚀 You can now run:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "💡 Tip: Run this script after 'docker system prune' to restore external dependencies"