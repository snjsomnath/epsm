# Repository Organization

This document describes the clean organization structure implemented for the EPSM repository.

## Directory Structure

```
epsm/
├── backend/              # Django backend application
├── frontend/             # React frontend application
├── src/                  # Additional source files
├── configs/              # Configuration files (organized)
│   ├── eslint.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.js
│   └── vite.config.ts
├── tests/                # All test files
│   ├── test-api.mjs
│   ├── test-postgres.mjs
│   ├── test_auth.mjs
│   ├── test_building.idf
│   ├── test_connection.mjs
│   ├── test_docker_integration.py
│   ├── test_postgres_client.mjs
│   ├── test_simple.epw
│   ├── test_simple.idf
│   └── test_weather.epw
├── docs/                 # All documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── ORGANIZATION.md
│   ├── PHASE_3_COMPLETE.md
│   ├── README.md
│   └── RESTRUCTURE_PLAN.md
├── scripts/              # Shell scripts and utilities
│   ├── backup.sh
│   ├── deploy.sh
│   ├── restore.sh
│   ├── start-epsm.sh
│   ├── start.sh
│   ├── status-epsm.sh
│   ├── stop-epsm.sh
│   ├── stop.sh
│   ├── test.sh
│   └── verify_local_db.sh
├── database/             # Database related files
│   ├── migrations/       # SQL migration files
│   │   ├── 001_create_auth_system.sql
│   │   └── 002_fix_foreign_keys.sql
│   └── ...
├── database_exports/     # Database export files
└── ...                  # Other essential files remain in root
```

## Configuration Files

Configuration files are now organized in the `configs/` directory but are symlinked to the root directory for tool compatibility:

- `tsconfig.json` → `configs/tsconfig.json`
- `vite.config.ts` → `configs/vite.config.ts`
- `tailwind.config.js` → `configs/tailwind.config.js`
- `postcss.config.js` → `configs/postcss.config.js`
- `eslint.config.js` → `configs/eslint.config.js`

This approach keeps the root directory clean while maintaining compatibility with build tools that expect configuration files in the root.

## Changes Made

1. **Test Files**: All `test_*` and `test-*` files moved to `tests/` directory
2. **Documentation**: All `*.md` files moved to `docs/` directory  
3. **Configuration**: All config files moved to `configs/` with symlinks in root
4. **Scripts**: All `*.sh` files moved to `scripts/` directory
5. **Database Migrations**: Consolidated under `database/migrations/`
6. **Cleanup**: Removed temporary files (`*.log`, `cookies.txt`)

## Benefits

- **Cleaner Root**: Essential files only in root directory
- **Organized Structure**: Related files grouped logically
- **Tool Compatibility**: Symlinks maintain tool functionality
- **Better Navigation**: Easier to find specific types of files
- **Reduced Clutter**: Temporary and development files properly organized

## Usage

All existing commands and tools should continue to work as before due to the symlink approach. The organization improves maintainability without breaking existing workflows.