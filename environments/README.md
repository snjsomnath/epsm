# EPSM Environment Configuration

This directory contains environment templates for different deployment environments.

## Environment Files

- `development.env.example` - Local development defaults
- `production.env.example` - Production server configuration template
- `staging.env.example` - (Optional) Staging server template if needed in future

## Usage

### Development (Local)

1. **First time setup:**
   ```bash
   # Copy example to actual env file (gitignored)
   cp environments/development.env.example .env
   
   # Optional: Create personal overrides (gitignored)
   cp environments/development.env.example .env.local
   ```

2. **Edit values:**
   ```bash
   # Edit .env for shared development defaults
   vim .env
   
   # Edit .env.local for your personal settings (takes precedence)
   vim .env.local
   ```

3. **Start development:**
   ```bash
   ./scripts/start.sh
   ```

### Production

```bash
# On production server
cp environments/production.env.example /opt/epsm/.env.production
vim /opt/epsm/.env.production  # Edit with production values

# Deploy
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Environment Loading Priority

### Development
1. `.env.local` (your personal overrides) - highest priority
2. `.env` (shared dev settings)
3. `environments/development.env.example` (defaults)

### Production
1. `.env.production` (on server)
2. `environments/production.env.example` (defaults)

## What Goes Where?

### Same Across All Environments
- Database names (epsm_db, epsm_materials)
- Database user (epsm_user)
- Service names and structure
- EnergyPlus version
- Port mappings (mostly)

### Different Per Environment
- `DEBUG` (True/False)
- `DJANGO_SECRET_KEY` (unique per environment)
- `ALLOWED_HOSTS` (localhost vs domain)
- `DB_PASSWORD` (different per environment)
- `CORS_ALLOWED_ORIGINS` (localhost vs production domain)
- `VITE_API_BASE_URL` (localhost:8000 vs https://epsm.chalmers.se)
- `VITE_WS_URL` (ws:// vs wss://)
- SSL/TLS settings
- Email configuration
- Backup settings
- Monitoring settings

## Security Notes

### Development
- Default passwords are okay (for convenience)
- DEBUG=True is acceptable
- No SSL required
- Localhost-only access

### Production
- **Must** use unique, strong passwords
- **Must** use unique SECRET_KEY
- **Must** set DEBUG=False
- **Must** use HTTPS/WSS
- **Must** restrict ALLOWED_HOSTS
- **Must** configure proper CORS
- **Should** use environment-specific email
- **Should** enable monitoring

## File Locations

| Environment | File Location | In Git? |
|-------------|---------------|---------|
| Development example | `environments/development.env.example` | ✅ Yes |
| Development actual | `.env` | ❌ No (gitignored) |
| Development override | `.env.local` | ❌ No (gitignored) |
| Production example | `environments/production.env.example` | ✅ Yes |
| Production actual | `/opt/epsm/.env.production` (server) | ❌ No |

## Generating Secrets

### Django Secret Key
```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Random Password
```bash
openssl rand -base64 32
```

### For Production
**Never reuse development secrets in production!**

Generate new unique values for:
- DJANGO_SECRET_KEY
- DB_PASSWORD
- MATERIALS_DB_PASSWORD
- RESULTS_DB_PASSWORD
- REDIS_PASSWORD (if used)

## Troubleshooting

### Environment not loading
```bash
# Check if file exists
ls -la .env

# Check for syntax errors
cat .env | grep -v "^#" | grep "="

# Manually source to test
source .env
echo $DEBUG
```

### Wrong environment loaded
```bash
# Check what docker-compose sees
docker-compose config

# Explicitly specify env file
docker-compose --env-file .env.local config
```

### Values not applying
```bash
# Recreate containers to pick up new env vars
docker-compose down
docker-compose up -d --force-recreate
```

## Migration from Old Structure

If you have old `.env` files:

```bash
# Backup old files (just in case)
cp .env .env.backup.old 2>/dev/null || true
cp .env.production .env.production.backup.old 2>/dev/null || true

# Development: Start fresh with new structure
cp environments/development.env.example .env
# Edit .env with your values if needed (has good defaults)

# Production: Keep your existing .env.production or create from template
# Only create new one if you don't have production secrets yet
cp environments/production.env.example .env.production
# Edit .env.production with your production values
```

## See Also

- [SECRETS_MANAGEMENT.md](../docs/SECRETS_MANAGEMENT.md) - Detailed secrets handling
- [DEVELOPMENT.md](../docs/DEVELOPMENT.md) - Development setup guide
- [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Production deployment guide
