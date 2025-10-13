# EPSM Configuration Cleanup Plan

**Created:** October 13, 2025  
**Status:** Planning Phase  
**Goal:** Establish clean dev/staging/production separation with proper secrets management

---

## 🔴 Current Problems Identified

### 1. **Hardcoded Localhost Paths**
**Location:** Multiple files contain hardcoded paths specific to developer machine

```yaml
# docker-compose.yml (Line 51)
HOST_MEDIA_ROOT: "/Users/ssanjay/GitHub/epsm/backend/media"

# docker-compose.production.yml (multiple lines)
HOST_MEDIA_ROOT=/var/lib/docker/volumes/epsm_media_data_prod/_data
```

**Impact:** Cannot run on different machines or environments

### 2. **Environment File Chaos**
**Files Found:**
- `.env.example` - Dev template
- `.env.production.example` - Production template  
- Hidden actual `.env` files (gitignored)
- Scripts that check for `.env` vs `.env.production`

**Problems:**
- Two different templates with overlapping but different variables
- Confusion about which file to use when
- No `.env.local` pattern for developer overrides
- Scripts that copy `.env.example` to `.env` automatically

### 3. **Script Directory Mess**
**Current Scripts (19 total):**
```
backup.sh                      - Keep (essential)
restore.sh                     - Keep (essential)
start.sh                       - Keep (essential)
stop.sh                        - Keep (essential)
status.sh                      - Keep (essential)
restart.sh                     - Keep (essential)
test.sh                        - Keep (essential)

check-database-health.sh       - Consolidate into status.sh
seed-database.sh               - Move to setup/init directory
fix_db_permissions.sh          - Move to setup/troubleshooting
check_delete_scenario.py       - Move to backend/scripts/

deploy-localhost-fix.sh        - DELETE (one-time fix applied)
migrate-to-streamlined.sh      - ARCHIVE (migration complete)
migrate_to_celery.sh           - ARCHIVE (migration complete)
cleanup_and_rebuild.sh         - DELETE (superseded by release.sh)
release.sh                     - Keep but simplify
undo-release.sh                - Keep with release.sh
verify_local_db.sh             - DELETE (dev testing)
```

**Problems:**
- Too many scripts with overlapping functionality
- Migration scripts still present after migrations complete
- No clear organization (dev vs production vs maintenance)
- Many scripts reference old deployment strategies

### 4. **Docker Compose Files**
**Files:**
- `docker-compose.yml` - Development
- `docker-compose.production.yml` - Production
- `docker-compose.versioned.yml` - ?
- `archive/docker-compose.prod.legacy.20251012.yml` - Old
- `archive/docker-compose.production.legacy.20251012.yml` - Old

**Problems:**
- `docker-compose.versioned.yml` purpose unclear
- Both dev and prod have hardcoded values
- Development config has production domain (`https://epsm.chalmers.se`) in CORS
- No staging configuration

### 5. **Production Values in Dev Config**
**Found in docker-compose.yml:**
```yaml
CORS_ALLOWED_ORIGINS: "http://localhost:5173,http://frontend:5173,https://epsm.chalmers.se"
```
**Should be:** Only localhost in dev config

### 6. **No Staging Environment**
- No staging docker-compose file
- No staging deployment strategy
- Cannot test production config before deploying

### 7. **Secrets Management Issues**
- No documented secrets rotation strategy
- No clear GitHub Actions secrets documentation
- No local secrets override pattern (.env.local)
- Scripts that expose passwords in logs

### 8. **Change Summary Folder Bloat**
**Current:** 67 markdown files documenting every change
**Problems:**
- Hard to find relevant information
- Many documents outdated or superseded
- No clear organization by topic vs chronology

---

## ✅ Proposed Solution

### Phase 1: Environment Structure

#### New Environment File Structure
```
.env.example              - Shared variables documentation (DO NOT USE DIRECTLY)
.env.local               - Developer-specific overrides (gitignored, optional)
.env                     - Development defaults (gitignored, auto-generated from example)

environments/
  ├── development.env.example    - Development template
  ├── staging.env.example        - Staging template  
  └── production.env.example     - Production template
```

#### Environment Loading Priority
1. **Development:** `.env.local` → `.env` → `development.env.example` defaults
2. **Staging:** `staging.env` (on staging server)
3. **Production:** `production.env` (on production server)

#### Variable Categories
```bash
# SHARED ACROSS ALL ENVIRONMENTS
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
MATERIALS_DB_NAME=epsm_materials
ENERGYPLUS_DOCKER_IMAGE=nrel/energyplus:23.2.0

# ENVIRONMENT-SPECIFIC
DEBUG=                  # True for dev, False for prod
DJANGO_SECRET_KEY=      # Different per environment
ALLOWED_HOSTS=          # localhost for dev, domain for prod
DB_PASSWORD=            # Different per environment
CORS_ALLOWED_ORIGINS=   # Different per environment
HOST_MEDIA_ROOT=        # Different per environment (or use Docker volume)
```

### Phase 2: Docker Configuration

#### Clean Docker Compose Structure
```
docker-compose.yml              - Development (default)
docker-compose.staging.yml      - Staging environment
docker-compose.production.yml   - Production (clean, no hardcodes)
docker-compose.override.yml.example - Developer overrides template
```

#### Remove Hardcoded Paths
**Before:**
```yaml
HOST_MEDIA_ROOT: "/Users/ssanjay/GitHub/epsm/backend/media"
```

**After (Option 1 - Relative):**
```yaml
HOST_MEDIA_ROOT: "${PWD}/backend/media"
```

**After (Option 2 - Volume Only):**
```yaml
# Remove HOST_MEDIA_ROOT entirely, use Docker volumes
volumes:
  - media_data:/app/media
```

### Phase 3: Scripts Organization

#### Proposed Script Structure
```
scripts/
  ├── README.md                    - Script documentation
  │
  ├── Core Scripts (Essential)
  ├── start.sh                     - Start development environment
  ├── stop.sh                      - Stop all services
  ├── restart.sh                   - Restart services
  ├── status.sh                    - Check system status
  ├── test.sh                      - Run tests
  │
  ├── Maintenance
  ├── backup.sh                    - Database backup
  ├── restore.sh                   - Database restore
  ├── release.sh                   - Create release
  ├── undo-release.sh              - Rollback release
  │
  ├── Development
  ├── dev/
  │   ├── setup-dev.sh             - First-time setup
  │   ├── reset-dev.sh             - Reset dev environment
  │   └── seed-database.sh         - Seed dev data
  │
  ├── Production
  ├── production/
  │   ├── deploy-production.sh     - Production deployment
  │   └── health-check.sh          - Production health check
  │
  └── Archive (Legacy)
      └── archive/
          ├── migrate-to-celery.sh
          ├── migrate-to-streamlined.sh
          └── cleanup_and_rebuild.sh
```

### Phase 4: Settings Refactor

#### Django Settings Structure
```
backend/config/settings/
  ├── __init__.py              - Imports based on DJANGO_SETTINGS_MODULE
  ├── base.py                  - Shared settings
  ├── development.py           - Development overrides
  ├── staging.py               - Staging overrides
  └── production.py            - Production overrides
```

**Current Issue:** Settings are scattered and have production values mixed with dev values

### Phase 5: Secrets Management

#### Development Secrets
- Use `.env.local` for personal overrides (never commit)
- `.env` auto-generated from `.env.example` with safe defaults
- Default dev passwords okay (not secure, just functional)

#### Production Secrets
- Generate unique secrets per environment
- Store in secure location (not Git)
- GitHub Actions secrets for CI/CD
- Rotate regularly (document process)

#### Secrets Documentation
```
docs/
  ├── SECRETS_MANAGEMENT.md        - How to handle secrets
  ├── PRODUCTION_SETUP.md          - Production secrets setup
  └── GITHUB_ACTIONS_SECRETS.md    - CI/CD secrets
```

### Phase 6: Documentation Cleanup

#### Change Summary Consolidation
**Instead of 67 files, create:**
```
docs/
  ├── CHANGELOG.md                 - Version history
  ├── ARCHITECTURE.md              - System architecture
  ├── DEPLOYMENT.md                - Deployment guide
  ├── DEVELOPMENT.md               - Development guide
  └── TROUBLESHOOTING.md           - Common issues
  
change-history/
  ├── 2024-10/                     - October 2024 changes
  ├── 2024-11/                     - November 2024 changes
  └── 2025-10/                     - October 2025 changes
      └── [consolidated summaries by topic]
```

---

## 📋 Implementation Checklist

### Phase 1: Planning & Documentation
- [ ] Review this plan with team
- [ ] Document all current environment variables
- [ ] Map which variables are needed where
- [ ] Identify all hardcoded values
- [ ] Create migration plan for existing deployments

### Phase 2: Environment Files
- [ ] Create `environments/` directory
- [ ] Create `development.env.example`
- [ ] Create `staging.env.example`
- [ ] Create `production.env.example`
- [ ] Create `.env.override.example`
- [ ] Document environment loading in README
- [ ] Test environment precedence

### Phase 3: Docker Configuration
- [ ] Remove hardcoded paths from docker-compose.yml
- [ ] Create clean docker-compose.staging.yml
- [ ] Update docker-compose.production.yml
- [ ] Create docker-compose.override.yml.example
- [ ] Test dev environment with new config
- [ ] Test production config locally
- [ ] Document Docker environment patterns

### Phase 4: Scripts Cleanup
- [ ] Create scripts/README.md
- [ ] Move scripts to appropriate directories
- [ ] Archive migration scripts
- [ ] Delete obsolete scripts
- [ ] Consolidate health check scripts
- [ ] Update all script references in docs
- [ ] Test all kept scripts

### Phase 5: Backend Settings
- [ ] Create settings/base.py
- [ ] Create settings/development.py
- [ ] Create settings/staging.py
- [ ] Update settings/production.py
- [ ] Test each environment setting
- [ ] Update DJANGO_SETTINGS_MODULE references

### Phase 6: Secrets Management
- [ ] Create SECRETS_MANAGEMENT.md
- [ ] Document secret generation process
- [ ] Document GitHub Actions secrets
- [ ] Create secret rotation procedure
- [ ] Update .gitignore for new patterns
- [ ] Audit current secrets usage

### Phase 7: Documentation
- [ ] Update main README.md
- [ ] Update DEPLOYMENT.md
- [ ] Update DEVELOPMENT.md
- [ ] Consolidate change summaries
- [ ] Create TROUBLESHOOTING.md
- [ ] Archive old docs

### Phase 8: Testing & Validation
- [ ] Test development environment from scratch
- [ ] Test staging environment (if available)
- [ ] Test production config in isolated environment
- [ ] Verify no hardcoded paths remain
- [ ] Verify secrets not in git history
- [ ] Test all scripts work
- [ ] Update CI/CD workflows

### Phase 9: Deployment
- [ ] Create backup of production environment
- [ ] Schedule maintenance window
- [ ] Deploy new configuration to production
- [ ] Verify production functionality
- [ ] Update monitoring
- [ ] Document any issues encountered

### Phase 10: Cleanup
- [ ] Remove old files from repository
- [ ] Clean up git history (optional, risky)
- [ ] Archive old documentation
- [ ] Update contribution guidelines
- [ ] Announce changes to team

---

## 🎯 Success Criteria

- [ ] Developer can clone repo and start with one command
- [ ] No hardcoded paths specific to any machine
- [ ] Clear separation of dev/staging/production
- [ ] All secrets properly managed and documented
- [ ] Less than 10 scripts in root scripts directory
- [ ] Documentation under 10 main files
- [ ] Can deploy to production confidently
- [ ] New team member can understand config in <30 min

---

## ⚠️ Risks & Mitigations

### Risk: Breaking Production
**Mitigation:** 
- Test all changes in staging first
- Create comprehensive backup before deployment
- Have rollback plan ready
- Deploy during low-usage window

### Risk: Lost Configuration
**Mitigation:**
- Document all current production values before cleanup
- Archive all old files before deletion
- Maintain old configs in archive/ directory for 6 months

### Risk: Developer Confusion
**Mitigation:**
- Clear documentation of changes
- Migration guide for existing developers
- Team meeting to explain new structure
- Update onboarding docs

### Risk: Secrets Exposure
**Mitigation:**
- Audit git history for exposed secrets
- Rotate all secrets after cleanup
- Add pre-commit hooks for secret detection
- Document proper secrets handling

---

## 📅 Timeline Estimate

- **Phase 1-2:** 2 days (Planning & Environment files)
- **Phase 3-4:** 2 days (Docker & Scripts)
- **Phase 5-6:** 2 days (Settings & Secrets)
- **Phase 7-8:** 2 days (Documentation & Testing)
- **Phase 9-10:** 1 day (Deployment & Cleanup)

**Total:** ~9 working days

---

## 🚀 Quick Wins (Start Here)

If you want to start immediately, tackle these in order:

1. **Remove hardcoded path from docker-compose.yml**
   - Change to `${PWD}/backend/media` or remove entirely

2. **Archive migration scripts**
   - Move to `scripts/archive/`

3. **Create `.env.local` support**
   - Update start.sh to check `.env.local` first

4. **Document current production secrets**
   - List all production env vars in secure location

5. **Remove production domain from dev CORS**
   - Only localhost in docker-compose.yml

---

**Next Step:** Review this plan, then start with Phase 1 checklist.
