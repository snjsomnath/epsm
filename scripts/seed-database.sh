#!/bin/bash
set -e

echo "🌱 Seeding database with initial data..."

# Check if tables are empty before seeding
MATERIALS_COUNT=$(docker exec epsm_database_prod psql -U epsm_user -d epsm_materials -t -c "SELECT COUNT(*) FROM materials;" | tr -d ' ')
WINDOW_GLAZING_COUNT=$(docker exec epsm_database_prod psql -U epsm_user -d epsm_materials -t -c "SELECT COUNT(*) FROM window_glazing;" | tr -d ' ')
CONSTRUCTIONS_COUNT=$(docker exec epsm_database_prod psql -U epsm_user -d epsm_materials -t -c "SELECT COUNT(*) FROM constructions;" | tr -d ' ')
CONSTRUCTION_SETS_COUNT=$(docker exec epsm_database_prod psql -U epsm_user -d epsm_materials -t -c "SELECT COUNT(*) FROM construction_sets;" | tr -d ' ')

echo "📊 Current counts:"
echo "  Materials: $MATERIALS_COUNT"
echo "  Window Glazing: $WINDOW_GLAZING_COUNT"
echo "  Constructions: $CONSTRUCTIONS_COUNT"
echo "  Construction Sets: $CONSTRUCTION_SETS_COUNT"

# Seed window glazing if empty
if [ "$WINDOW_GLAZING_COUNT" -eq "0" ]; then
    echo "📦 Importing window glazing data..."
    docker exec -i epsm_database_prod psql -U epsm_user -d epsm_materials < /opt/epsm/database/exports/legacy/window_glazing_data_inserts_fixed.sql
    echo "✅ Window glazing data imported"
else
    echo "ℹ️  Window glazing already populated, skipping"
fi

# Seed constructions if empty
if [ "$CONSTRUCTIONS_COUNT" -eq "0" ]; then
    echo "📦 Importing constructions data..."
    docker exec -i epsm_database_prod psql -U epsm_user -d epsm_materials < /opt/epsm/database/exports/legacy/constructions_data_inserts.sql
    echo "✅ Constructions data imported"
else
    echo "ℹ️  Constructions already populated, skipping"
fi

# Seed construction sets if empty
if [ "$CONSTRUCTION_SETS_COUNT" -eq "0" ]; then
    echo "📦 Importing construction sets data..."
    docker exec -i epsm_database_prod psql -U epsm_user -d epsm_materials < /opt/epsm/database/exports/legacy/construction_sets_data_inserts.sql
    echo "✅ Construction sets data imported"
else
    echo "ℹ️  Construction sets already populated, skipping"
fi

echo "🎉 Database seeding complete!"
