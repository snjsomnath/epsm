# EPSM Scripts Documentation

---
title: Scripts
layout: default
---

This document describes the clean, organized script structure for the EPSM project.

## Script Overview

The `scripts/` directory contains 8 essential scripts with clear, distinct purposes:

### Development Scripts

#### `start.sh` 🚀
**Purpose**: Start the complete EPSM development environment
- Starts all Docker services (backend, frontend, database, redis)
- Runs database migrations
- Creates default superuser if needed
- Shows service status and useful URLs
- **Usage**: `./scripts/start.sh`

#### `stop.sh` 🛑
**Purpose**: Stop all EPSM services
- Stops all Docker containers
- Clean shutdown of the development environment
- **Usage**: `./scripts/stop.sh`

#### `status.sh` 📊
**Purpose**: Check the status of all EPSM services
- Shows Docker service status
- Tests frontend and backend connectivity
- Checks database accessibility
- Displays useful URLs and credentials
- **Usage**: `./scripts/status.sh`

#### `test.sh` 🧪
**Purpose**: Run all tests for the EPSM application
- Sets up test environment
- Runs backend Django tests
- Runs frontend tests
- Includes integration test placeholder
- **Usage**: `./scripts/test.sh`

### Database Management Scripts

#### `backup.sh` 💾
**Purpose**: Create backups of PostgreSQL databases
- Backs up main database and materials database
- Creates compressed archives
- Supports both development and production environments
- Optional S3 upload capability
- Automatic cleanup of old backups (30+ days)
- **Usage**: 
  - Development: `./scripts/backup.sh`
  - Production: `./scripts/backup.sh prod`

#### `restore.sh` 🔄
**Purpose**: Restore database from backup files
- Interactive backup file selection
- Safety confirmation prompts
- Supports both development and production
- Handles compressed backup files
- **Usage**: 
  - `./scripts/restore.sh` (lists available backups)
  - `./scripts/restore.sh backup_file.sql.gz`
  - `./scripts/restore.sh prod backup_file.sql.gz`

#### `verify_local_db.sh` 🔍
**Purpose**: Verify local PostgreSQL database integrity
- Tests database connection
- Verifies table count and structure
- Checks data integrity and relationships
- Tests foreign key constraints
- Validates indexes and unique constraints
- **Usage**: `./scripts/verify_local_db.sh`

### Production Scripts

#### `deploy.sh` 🚢
**Purpose**: Deploy EPSM to production environment
- Validates production environment variables
- Creates automatic backup before deployment
- Deploys using production Docker Compose
- Runs migrations and collects static files
- Performs health checks
- **Usage**: `./scripts/deploy.sh`

## Quick Reference

| Task | Command |
|------|---------|
| Start development | `./scripts/start.sh` |
| Stop all services | `./scripts/stop.sh` |
| Check service status | `./scripts/status.sh` |
| Run tests | `./scripts/test.sh` |
| Backup database | `./scripts/backup.sh` |
| Restore database | `./scripts/restore.sh` |
| Verify local DB | `./scripts/verify_local_db.sh` |
| Deploy to production | `./scripts/deploy.sh` |

## Script Dependencies

All scripts are designed to be run from the project root directory and expect:

- Docker and Docker Compose installed
- `.env` file configured (created from `.env.example` if missing)
- Proper directory structure with `frontend/`, `backend/`, and configuration files

## Cleanup Summary

The following redundant scripts were removed during organization:
- ❌ `start-epsm.sh` (duplicate of `start.sh` with unnecessary complexity)
- ❌ `stop-epsm.sh` (duplicate of `stop.sh` with extra overhead)

The script `status-epsm.sh` was renamed to `status.sh` for consistency.

## Best Practices

1. **Always run scripts from project root**: `./scripts/script_name.sh`
2. **Check status before starting**: Use `./scripts/status.sh` to see current state
3. **Stop cleanly**: Always use `./scripts/stop.sh` rather than `docker-compose down`
4. **Regular backups**: Run `./scripts/backup.sh` before major changes
5. **Test after changes**: Use `./scripts/test.sh` to validate functionality

This clean script structure eliminates redundancy while providing all essential functionality for development, testing, backup, and deployment workflows.

## Recent updates (development)

- The `scripts/start.sh` script was enhanced to streamline the developer workflow. Notable behaviors added:
  - Checks whether Docker is running and attempts to start Docker Desktop on macOS if not available.
  - Creates a local `.env` from `.env.example` when none exists and prompts the user to edit or continue.
  - Stops any existing containers, pulls latest third-party images, and builds/starts services.
  - Waits for the database to become ready using `pg_isready` before proceeding.
  - Ensures a dedicated results database and role exist (defaults: `epsm_results` / `epsm_results_user`) in the Docker Compose environment; idempotent creation.
  - Runs Django migrations for both the default DB and the `results_db` (if configured via env vars).
  - Creates a default Django superuser (`admin` / `admin123`) if one does not already exist.
  - Prints helpful service status, URLs, and quick commands at the end of the run.

These additions make the development start process more robust and reduce manual setup steps.