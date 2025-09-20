-- Create additional database and user for EPSM
-- Note: epsm_db is already created by POSTGRES_DB environment variable

-- Create epsm_materials database for materials data
SELECT 'CREATE DATABASE epsm_materials'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'epsm_materials')\gexec

-- Create epsm_user with proper permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'epsm_user') THEN
        CREATE USER epsm_user WITH PASSWORD 'epsm_secure_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE epsm_db TO epsm_user;
GRANT ALL PRIVILEGES ON DATABASE epsm_materials TO epsm_user;