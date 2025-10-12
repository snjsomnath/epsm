#!/bin/bash
# Complete cleanup and rebuild script for EPSM
# Preserves EnergyPlus image while cleaning everything else

set -e

echo "========================================="
echo "EPSM Complete Cleanup and Rebuild"
echo "========================================="
echo ""

# Change to EPSM directory
cd /opt/epsm

echo "Step 1: Stopping all EPSM containers..."
docker-compose down -v
echo "   ✓ Containers stopped and volumes removed"
echo ""

echo "Step 2: Identifying EnergyPlus images to preserve..."
ENERGYPLUS_IMAGES=$(docker images | grep -i energyplus | awk '{print $1":"$2}' || echo "")
if [ -z "$ENERGYPLUS_IMAGES" ]; then
    echo "   ⚠ No EnergyPlus images found"
else
    echo "   Found EnergyPlus images to preserve:"
    echo "$ENERGYPLUS_IMAGES" | while read img; do
        echo "     - $img"
    done
fi
echo ""

echo "Step 3: Removing EPSM images..."
# Remove epsm-specific images
docker images | grep "epsm" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
echo "   ✓ EPSM images removed"
echo ""

echo "Step 4: Pruning Docker system (preserving EnergyPlus)..."
# Get EnergyPlus image IDs to exclude from pruning
ENERGYPLUS_IDS=$(docker images | grep -i energyplus | awk '{print $3}' | tr '\n' ' ' || echo "")

# Prune unused images, containers, networks (but not volumes we might need)
docker container prune -f
docker network prune -f

# Prune images but try to keep energyplus
if [ -n "$ENERGYPLUS_IDS" ]; then
    echo "   Pruning images while preserving EnergyPlus..."
    # Tag energyplus images to ensure they're not pruned
    for img in $ENERGYPLUS_IMAGES; do
        docker tag $img ${img}_preserve 2>/dev/null || true
    done
    docker image prune -a -f
    # Restore original tags
    for img in $ENERGYPLUS_IMAGES; do
        docker tag ${img}_preserve $img 2>/dev/null || true
        docker rmi ${img}_preserve 2>/dev/null || true
    done
else
    echo "   No EnergyPlus images to preserve, pruning all unused images..."
    docker image prune -a -f
fi

echo "   ✓ Docker system pruned"
echo ""

echo "Step 5: Clearing build cache..."
docker builder prune -a -f
echo "   ✓ Build cache cleared"
echo ""

echo "Step 6: Verifying EnergyPlus images..."
if docker images | grep -i energyplus > /dev/null; then
    echo "   ✓ EnergyPlus images preserved:"
    docker images | grep -i energyplus
else
    echo "   ⚠ No EnergyPlus images found (may need to pull/build)"
fi
echo ""

echo "Step 7: Rebuilding EPSM services..."
echo "   Building backend..."
docker-compose build --no-cache backend
echo ""
echo "   Building frontend..."
docker-compose build --no-cache frontend
echo ""
echo "   Building nginx..."
docker-compose build --no-cache nginx
echo "   ✓ All services rebuilt"
echo ""

echo "Step 8: Starting EPSM services..."
docker-compose up -d
echo "   ✓ Services started"
echo ""

echo "Step 9: Checking service status..."
docker-compose ps
echo ""

echo "Step 10: Restarting Portainer monitoring..."
cd /opt/monitoring
echo "   Stopping Portainer..."
docker-compose down
echo "   Starting Portainer..."
docker-compose up -d
echo "   ✓ Portainer restarted"
echo ""

cd /opt/epsm

echo "========================================="
echo "Cleanup and Rebuild Complete!"
echo "========================================="
echo ""
echo "Service Status:"
docker-compose ps
echo ""
echo "Next steps:"
echo "1. Check logs: docker-compose logs -f backend"
echo "2. Run migration test: ./test_migrations.sh"
echo "3. Access application: https://epsm.chalmers.se"
echo "4. Access Portainer: Check /opt/monitoring/README.md for URL"
echo ""
