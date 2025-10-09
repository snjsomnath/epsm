# EPSM Database Setup - Deployment Guide

## Why the Database Issue Occurred

The original deployment had an incomplete database initialization script that only created 2 out of 4 required databases:

**What was created automatically:**
- `epsm_db` (main Django database)
- `epsm_materials` (materials data)

**What was missing:**
- `epsm_results` (simulation results database)
- `epsm_results_user` (database user for results)
- `epsm_user` (database for health checks)

## Root Cause Analysis

1. **Incomplete initialization script**: The original `database/init/01-create-databases.sql` was missing the results database setup
2. **Hardcoded passwords**: The script used hardcoded passwords instead of environment variables
3. **Missing environment variables**: The database container didn't receive the `RESULTS_DB_PASSWORD` environment variable

## Permanent Fix Applied

### 1. Updated Database Initialization

Created a comprehensive shell script (`database/init/00-create-users-and-databases.sh`) that:
- Creates all 4 required databases automatically
- Uses environment variables for passwords (secure)
- Includes proper error handling
- Runs before other initialization scripts (filename starts with 00)

### 2. Updated Docker Compose Configuration

Added missing environment variable to database service:
```yaml
environment:
  POSTGRES_DB: ${POSTGRES_DB:-epsm_db}
  POSTGRES_USER: ${POSTGRES_USER:-epsm_user}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  RESULTS_DB_PASSWORD: "${RESULTS_DB_PASSWORD:-epsm_results_password}"  # Added this
```

### 3. Fixed Health Check

Updated the PostgreSQL health check to specify the correct database:
```yaml
test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-epsm_user} -d ${POSTGRES_DB:-epsm_db}"]
```

## For Future Deployments

### 1. Environment Variables Setup

**CRITICAL**: Before deploying, create a `.env` file with these required variables:

```bash
# Copy the template
cp .env.template .env

# Edit with your values
nano .env
```

**Minimum required variables:**
- `DJANGO_SECRET_KEY` - Generate a secure random string
- `POSTGRES_PASSWORD` - Strong password for main database
- `RESULTS_DB_PASSWORD` - Strong password for results database

### 2. Fresh Deployment

For a completely fresh deployment:

```bash
# Clean deployment (removes all data!)
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

The initialization scripts will now automatically:
1. Create all 4 databases
2. Create both database users
3. Set up proper permissions
4. Use your environment variable passwords

### 3. Verify Deployment

After deployment, verify all databases exist:

```bash
# Check databases
docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_db -c "\l"

# Should show:
# - epsm_db
# - epsm_materials  
# - epsm_results
# - epsm_user
```

### 4. Troubleshooting

If database issues persist:

1. **Check environment variables:**
   ```bash
   docker-compose -f docker-compose.production.yml config
   ```

2. **Check initialization logs:**
   ```bash
   docker-compose -f docker-compose.production.yml logs database
   ```

3. **Manual database creation** (if needed):
   ```bash
   docker-compose -f docker-compose.production.yml exec database psql -U epsm_user -d epsm_db
   # Then run SQL commands manually
   ```

## Files Modified for Permanent Fix

1. `database/init/00-create-users-and-databases.sh` - New comprehensive init script
2. `database/init/01-create-databases.sql` - Updated existing script 
3. `docker-compose.production.yml` - Added environment variable and fixed health check
4. `.env.template` - New template for environment variables

## Security Notes

- Always use strong, unique passwords for production
- Never commit real passwords to git (use .env files)
- The `epsm_user` database is only needed for health checks and can be empty
- Consider rotating database passwords periodically