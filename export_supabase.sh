#!/bin/bash

# Supabase Database Export Script
# This script exports your Supabase database schema and data for migration to local PostgreSQL

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

# Check if PostgreSQL client tools are available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found. Adding PostgreSQL to PATH...${NC}"
    export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"
    
    if ! command -v pg_dump &> /dev/null; then
        echo -e "${RED}❌ PostgreSQL client tools not found. Please install them:${NC}"
        echo "   brew install postgresql"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL client tools found${NC}"
echo

# Create export directory
mkdir -p "$EXPORT_DIR"

# Prompt for database password
echo -e "${YELLOW}🔑 You'll need your Supabase database password.${NC}"
echo "   You can find this in your Supabase Dashboard > Settings > Database"
echo "   Look for 'Database password' or 'Password'"
echo
read -s -p "Enter your Supabase database password: " DB_PASSWORD
echo

# Construct database connection URL
DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Test connection
echo -e "${BLUE}🔍 Testing database connection...${NC}"
if ! psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to connect to database. Please check your password and try again.${NC}"
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
    --file="$COMPLETE_DUMP"

echo -e "${GREEN}✅ Complete database exported to: ${COMPLETE_DUMP}${NC}"

# Export schema only
echo -e "${BLUE}📤 Exporting schema only...${NC}"
SCHEMA_DUMP="${EXPORT_DIR}/supabase_schema_${TIMESTAMP}.sql"

pg_dump "$DB_URL" \
    --schema-only \
    --verbose \
    --clean \
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
    --file="$SCHEMA_DUMP"

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
    --file="$DATA_DUMP"

echo -e "${GREEN}✅ Data exported to: ${DATA_DUMP}${NC}"

# Get table information
echo -e "${BLUE}📋 Gathering table information...${NC}"
TABLE_LIST="${EXPORT_DIR}/table_list_${TIMESTAMP}.txt"

psql "$DB_URL" -c "
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
" > "$TABLE_LIST"

echo -e "${GREEN}✅ Table information saved to: ${TABLE_LIST}${NC}"

# Create export summary
SUMMARY_FILE="${EXPORT_DIR}/export_summary_${TIMESTAMP}.md"
cat > "$SUMMARY_FILE" << EOF
# Supabase Database Export Summary

**Export Date:** $(date)
**Source Project:** ${PROJECT_REF}
**Source URL:** ${SUPABASE_URL}

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

4. **Table Information:** \`$(basename "$TABLE_LIST")\`
   - List of all exported tables with metadata

## Tables Exported

The following tables from the 'public' schema were exported:

$(psql "$DB_URL" -t -c "SELECT '- ' || tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")

## Notes

- **Authentication data is NOT included** (auth schema excluded)
- **Row Level Security policies need manual recreation**
- **Functions and triggers may need manual migration**
- **File storage data is not included** (storage schema excluded)

## Next Steps

1. Install PostgreSQL locally
2. Create new database: \`createdb epsm_local\`
3. Import schema: \`psql epsm_local < $(basename "$COMPLETE_DUMP")\`
4. Update application configuration
5. Test database connectivity

## Migration Checklist

- [ ] Local PostgreSQL installed
- [ ] Database created and imported
- [ ] Application configuration updated
- [ ] Authentication system replaced
- [ ] Real-time subscriptions replaced
- [ ] All database functions tested
- [ ] RLS policies recreated (if needed)
EOF

echo -e "${GREEN}✅ Export summary created: ${SUMMARY_FILE}${NC}"

# Show summary
echo
echo -e "${GREEN}🎉 Export completed successfully!${NC}"
echo "=" $(printf '=%.0s' {1..50})
echo -e "${BLUE}📁 All files saved to: ${EXPORT_DIR}/${NC}"
echo
echo "Files created:"
echo "  📄 $(basename "$COMPLETE_DUMP") - Complete database"
echo "  📄 $(basename "$SCHEMA_DUMP") - Schema only"  
echo "  📄 $(basename "$DATA_DUMP") - Data only"
echo "  📄 $(basename "$TABLE_LIST") - Table information"
echo "  📄 $(basename "$SUMMARY_FILE") - Export summary"
echo
echo -e "${YELLOW}📖 Next: Read the export summary for next steps!${NC}"