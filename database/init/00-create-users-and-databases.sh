#!/bin/bash
set -e

# Create additional databases and users for EPSM
# This script runs as the postgres user with full privileges

echo "Creating EPSM databases and users..."

# Get passwords from environment variables with defaults
EPSM_PASSWORD="${POSTGRES_PASSWORD:-epsm_secure_password_change_this}"
RESULTS_PASSWORD="${RESULTS_DB_PASSWORD:-epsm_results_password}"

# Create epsm_materials database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE epsm_materials'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_materials')\\gexec
EOSQL

# Create epsm_results database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE epsm_results'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_results')\\gexec
EOSQL

# Create epsm_user database (needed for health checks)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE epsm_user'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_user')\\gexec
EOSQL

# Create epsm_user with proper permissions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'epsm_user') THEN
            CREATE USER epsm_user WITH PASSWORD '$EPSM_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Create epsm_results_user for results database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'epsm_results_user') THEN
            CREATE USER epsm_results_user WITH PASSWORD '$RESULTS_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

# Grant permissions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE epsm_db TO epsm_user;
    GRANT ALL PRIVILEGES ON DATABASE epsm_materials TO epsm_user;
    GRANT ALL PRIVILEGES ON DATABASE epsm_results TO epsm_user;
    GRANT ALL PRIVILEGES ON DATABASE epsm_user TO epsm_user;
    GRANT ALL PRIVILEGES ON DATABASE epsm_results TO epsm_results_user;
EOSQL

echo "EPSM databases and users created successfully!"