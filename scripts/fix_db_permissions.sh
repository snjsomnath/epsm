#!/bin/bash
# Fix PostgreSQL 15+ schema permissions
# PostgreSQL 15 changed default public schema permissions for security

set -e

echo "Fixing PostgreSQL schema permissions for EPSM..."

# Fix permissions on all databases
for DB in epsm_db epsm_materials epsm_results; do
    echo "  - Fixing $DB..."
    docker-compose -f docker-compose.production.yml exec -T database psql -U epsm_user -d $DB <<-EOSQL
        -- Grant schema permissions
        GRANT ALL ON SCHEMA public TO epsm_user;
        GRANT ALL ON SCHEMA public TO PUBLIC;
        
        -- Make epsm_user owner of public schema
        ALTER SCHEMA public OWNER TO epsm_user;
        
        -- Grant default privileges for future tables
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_user;
EOSQL
done

# Also fix for results user on epsm_results
echo "  - Granting permissions to epsm_results_user on epsm_results..."
docker-compose -f docker-compose.production.yml exec -T database psql -U epsm_user -d epsm_results <<-EOSQL
    GRANT ALL ON SCHEMA public TO epsm_results_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_results_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_results_user;
EOSQL

echo "✓ Database permissions fixed!"
echo ""
echo "Now restart the backend to apply migrations:"
echo "  cd /opt/epsm && docker-compose -f docker-compose.production.yml restart backend celery_worker celery_beat"
