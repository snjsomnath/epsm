-- Single database setup for EPSM
-- Note: epsm_db is already created by POSTGRES_DB environment variable
-- This file ensures proper permissions are set

-- Grant all permissions to epsm_user
GRANT ALL PRIVILEGES ON DATABASE epsm_db TO epsm_user;
GRANT ALL ON SCHEMA public TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_user;