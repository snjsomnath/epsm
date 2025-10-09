-- Create additional databases and users for EPSM
-- Note: epsm_db is already created by POSTGRES_DB environment variable

-- Create epsm_materials database for materials data
SELECT 'CREATE DATABASE epsm_materials'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_materials')\gexec

-- Create epsm_results database for simulation results
SELECT 'CREATE DATABASE epsm_results'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_results')\gexec

-- Create epsm_user database (needed for health checks)
SELECT 'CREATE DATABASE epsm_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_user')\gexec

-- Create epsm_user with proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'epsm_user') THEN
        EXECUTE format('CREATE USER epsm_user WITH PASSWORD %L', coalesce(nullif(current_setting('custom.postgres_password', true), ''), 'epsm_secure_password_change_this'));
    END IF;
END
$$;

-- Create epsm_results_user for results database
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'epsm_results_user') THEN
        EXECUTE format('CREATE USER epsm_results_user WITH PASSWORD %L', coalesce(nullif(current_setting('custom.results_db_password', true), ''), 'epsm_results_password'));
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE epsm_db TO epsm_user;
GRANT ALL PRIVILEGES ON DATABASE epsm_materials TO epsm_user;
GRANT ALL PRIVILEGES ON DATABASE epsm_results TO epsm_user;
GRANT ALL PRIVILEGES ON DATABASE epsm_user TO epsm_user;
GRANT ALL PRIVILEGES ON DATABASE epsm_results TO epsm_results_user;