-- Single database schema setup for EPSM
-- All tables (simulation, materials, results) are in the epsm_db database
-- Schema is managed by Django migrations

\c epsm_db;

-- Ensure epsm_user has all necessary permissions
GRANT ALL ON SCHEMA public TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO epsm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO epsm_user;