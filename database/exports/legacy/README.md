This folder contains legacy SQL insert/dump files that were previously located in the project root.

Why moved here
- These files are duplicates or smaller extracts from the canonical Supabase exports.
- They were moved to keep the repository root tidy and to avoid confusion during migrations.

Canonical exports
- The canonical full exports are in `../` (one level up): `supabase_complete_20250917_123643.sql`, `supabase_schema_20250917_123643.sql`, and `supabase_data_20250917_123643.sql`.

Usage
- If you need to re-import or inspect these legacy inserts, use `psql` or your preferred Postgres client.

If any of these files are still required by scripts, please update the scripts to reference files in `database_exports/legacy/` or move the necessary files back to the appropriate location.
