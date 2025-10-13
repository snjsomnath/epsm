# GitHub Secrets Quick Setup Guide

**Last Updated:** October 13, 2025  
**Estimated Time:** 15 minutes

---

## 🎯 Overview

This guide walks you through setting up GitHub Secrets for secure production deployment in **3 simple steps**.

---

## ✅ Prerequisites

- [ ] Admin access to GitHub repository
- [ ] Python 3 and OpenSSL installed (both come pre-installed on macOS)
- [ ] Access to production server at epsm.ita.chalmers.se
- [ ] Chalmers email credentials

**Note:** No need to install Django locally - the script uses Python's built-in `secrets` module!

---

## 📝 Step 1: Generate Secrets (5 minutes)

### On your Mac:

```bash
cd /Users/ssanjay/GitHub/epsm

# Generate all secrets at once
./scripts/generate-secrets.sh > ~/Desktop/epsm-secrets.txt

# Open the file
open ~/Desktop/epsm-secrets.txt
```

**Output contains 7 secrets:**
1. PROD_DJANGO_SECRET_KEY
2. PROD_DB_PASSWORD
3. PROD_MATERIALS_DB_PASSWORD
4. PROD_RESULTS_DB_PASSWORD
5. PROD_REDIS_PASSWORD
6. PROD_EMAIL_HOST_PASSWORD (manual entry needed)
7. PROD_SAML_IDP_METADATA_URL (fixed value)

**⚠️ Keep this file secure!** Delete after adding to GitHub.

---

## 🔐 Step 2: Add Secrets to GitHub (8 minutes)

### Navigate to GitHub Secrets:

1. Go to: https://github.com/snjsomnath/epsm/settings/secrets/actions
2. Click **"New repository secret"**
3. Add each secret from the generated file

### Add Each Secret:

#### Secret 1: Django Secret Key
```
Name: PROD_DJANGO_SECRET_KEY
Value: [Copy from epsm-secrets.txt]
```
Click **"Add secret"**

#### Secret 2: Database Password
```
Name: PROD_DB_PASSWORD
Value: [Copy from epsm-secrets.txt]
```
Click **"Add secret"**

#### Secret 3: Materials DB Password
```
Name: PROD_MATERIALS_DB_PASSWORD
Value: [Copy from epsm-secrets.txt - or reuse PROD_DB_PASSWORD]
```
Click **"Add secret"**

#### Secret 4: Results DB Password
```
Name: PROD_RESULTS_DB_PASSWORD
Value: [Copy from epsm-secrets.txt - or reuse PROD_DB_PASSWORD]
```
Click **"Add secret"**

#### Secret 5: Redis Password
```
Name: PROD_REDIS_PASSWORD
Value: [Copy from epsm-secrets.txt]
```
Click **"Add secret"**

#### Secret 6: Email Password
```
Name: PROD_EMAIL_HOST_PASSWORD
Value: [Your Chalmers email password or app-specific password]
```
Click **"Add secret"**

#### Secret 7: SAML Metadata URL
```
Name: PROD_SAML_IDP_METADATA_URL
Value: https://www.ita.chalmers.se/idp.chalmers.se.xml
```
Click **"Add secret"**

### Verify All Secrets Added:

You should see all 7 secrets listed:

```
✅ PROD_DJANGO_SECRET_KEY - Updated X minutes ago
✅ PROD_DB_PASSWORD - Updated X minutes ago
✅ PROD_MATERIALS_DB_PASSWORD - Updated X minutes ago
✅ PROD_RESULTS_DB_PASSWORD - Updated X minutes ago
✅ PROD_REDIS_PASSWORD - Updated X minutes ago
✅ PROD_EMAIL_HOST_PASSWORD - Updated X minutes ago
✅ PROD_SAML_IDP_METADATA_URL - Updated X minutes ago
```

---

## 🚀 Step 3: Deploy Template to Server (2 minutes)

### Copy template to production server:

```bash
# From your Mac
cd /Users/ssanjay/GitHub/epsm

# Copy template to server
scp environments/.env.production.template epsm-server:/opt/epsm/

# Verify it's there
ssh epsm-server "ls -la /opt/epsm/.env.production.template"
```

**Expected output:**
```
-rw-r--r-- 1 runner runner 5842 Oct 13 14:30 .env.production.template
```

---

## ✅ Step 4: Test Deployment

### Run the updated workflow:

1. Go to: https://github.com/snjsomnath/epsm/actions
2. Click **"Deploy to Production"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait for deployment to complete (about 5-10 minutes)

### Watch for these steps:

```
✅ Validate GitHub Secrets
   ✅ PROD_DJANGO_SECRET_KEY is set
   ✅ PROD_DB_PASSWORD is set
   ✅ PROD_REDIS_PASSWORD is set
   ✅ All required secrets are configured

✅ Create .env.production from GitHub Secrets
   ✅ .env.production created successfully

✅ Build and deploy services
   ✅ Services deployed

✅ Run database migrations
   ✅ Migrations applied

✅ Verify deployment
   ✅ Backend health check passed

✅ Cleanup secrets file
   🗑️  Cleaned up .env.production
```

---

## 🎉 Success Criteria

After successful deployment, verify:

### 1. Application is accessible:
```bash
curl -I https://epsm.ita.chalmers.se
# Should return 200 OK
```

### 2. No secrets on disk:
```bash
ssh epsm-server
cd /opt/epsm
ls -la .env.production
# Should show: No such file or directory
```

### 3. Services are running:
```bash
ssh epsm-server
cd /opt/epsm
docker-compose -f docker-compose.production.yml ps
# All services should be "Up"
```

### 4. Database connection works:
```bash
ssh epsm-server
cd /opt/epsm
docker-compose -f docker-compose.production.yml exec backend python manage.py check
# Should show: System check identified no issues
```

---

## 🔄 Updating Secrets (Future)

When you need to rotate secrets:

### Generate new secret:
```bash
# Django secret key
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Database password
openssl rand -base64 32
```

### Update GitHub Secret:
1. Go to Settings → Secrets → Click secret name
2. Click **"Update secret"**
3. Paste new value
4. Click **"Update secret"**

### Redeploy:
1. Actions → Deploy to Production
2. Run workflow
3. New secret will be used

**For database passwords:** Also update the password in PostgreSQL:
```bash
docker-compose exec database psql -U epsm_user -d epsm_db
ALTER USER epsm_user WITH PASSWORD 'new-password-here';
\q
```

---

## 🆘 Troubleshooting

### Issue: "Secret not found" error

**Solution:**
- Check secret name is EXACTLY: `PROD_DJANGO_SECRET_KEY` (case-sensitive)
- Verify secret exists in GitHub Settings → Secrets
- Try re-adding the secret

### Issue: "Template not found" error

**Solution:**
```bash
# Verify template exists on server
ssh epsm-server "cat /opt/epsm/.env.production.template | head -n 5"

# If missing, copy it again
scp environments/.env.production.template epsm-server:/opt/epsm/
```

### Issue: Services fail to start

**Solution:**
```bash
# Check logs
ssh epsm-server
cd /opt/epsm
docker-compose -f docker-compose.production.yml logs backend
docker-compose -f docker-compose.production.yml logs database
```

### Issue: Database password mismatch

**Solution:**
If you changed DB_PASSWORD, also update it in the database:
```bash
# Method 1: Stop everything and recreate database
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d

# Method 2: Update password in running database
docker-compose exec database psql -U postgres
ALTER USER epsm_user WITH PASSWORD 'new-password';
```

---

## 📚 Additional Resources

- **Full Documentation:** See `SECRETS_MANAGEMENT.md`
- **Rotation Schedule:** 90 days for most secrets
- **Emergency Access:** Contact Sanjay Somanath (ssanjay@chalmers.se)

---

## 🔒 Security Checklist

After setup, verify:

- [ ] All 7 secrets added to GitHub
- [ ] Generated secrets file deleted from Desktop
- [ ] No `.env.production` file on server
- [ ] Template file (`.env.production.template`) exists on server
- [ ] Application works correctly
- [ ] No secrets visible in GitHub Actions logs
- [ ] Set calendar reminder for secret rotation (90 days)

---

**🎉 You're all set!** Your production deployment now uses secure GitHub Secrets management.

**Next rotation due:** January 12, 2026 (90 days from now)
