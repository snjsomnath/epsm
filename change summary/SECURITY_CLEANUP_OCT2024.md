# Security Cleanup - Sensitive Environment Files Removed
**Date:** October 12, 2025  
**Commit:** 4d96c00

## Summary
Removed sensitive production environment files that were accidentally committed to the git repository.

## Files Removed from Git Tracking

The following files have been **removed from git** but are **still present on disk**:

1. `.env.production.new` - Production environment configuration
2. `.env.template` - Template with sensitive defaults
3. `archive/.env.legacy.20251012` - Legacy production config
4. `archive/.env.production.legacy.20251012` - Legacy production config

## Sensitive Data That Was Exposed

These files contained:
- `DJANGO_SECRET_KEY`: LItIFg8E3HIb7jZgDRebGI9sugjsCdVLztliWj9kUj7toZaRpUmvwq_NsPw-tYcYwzI
- `JWT_SECRET`: your-super-secret-jwt-key-change-in-production-2025
- Database passwords: `epsm_secure_password_change_this`, `epsm_results_password`
- SAML configuration URLs
- Production domain names

## Changes Made

### 1. Removed Files from Git
```bash
git rm --cached .env.production.new
git rm --cached .env.template
git rm --cached archive/.env.legacy.20251012
git rm --cached archive/.env.production.legacy.20251012
```

### 2. Updated `.gitignore`
Added stronger patterns to prevent future commits:
```gitignore
# Environment files - Block ALL .env files except examples
.env*
!.env.example
!.env*.example
.env
.env.local
.env.development
.env.test
.env.production
.env.production.new
.env.template
archive/.env*
```

## Currently Tracked .env Files (Safe)
Only example files remain in git:
- `.env.example` ✅
- `.env.production.example` ✅

## CRITICAL: Next Steps Required

### 🔴 URGENT - Rotate All Credentials

Since these credentials were committed to git history, they must be rotated:

1. **Django Secret Key**
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

2. **JWT Secret**
   ```bash
   openssl rand -base64 64
   ```

3. **Database Passwords**
   - Change `DB_PASSWORD` in `.env.production.new`
   - Update PostgreSQL user passwords:
     ```sql
     ALTER USER epsm_user WITH PASSWORD 'new_secure_password';
     ALTER USER epsm_results_user WITH PASSWORD 'new_results_password';
     ```

4. **Update Production Environment**
   - SSH to production server
   - Update `.env.production.new` with new credentials
   - Restart services:
     ```bash
     docker-compose -f docker-compose.production.yml down
     docker-compose -f docker-compose.production.yml up -d
     ```

### 📝 Git History Cleanup (Optional but Recommended)

The sensitive files still exist in git history. To completely remove them:

**WARNING:** This rewrites git history and requires force-push. Coordinate with all team members.

```bash
# Using git filter-repo (recommended)
git filter-repo --path .env.production.new --invert-paths
git filter-repo --path .env.template --invert-paths
git filter-repo --path archive/.env.legacy.20251012 --invert-paths
git filter-repo --path archive/.env.production.legacy.20251012 --invert-paths

# Or using BFG Repo-Cleaner
bfg --delete-files .env.production.new
bfg --delete-files .env.template
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (DANGEROUS - coordinate with team)
git push origin --force --all
```

### 🔒 Best Practices Going Forward

1. **Never commit actual .env files** - Only commit `.env.example` templates
2. **Use environment-specific files on servers** - Keep production configs only on production
3. **Rotate credentials regularly** - Even without exposure
4. **Audit git commits** - Check what files are staged before committing
5. **Use secrets management** - Consider HashiCorp Vault, AWS Secrets Manager, etc.

### ✅ Verification

Check that no sensitive files are tracked:
```bash
git ls-files | grep -E "\.env" | grep -v example
# Should only show .env.example files
```

Check that files still exist on disk:
```bash
ls -la .env* 
# Should show all files including .env.production.new
```

## Files Safe to Keep in Git

The following files contain NO sensitive data and are safe:
- `.env.example` - Template with placeholder values
- `.env.production.example` - Production template with placeholder values

## Impact Assessment

- **Scope:** Production credentials exposed in git history
- **Risk:** HIGH - Credentials can be extracted from git history
- **Mitigation:** Remove from tracking (done), rotate credentials (pending)
- **Timeline:** Exposed since commit cf0be71 (feat: add database migrations)

## References

- Git commit: 4d96c00
- Previous tracking commit: cf0be71
- Date discovered: October 12, 2025
- Date remediated: October 12, 2025
