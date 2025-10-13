#!/bin/bash
set -e

# Single database setup for EPSM
# This script runs as the postgres user with full privileges

echo "Setting up EPSM single database..."

# Get password from environment variable with default
EPSM_PASSWORD="${POSTGRES_PASSWORD:-epsm_secure_password_change_this}"

# Note: epsm_db is already created by POSTGRES_DB environment variable
# We just need to ensure the user has proper permissions

# Grant full permissions to epsm_user on the database
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE epsm_db TO epsm_user;
    GRANT ALL ON SCHEMA public TO epsm_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_user;
EOSQL

echo "EPSM single database setup complete!"