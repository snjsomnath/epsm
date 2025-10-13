# GitHub Secrets Audit - EPSM Production

**Date:** October 13, 2025  
**Status:** ✅ Updated for Simplified Single Database Architecture

---

## 📋 Current GitHub Secrets

The following secrets are currently configured in the repository:

| Secret Name | Status | Last Updated | Purpose |
|-------------|--------|--------------|---------|
| `PROD_DB_PASSWORD` | ✅ Set | ~1 hour ago | PostgreSQL database password |
| `PROD_DJANGO_SECRET_KEY` | ✅ Set | ~1 hour ago | Django secret key for encryption |
| `PROD_EMAIL_HOST_PASSWORD` | ✅ Set | ~1 hour ago | SMTP email password |
| `PROD_HOST` | ✅ Set | ~4 days ago | Production server hostname |
| `PROD_REDIS_PASSWORD` | ✅ Set | ~1 hour ago | Redis cache/broker password |
| `PROD_SAML_IDP_METADATA_URL` | ✅ Set | ~1 hour ago | SAML SSO metadata URL |
| `PROD_SSH_KEY` | ✅ Set | ~4 days ago | SSH key for deployment |
| `PROD_USER` | ✅ Set | ~4 days ago | SSH user for deployment |

---

## 🔍 Required Variables Analysis

Based on `docker-compose.production.yml`, here are ALL required environment variables:

### 🔐 Secrets (Should be in GitHub Secrets)

| Variable | GitHub Secret | Status | Notes |
|----------|--------------|--------|-------|
| `DJANGO_SECRET_KEY` | `PROD_DJANGO_SECRET_KEY` | ✅ Available | Used in backend, celery_worker, celery_beat |
| `DB_PASSWORD` | `PROD_DB_PASSWORD` | ✅ Available | Used for all database connections |
| `REDIS_PASSWORD` | `PROD_REDIS_PASSWORD` | ✅ Available | Used for Redis and Celery |
| `DJANGO_SUPERUSER_PASSWORD` | ❌ **MISSING** | ⚠️ **NEEDS TO BE ADDED** | For automatic superuser creation |
| `SAML_IDP_METADATA_URL` | `PROD_SAML_IDP_METADATA_URL` | ✅ Available | For SAML SSO (optional) |
| `EMAIL_HOST_PASSWORD` | `PROD_EMAIL_HOST_PASSWORD` | ✅ Available | For email sending (if used) |

### 📝 Configuration Values (Can have defaults in .env.production)

| Variable | Default Value | Notes |
|----------|---------------|-------|
| `DJANGO_SETTINGS_MODULE` | `config.settings` | Django settings module |
| `DEBUG` | `False` | Production should be False |
| `ALLOWED_HOSTS` | `epsm.ita.chalmers.se` | Public domain |
| `VERSION` | `0.2.4` | Application version |
| `DB_NAME` | `epsm_db` | Database name (not sensitive) |
| `DB_USER` | `epsm_user` | Database user (not sensitive) |
| `DB_HOST` | `database` | Service name |
| `DB_PORT` | `5432` | Standard PostgreSQL port |
| `MATERIALS_DB_NAME` | `epsm_materials` | Materials database name |
| `MATERIALS_DB_USER` | `epsm_user` | Same user for materials DB |
| `MATERIALS_DB_PASSWORD` | Same as `DB_PASSWORD` | Can reuse same password |
| `MATERIALS_DB_HOST` | `database` | Same host (single PostgreSQL instance) |
| `MATERIALS_DB_PORT` | `5432` | Same port |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Constructed from REDIS_PASSWORD |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/0` | Constructed from REDIS_PASSWORD |
| `ENERGYPLUS_DOCKER_IMAGE` | `nrel/energyplus:23.2.0` | Public Docker image |
| `SIMULATION_TIMEOUT` | `600` | Timeout in seconds |
| `DJANGO_SUPERUSER_USERNAME` | `admin@chalmers.se` | Default admin username |
| `DJANGO_SUPERUSER_EMAIL` | `admin@chalmers.se` | Default admin email |
| `CORS_ALLOWED_ORIGINS` | `https://epsm.ita.chalmers.se` | CORS configuration |
| `DOCKER_GID` | `999` | Docker group ID |
| `HOST_MEDIA_ROOT` | `/var/lib/docker/volumes/...` | Host path for media |
| `VITE_API_BASE_URL` | `https://epsm.ita.chalmers.se` | Frontend API URL |
| `VITE_WS_URL` | `wss://epsm.ita.chalmers.se/ws` | WebSocket URL |

---

## ⚠️ CRITICAL: Missing Secrets

### 🔴 DJANGO_SUPERUSER_PASSWORD

**Status:** ❌ **MISSING - MUST BE ADDED**

**Why it's needed:**
- The `docker-entrypoint.sh` script creates a superuser automatically on first run
- Without this secret, superuser creation will fail or use an insecure default
- This is the admin password for Django admin panel and API access

**Action Required:**

```bash
# Generate a strong password
openssl rand -base64 32

# Add to GitHub Secrets
gh secret set PROD_DJANGO_SUPERUSER_PASSWORD
# Paste the generated password when prompted
```

**Or via GitHub UI:**
1. Go to: https://github.com/snjsomnath/epsm/settings/secrets/actions
2. Click "New repository secret"
3. Name: `PROD_DJANGO_SUPERUSER_PASSWORD`
4. Value: [Strong password from above]
5. Click "Add secret"

---

## ✅ Recommendations

### 1. Add Missing Secret Immediately

```bash
# Generate strong password
SUPERUSER_PASSWORD=$(openssl rand -base64 32)
echo "Generated password: $SUPERUSER_PASSWORD"

# Add to GitHub (you'll be prompted to paste it)
gh secret set PROD_DJANGO_SUPERUSER_PASSWORD
```

### 2. Update .env.production.template

The template should include:

```bash
# Superuser Creation (via entrypoint script)
DJANGO_SUPERUSER_USERNAME=${DJANGO_SUPERUSER_USERNAME:-admin@chalmers.se}
DJANGO_SUPERUSER_EMAIL=${DJANGO_SUPERUSER_EMAIL:-admin@chalmers.se}
DJANGO_SUPERUSER_PASSWORD=${DJANGO_SUPERUSER_PASSWORD}  # From GitHub Secret
```

### 3. Update deploy-production.yml Workflow

Add to the secret replacement section:

```yaml
- name: Create .env.production from GitHub Secrets
  run: |
    cd /opt/epsm
    
    # ... existing sed commands ...
    
    # Add this line:
    sed -i "s|\${DJANGO_SUPERUSER_PASSWORD}|${{ secrets.PROD_DJANGO_SUPERUSER_PASSWORD }}|g" .env.production
```

### 4. Validate All Secrets in Workflow

Update the validation step to check for the new secret:

```yaml
- name: Validate GitHub Secrets
  run: |
    echo "🔐 Validating GitHub Secrets..."
    errors=0
    
    # Existing checks...
    
    # Add this check:
    if [ -z "${{ secrets.PROD_DJANGO_SUPERUSER_PASSWORD }}" ]; then
      echo "❌ PROD_DJANGO_SUPERUSER_PASSWORD is not set"
      errors=$((errors+1))
    else
      echo "✅ PROD_DJANGO_SUPERUSER_PASSWORD is set"
    fi
    
    # ... rest of validation ...
```

---

## 📊 Secret Usage Matrix

| Secret | Used By Services | Critical? |
|--------|------------------|-----------|
| `PROD_DJANGO_SECRET_KEY` | backend, celery_worker, celery_beat | 🔴 Critical |
| `PROD_DB_PASSWORD` | database, backend, celery_worker, celery_beat | 🔴 Critical |
| `PROD_REDIS_PASSWORD` | redis, backend, celery_worker, celery_beat | 🔴 Critical |
| `PROD_DJANGO_SUPERUSER_PASSWORD` | backend (entrypoint) | 🔴 Critical |
| `PROD_SAML_IDP_METADATA_URL` | backend (if SAML enabled) | 🟡 Optional |
| `PROD_EMAIL_HOST_PASSWORD` | backend (if email enabled) | 🟡 Optional |
| `PROD_SSH_KEY` | GitHub Actions runner | 🔵 Deployment |
| `PROD_USER` | GitHub Actions runner | 🔵 Deployment |
| `PROD_HOST` | GitHub Actions runner | 🔵 Deployment |

---

## 🔄 Database Architecture Change Impact

### Previous Architecture (Multi-Database)
- ❌ Separate databases: `epsm_db`, `epsm_materials`, `epsm_results`
- ❌ Different passwords for each database
- ❌ Required secrets: `PROD_MATERIALS_DB_PASSWORD`, `PROD_RESULTS_DB_PASSWORD`

### Current Architecture (Single Database)
- ✅ Single PostgreSQL instance with multiple databases
- ✅ Same password (`PROD_DB_PASSWORD`) used for all databases
- ✅ Simplified: Only ONE database password needed
- ✅ Materials and results stored in separate databases on same instance

### Removed Secrets (No longer needed)
- ~~`PROD_MATERIALS_DB_PASSWORD`~~ → Now uses `PROD_DB_PASSWORD`
- ~~`PROD_RESULTS_DB_PASSWORD`~~ → Now uses `PROD_DB_PASSWORD`

---

## 🔒 Security Checklist

- [x] All critical secrets stored in GitHub Secrets (except superuser password)
- [ ] **Add `PROD_DJANGO_SUPERUSER_PASSWORD`** ⚠️
- [x] Secrets not committed to repository
- [x] Secrets rotated recently (~1 hour ago)
- [x] `.env.production` cleaned up after deployment
- [x] SSH keys for deployment properly secured
- [ ] Update deployment workflow to use new secret
- [ ] Update .env.production.template with superuser vars

---

## 📝 Action Items

### Immediate (Before Next Deployment)
1. **Add `PROD_DJANGO_SUPERUSER_PASSWORD` secret**
2. Update `.env.production.template` to include superuser variables
3. Update `deploy-production.yml` to inject superuser password

### Optional Improvements
1. Set custom superuser username in .env.production.template
2. Document superuser credentials in team password manager
3. Consider adding backup email configuration secrets
4. Review and rotate all secrets quarterly

---

## 🎯 Quick Fix Command

Run this to add the missing secret:

```bash
# Generate and add the missing secret
echo "Generating secure superuser password..."
SUPERUSER_PASSWORD=$(openssl rand -base64 32)

echo ""
echo "========================================"
echo "SAVE THIS PASSWORD SECURELY:"
echo "$SUPERUSER_PASSWORD"
echo "========================================"
echo ""

# Add to GitHub
echo "Adding to GitHub Secrets..."
echo "$SUPERUSER_PASSWORD" | gh secret set PROD_DJANGO_SUPERUSER_PASSWORD

echo "✅ Secret added successfully!"
echo ""
echo "Next steps:"
echo "1. Save the password above in your password manager"
echo "2. Update deploy-production.yml workflow"
echo "3. Update .env.production.template"
echo "4. Run deployment to create superuser"
```

---

**Last Updated:** October 13, 2025  
**Next Review:** January 13, 2026 (90-day rotation)
