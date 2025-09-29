# Setting up a dedicated `results` Postgres database

---
title: Results DB Setup
layout: default
---

This project can use a dedicated PostgreSQL database for simulation results/time-series. A new database alias `results_db` is added to `backend/config/settings.py` and the DB router will direct simulation result models to this database.

This document explains how to provision the DB (locally or in Docker), run migrations for the new DB, and optionally migrate existing data.

Steps

1. Provision a Postgres instance reachable from the Django backend. If using Docker Compose, add a service named `results_db` (or reuse the existing `database` service and expose another DB name). Example snippet to add to `docker-compose.yml` (adapt names/credentials):

```yaml
services:
  results-db:
    image: postgres:15
    environment:
      POSTGRES_DB: epsm_results
      POSTGRES_USER: epsm_results_user
      POSTGRES_PASSWORD: changeme
    volumes:
      - results_db_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"  # optional local port mapping

volumes:
  results_db_data:
```

2. Set environment variables (locally or in your `.env`) to point Django at the new DB. Keys introduced in `settings.py`:

- RESULTS_DB_NAME (default: epsm_results)
- RESULTS_DB_USER (default: epsm_results_user)
- RESULTS_DB_PASSWORD
- RESULTS_DB_HOST (default: database)
- RESULTS_DB_PORT (default: 5432)

3. Run migrations specifically to the results DB. From the repository root:

```bash
# Use the project's Python env - adapt if using docker
cd backend
python manage.py migrate --database=results_db
```

This will create the tables for the `simulation` app models that have been routed to `results_db`.

4. (Optional) Migrate existing data from `default` to `results_db` if you already have results in the default DB. Two common approaches:

- Using `pg_dump`/`pg_restore` or `pg_dump --data-only` to export relevant tables from the default DB and import them into the new results DB. This requires network access and careful handling of sequences and constraints.

- Using `manage.py dumpdata` and `loaddata`:

```bash
# Dump only simulation app data
python manage.py dumpdata simulation --indent 2 > simulation_data.json
# Load into results_db
python manage.py loaddata simulation_data.json --database=results_db
```

Note: The `loaddata` approach may require editing PKs or relationships if the Simulation objects remain in `default` while SimulationResult objects are moved to `results_db`. Because relations across databases are not supported, you might need to: keep `Simulation` in default and only move result rows that reference `simulation_id` values that already exist in the results_db (or change the FK to a plain UUID and remove cross-db FK constraints). Plan carefully and test on a staging DB first.

5. Update docker-compose and deployment docs: ensure the `results_db` service is created and env vars are set for production.

Quick note: `scripts/start.sh` automation

- The development `./scripts/start.sh` can now help with provisioning and initializing the results DB in Docker setups. When run in the default development environment it will:
  - Wait for the primary database to be ready and then attempt to create the `epsm_results` database and `epsm_results_user` role if they are missing (idempotent).
  - Run migrations for the `results_db` when the `RESULTS_DB_*` environment variables are set (the script exports these for the migration command in the development flow).

Use `./scripts/start.sh` for a quick development workflow that includes results DB setup, or follow the manual steps above for custom provisioning.

6. Confirm behavior

- Start the backend and run a sample simulation. Verify that new rows for `simulation_results`, `simulation_zones`, and `simulation_energy_uses` appear in the `results_db` Postgres instance.
- Verify queries via Django shell:

```bash
python manage.py shell
>>> from simulation.models import SimulationResult
>>> SimulationResult.objects.using('results_db').count()
```

Notes and caveats

- Cross-database ForeignKey relations are not supported by Django. The router is configured to route SimulationResult and its dependent models to `results_db`, but the `Simulation` model remains in the `default` DB. That means you cannot rely on database-level FK enforcement across DBs. The current design keeps `simulation` in `default` while placing results in `results_db`. This works but be aware of referential integrity limitations.

- If you need strong referential integrity, consider moving the `Simulation` model itself into `results_db` (more invasive), or store `simulation_id` as a plain UUID on the result rows instead of a ForeignKey.

- Tests should be updated to create and tear down data in the `results_db` when exercising results functionality.

If you'd like, I can also:

- Add a docker-compose service and environment variable examples to the repo.
- Create migration files or tweak models to use a UUID field (instead of FK) for cross-db references to avoid cross-db FK restrictions.

Ask which of these you'd like me to implement next.
