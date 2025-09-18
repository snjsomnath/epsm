#!/bin/bash

# Supabase Database Export Script - Updated with Working Connection
# Direct database dump using the verified connection format

set -e  # Exit on any error

# Configuration
PROJECT_REF="jekcbvnxzaykttmrmfgb"
SUPABASE_URL="https://jekcbvnxzaykttmrmfgb.supabase.co"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="database_exports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Supabase Database Export${NC}"
echo "=" $(printf '=%.0s' {1..50})
echo -e "${BLUE}📊 Project: ${PROJECT_REF}${NC}"
echo -e "${BLUE}🔗 Source: ${SUPABASE_URL}${NC}"
echo

# Add PostgreSQL 15 to PATH (matching Supabase server version)
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Check if PostgreSQL client tools are available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client tools not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL client tools found${NC}"

# Create export directory
mkdir -p "$EXPORT_DIR"

# Check if we have saved connection details
if [ -f ".db_connection_test" ]; then
    source .db_connection_test
    echo -e "${GREEN}✅ Using saved connection details${NC}"
    DB_URL="$WORKING_DB_URL"
else
    # Prompt for database password
    echo -e "${YELLOW}🔑 Enter your Supabase database password:${NC}"
    read -s -p "Password: " DB_PASSWORD
    echo
    
    # Use the working format from our test
    DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
fi

# Test connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if ! psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Run ./test_db_connection.sh first to verify your connection"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"
echo

# Export complete database (schema + data) - excluding Supabase internal schemas
echo -e "${BLUE}📤 Exporting complete database (schema + data)...${NC}"
COMPLETE_DUMP="${EXPORT_DIR}/supabase_complete_${TIMESTAMP}.sql"

pg_dump "$DB_URL" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --exclude-schema=auth \
    --exclude-schema=storage \
    --exclude-schema=realtime \
    --exclude-schema=supabase_functions \
    --exclude-schema=extensions \
    --exclude-schema=graphql \
    --exclude-schema=graphql_public \
    --exclude-schema=pgbouncer \
    --exclude-schema=pgsodium \
    --exclude-schema=pgsodium_masks \
    --exclude-schema=supabase_migrations \
    --exclude-schema=vault \
    --exclude-schema=net \
    --exclude-schema=information_schema \
    --exclude-schema=pg_catalog \
    --file="$COMPLETE_DUMP" 2>/dev/null

echo -e "${GREEN}✅ Complete database exported to: ${COMPLETE_DUMP}${NC}"

# Export schema only
echo -e "${BLUE}📤 Exporting schema only...${NC}"
SCHEMA_DUMP="${EXPORT_DIR}/supabase_schema_${TIMESTAMP}.sql"

pg_dump "$DB_URL" \
    --schema-only \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --exclude-schema=auth \
    --exclude-schema=storage \
    --exclude-schema=realtime \
    --exclude-schema=supabase_functions \
    --exclude-schema=extensions \
    --exclude-schema=graphql \
    --exclude-schema=graphql_public \
    --exclude-schema=pgbouncer \
    --exclude-schema=pgsodium \
    --exclude-schema=pgsodium_masks \
    --exclude-schema=supabase_migrations \
    --exclude-schema=vault \
    --exclude-schema=net \
    --exclude-schema=information_schema \
    --exclude-schema=pg_catalog \
    --file="$SCHEMA_DUMP" 2>/dev/null

echo -e "${GREEN}✅ Schema exported to: ${SCHEMA_DUMP}${NC}"

# Export data only
echo -e "${BLUE}📤 Exporting data only...${NC}"
DATA_DUMP="${EXPORT_DIR}/supabase_data_${TIMESTAMP}.sql"

pg_dump "$DB_URL" \
    --data-only \
    --verbose \
    --no-owner \
    --no-privileges \
    --exclude-schema=auth \
    --exclude-schema=storage \
    --exclude-schema=realtime \
    --exclude-schema=supabase_functions \
    --exclude-schema=extensions \
    --exclude-schema=graphql \
    --exclude-schema=graphql_public \
    --exclude-schema=pgbouncer \
    --exclude-schema=pgsodium \
    --exclude-schema=pgsodium_masks \
    --exclude-schema=supabase_migrations \
    --exclude-schema=vault \
    --exclude-schema=net \
    --exclude-schema=information_schema \
    --exclude-schema=pg_catalog \
    --file="$DATA_DUMP" 2>/dev/null

echo -e "${GREEN}✅ Data exported to: ${DATA_DUMP}${NC}"

# Get detailed table information
echo -e "${BLUE}📋 Gathering detailed table information...${NC}"
TABLE_INFO="${EXPORT_DIR}/table_info_${TIMESTAMP}.sql"

psql "$DB_URL" << EOF > "$TABLE_INFO"
-- Table Information Export
-- Generated: $(date)

-- List all tables with row counts
SELECT 
    schemaname,
    tablename,
    tableowner,
    (SELECT count(*) FROM information_schema.tables t2 WHERE t2.table_schema = schemaname AND t2.table_name = tablename) as table_count
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Column information for each table
EOF

# Add row counts for each table
for table in $(psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"); do
    table=$(echo $table | xargs)  # trim whitespace
    if [ ! -z "$table" ]; then
        echo "-- Row count for $table" >> "$TABLE_INFO"
        psql "$DB_URL" -c "SELECT '$table' as table_name, count(*) as row_count FROM $table;" >> "$TABLE_INFO" 2>/dev/null || echo "-- Error counting rows in $table" >> "$TABLE_INFO"
        echo "" >> "$TABLE_INFO"
    fi
done

echo -e "${GREEN}✅ Table information saved to: ${TABLE_INFO}${NC}"

# Create export summary
SUMMARY_FILE="${EXPORT_DIR}/export_summary_${TIMESTAMP}.md"
cat > "$SUMMARY_FILE" << EOF
# Supabase Database Export Summary

**Export Date:** $(date)
**Source Project:** ${PROJECT_REF}
**Source URL:** ${SUPABASE_URL}
**Connection Format:** Direct database (Format 2)

## Exported Files

1. **Complete Database:** \`$(basename "$COMPLETE_DUMP")\`
   - Contains both schema and data
   - Ready for direct import to PostgreSQL
   - Excludes Supabase internal schemas

2. **Schema Only:** \`$(basename "$SCHEMA_DUMP")\`
   - Database structure without data
   - Useful for creating empty database

3. **Data Only:** \`$(basename "$DATA_DUMP")\`
   - Data without schema
   - Use after schema is created

4. **Table Information:** \`$(basename "$TABLE_INFO")\`
   - Detailed table information with row counts

## Tables Exported

The following tables from the 'public' schema were exported:

$(psql "$DB_URL" -t -c "SELECT '- ' || tablename || ' (' || (SELECT count(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') || ' columns)' FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null)

## Database Statistics

$(psql "$DB_URL" -c "SELECT 'Total tables: ' || count(*) FROM pg_tables WHERE schemaname = 'public';" -t 2>/dev/null)

## Notes

- **Authentication data is NOT included** (auth schema excluded)
- **Row Level Security policies need manual recreation**
- **Functions and triggers may need manual migration**
- **File storage data is not included** (storage schema excluded)
- **Connection format:** Direct database connection (not pooler)

## Next Steps

1. Install PostgreSQL locally: \`brew install postgresql\`
2. Start PostgreSQL: \`brew services start postgresql\`
3. Create new database: \`createdb epsm_local\`
4. Import schema and data: \`psql epsm_local < $(basename "$COMPLETE_DUMP")\`
5. Update application configuration
6. Test database connectivity

## Migration Checklist

- [ ] Local PostgreSQL installed and running
- [ ] Database created and imported
- [ ] Application configuration updated
- [ ] Authentication system replaced
- [ ] Real-time subscriptions replaced
- [ ] All database functions tested
- [ ] RLS policies recreated (if needed)

## File Sizes

$(ls -lh "$EXPORT_DIR"/*"$TIMESTAMP"* | awk '{print "- " $9 ": " $5}' | sed 's|.*/||')
EOF

echo -e "${GREEN}✅ Export summary created: ${SUMMARY_FILE}${NC}"

# Show final summary
echo
echo -e "${GREEN}🎉 Export completed successfully!${NC}"
echo "=" $(printf '=%.0s' {1..50})
echo -e "${BLUE}📁 All files saved to: ${EXPORT_DIR}/${NC}"
echo
echo "Files created:"
echo "  📄 $(basename "$COMPLETE_DUMP") - Complete database"
echo "  📄 $(basename "$SCHEMA_DUMP") - Schema only"  
echo "  📄 $(basename "$DATA_DUMP") - Data only"
echo "  📄 $(basename "$TABLE_INFO") - Table information"
echo "  📄 $(basename "$SUMMARY_FILE") - Export summary"
echo
echo -e "${YELLOW}📖 Next: Read ${SUMMARY_FILE} for detailed next steps!${NC}"
echo -e "${GREEN}✅ Phase 1 (Export) completed successfully!${NC}"