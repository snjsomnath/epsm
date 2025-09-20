-- Data import placeholder for materials database
-- This file is intentionally minimal to avoid conflicts

\c epsm_materials;

-- Data import will be handled separately after the application is running
-- To import your existing data later, run:
-- docker-compose exec database psql -U epsm_user -d epsm_materials -c "-- your import commands here"