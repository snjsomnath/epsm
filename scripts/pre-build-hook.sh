#!/bin/bash
# Pre-build hook to ensure external dependencies are available

echo "🔧 Pre-build: Ensuring external dependencies..."

# Pull EnergyPlus if not available
if ! docker image inspect nrel/energyplus:23.2.0 >/dev/null 2>&1; then
    echo "📦 Pulling EnergyPlus Docker image..."
    docker pull nrel/energyplus:23.2.0
else
    echo "✅ EnergyPlus image already available"
fi

echo "✅ External dependencies ready!"