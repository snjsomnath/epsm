-- Schema setup for materials database
-- This file is intentionally minimal to avoid conflicts with Django migrations

\c epsm_materials;

-- Grant all permissions to epsm_user for this database
GRANT ALL ON SCHEMA public TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_user;

-- Materials data will be imported separately after Django setup is complete