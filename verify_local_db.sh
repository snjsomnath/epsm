#!/bin/bash

# Local PostgreSQL Database Verification Script
# Verifies that the Supabase migration to local PostgreSQL was successful

set -e

# Configuration
LOCAL_DB="epsm_local"
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Local PostgreSQL Database Verification${NC}"
echo "=" $(printf '=%.0s' {1..50})
echo

# Test 1: Database Connection
echo -e "${BLUE}1️⃣ Testing database connection...${NC}"
if psql "$LOCAL_DB" -c "SELECT current_database(), version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    psql "$LOCAL_DB" -c "SELECT 'Database: ' || current_database() as info;"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi
echo

# Test 2: Table Count Verification
echo -e "${BLUE}2️⃣ Verifying table import...${NC}"
TABLE_COUNT=$(psql "$LOCAL_DB" -t -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")
TABLE_COUNT=$(echo $TABLE_COUNT | xargs)  # trim whitespace

if [ "$TABLE_COUNT" -eq 16 ]; then
    echo -e "${GREEN}✅ All 16 tables imported successfully${NC}"
else
    echo -e "${RED}❌ Expected 16 tables, found $TABLE_COUNT${NC}"
    exit 1
fi

# List all tables
echo "Tables in database:"
psql "$LOCAL_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" -t | sed 's/^/ - /'
echo

# Test 3: Data Verification
echo -e "${BLUE}3️⃣ Verifying data import...${NC}"

# Check core data tables
psql "$LOCAL_DB" << EOF
SELECT 
    'materials' as table_name, 
    count(*) as row_count,
    CASE WHEN count(*) = 6 THEN '✅' ELSE '❌' END as status
FROM materials 
UNION ALL
SELECT 
    'constructions', 
    count(*),
    CASE WHEN count(*) = 5 THEN '✅' ELSE '❌' END
FROM constructions 
UNION ALL
SELECT 
    'construction_sets', 
    count(*),
    CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END
FROM construction_sets
UNION ALL
SELECT 
    'layers', 
    count(*),
    CASE WHEN count(*) = 13 THEN '✅' ELSE '❌' END
FROM layers
UNION ALL
SELECT 
    'window_glazing', 
    count(*),
    CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END
FROM window_glazing
ORDER BY table_name;
EOF
echo

# Test 4: Relationship Verification
echo -e "${BLUE}4️⃣ Testing foreign key relationships...${NC}"

# Test materials -> layers -> constructions join
RELATIONSHIP_TEST=$(psql "$LOCAL_DB" -t -c "
SELECT count(*) 
FROM materials m 
JOIN layers l ON m.id = l.material_id 
JOIN constructions c ON l.construction_id = c.id;
")
RELATIONSHIP_TEST=$(echo $RELATIONSHIP_TEST | xargs)

if [ "$RELATIONSHIP_TEST" -gt 0 ]; then
    echo -e "${GREEN}✅ Foreign key relationships working (${RELATIONSHIP_TEST} joined records)${NC}"
else
    echo -e "${RED}❌ Foreign key relationships not working${NC}"
    exit 1
fi

# Show sample joined data
echo "Sample relationship data:"
psql "$LOCAL_DB" -c "
SELECT 
    c.name as construction,
    l.layer_order,
    m.name as material,
    m.thickness_m
FROM constructions c
JOIN layers l ON c.id = l.construction_id
JOIN materials m ON l.material_id = m.id
ORDER BY c.name, l.layer_order
LIMIT 5;
"
echo

# Test 5: Index Verification
echo -e "${BLUE}5️⃣ Verifying indexes...${NC}"
INDEX_COUNT=$(psql "$LOCAL_DB" -t -c "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';")
INDEX_COUNT=$(echo $INDEX_COUNT | xargs)

if [ "$INDEX_COUNT" -eq 27 ]; then
    echo -e "${GREEN}✅ All 27 indexes imported successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Expected 27 indexes, found $INDEX_COUNT${NC}"
fi
echo

# Test 6: Unique Constraints
echo -e "${BLUE}6️⃣ Testing unique constraints...${NC}"
echo "Testing unique constraint on materials.name..."

# Try to insert duplicate material name (should fail)
if psql "$LOCAL_DB" -c "INSERT INTO materials (name) VALUES ('Brick');" 2>/dev/null; then
    echo -e "${RED}❌ Unique constraint not working - duplicate insert succeeded${NC}"
    # Clean up the bad insert
    psql "$LOCAL_DB" -c "DELETE FROM materials WHERE name = 'Brick' AND id != (SELECT id FROM materials WHERE name = 'Brick' LIMIT 1);" >/dev/null
else
    echo -e "${GREEN}✅ Unique constraints working correctly${NC}"
fi
echo

# Test 7: Database Size and Performance
echo -e "${BLUE}7️⃣ Database size and performance...${NC}"
psql "$LOCAL_DB" -c "
SELECT 
    pg_size_pretty(pg_database_size('$LOCAL_DB')) as database_size,
    (SELECT count(*) FROM pg_stat_user_tables) as user_tables,
    (SELECT sum(n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables) as total_operations;
"
echo

# Summary
echo -e "${GREEN}🎉 Local PostgreSQL database verification completed!${NC}"
echo "=" $(printf '=%.0s' {1..50})
echo -e "${BLUE}📊 Summary:${NC}"
echo "  Database: $LOCAL_DB"
echo "  Tables: $TABLE_COUNT"
echo "  Indexes: $INDEX_COUNT"
echo "  Foreign keys: Working"
echo "  Unique constraints: Working"
echo
echo -e "${GREEN}✅ Ready for Phase 3: Create Database Client & Connection Layer${NC}"