# EPSM Production Deployment Checklist

**Target:** epsm.chalmers.se  
**Date:** October 2025  
**Version:** 0.2.0+

---

## ✅ Pre-Deployment (Completed)

- [x] Privacy Policy created (`docs/PRIVACY_POLICY.md`)
- [x] Privacy Policy web view implemented (`/privacy/`)
- [x] SAML configuration updated for REFEDS Personalized Access
- [x] Production settings created (`backend/config/settings/production.py`)
- [x] SAML attribute mapping updated (`backend/config/saml_hooks.py`)
- [x] Dependencies updated (`requirements.prod.txt`)
- [x] Deployment documentation updated (`docs/DEPLOYMENT_CHALMERS.md`)
- [x] Email response to Björn drafted (`docs/EMAIL_TO_BJORN_RESPONSE.txt`)

---

## 📧 Communication with Chalmers IT

### Step 1: Send Response Email to Björn
**Status:** ⏳ PENDING

**Action:** Send the email from `docs/EMAIL_TO_BJORN_RESPONSE.txt`

**Key Points to Confirm:**
- [x] Using REFEDS Personalized Access entity category
- [x] IdP metadata URL: `https://www.ita.chalmers.se/idp.chalmers.se.xml`
- [x] Privacy policy prepared and will be published at `/privacy/`
- [x] Let's Encrypt for SSL certificates
- [x] Data minimization commitment stated

---

## 🖥️ VM Provisioning

### Step 2: Wait for VM from Chalmers IT
**Status:** ⏳ IN PROGRESS (Björn reviewing)

**Expected Information:**
- [ ] VM hostname (e.g., `epsm-vm.ita.chalmers.se`)
- [ ] Service name confirmation (`epsm.chalmers.se`)
- [ ] SSH access credentials
- [ ] VM specifications confirmation (8GB RAM, 100GB disk)
- [ ] Estimated provisioning time

**Once Received:**
- [ ] Test SSH access to VM
- [ ] Verify network connectivity
- [ ] Check DNS resolution for service name

---

## 🔧 VM Initial Setup

### Step 3: Install Docker and Prerequisites
**Status:** ⏳ NOT STARTED

```bash
# SSH into VM
ssh your-cid@[vm-hostname].ita.chalmers.se

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Install certbot for SSL
sudo apt install certbot -y
```

**Checklist:**
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] User added to docker group
- [ ] Certbot installed
- [ ] System updated

---

## 📦 Application Deployment

### Step 4: Clone Repository
**Status:** ⏳ NOT STARTED

```bash
cd /opt
sudo git clone https://github.com/snjsomnath/epsm.git
sudo chown -R $USER:$USER epsm
cd epsm
git checkout tags/v0.2.0  # Or latest stable version
```

**Checklist:**
- [ ] Repository cloned to `/opt/epsm`
- [ ] Correct version/tag checked out
- [ ] File permissions set correctly

---

### Step 5: Configure Environment
**Status:** ⏳ NOT STARTED

```bash
cd /opt/epsm
nano .env.production
```

**Required Variables:**
```bash
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<generate-using-django>
DEBUG=False
ALLOWED_HOSTS=epsm.chalmers.se,www.epsm.chalmers.se

# Database
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=<generate-secure-password>

# SAML
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml

# Docker
VERSION=0.2.0

# Email (optional)
EMAIL_HOST=smtp.chalmers.se
EMAIL_HOST_USER=<your-email@chalmers.se>
EMAIL_HOST_PASSWORD=<your-email-password>
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Error Tracking (optional)
SENTRY_DSN=
```

**Generate Secrets:**
```bash
# Generate SECRET_KEY
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Generate strong database password
openssl rand -base64 32
```

**Checklist:**
- [ ] `.env.production` created
- [ ] SECRET_KEY generated (50+ characters)
- [ ] Database password generated (strong)
- [ ] SAML IdP metadata URL configured
- [ ] Email settings configured (if needed)
- [ ] All required variables set

---

### Step 6: Obtain SSL Certificates
**Status:** ⏳ NOT STARTED

**Option A: Let's Encrypt** (Recommended)

```bash
# Stop any running web servers
docker-compose -f docker-compose.production.yml down

# Obtain certificates
sudo certbot certonly --standalone \
  -d epsm.chalmers.se \
  -d www.epsm.chalmers.se \
  --email sanjay.somanath@chalmers.se \
  --agree-tos \
  --no-eff-email

# Create SSL directory
mkdir -p /opt/epsm/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem /opt/epsm/nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem /opt/epsm/nginx/ssl/
sudo chown -R $USER:$USER /opt/epsm/nginx/ssl

# Set up auto-renewal
sudo crontab -e
# Add this line:
# 0 0 1 * * certbot renew --quiet --deploy-hook "docker-compose -f /opt/epsm/docker-compose.production.yml restart nginx"
```

**Checklist:**
- [ ] SSL certificates obtained from Let's Encrypt
- [ ] Certificates copied to `nginx/ssl/`
- [ ] Auto-renewal cron job configured
- [ ] Certificate permissions set correctly

---

### Step 7: Create Nginx Configuration
**Status:** ⏳ NOT STARTED

```bash
mkdir -p /opt/epsm/nginx
nano /opt/epsm/nginx/nginx.conf
```

**Copy configuration from:** `docs/DEPLOYMENT_CHALMERS.md` (Step 4)

**Checklist:**
- [ ] `nginx/nginx.conf` created
- [ ] SSL certificate paths configured
- [ ] Backend proxy settings configured
- [ ] SAML endpoints routed correctly
- [ ] Frontend routing configured
- [ ] Client max body size set (100M)

---

### Step 8: Start Services
**Status:** ⏳ NOT STARTED

```bash
cd /opt/epsm

# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

**Checklist:**
- [ ] All Docker images pulled
- [ ] Database container running
- [ ] Redis container running
- [ ] Backend container running
- [ ] Frontend container running
- [ ] Nginx container running
- [ ] All health checks passing
- [ ] No error messages in logs

---

### Step 9: Initialize Database
**Status:** ⏳ NOT STARTED

```bash
# Run migrations
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py migrate

# Collect static files
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py collectstatic --no-input

# Create superuser
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py createsuperuser
```

**Checklist:**
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Superuser account created
- [ ] Database accessible

---

## 🔐 SAML Configuration

### Step 10: Generate SP Metadata
**Status:** ⏳ NOT STARTED

```bash
# Generate SAML SP metadata
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py saml_metadata > /opt/epsm/sp_metadata.xml

# Verify metadata file
cat /opt/epsm/sp_metadata.xml
```

**Checklist:**
- [ ] SP metadata generated
- [ ] Entity ID correct: `https://epsm.chalmers.se/saml/metadata/`
- [ ] ACS URL correct: `https://epsm.chalmers.se/saml/acs/`
- [ ] Contact information present
- [ ] Organization details present

---

### Step 11: Send Metadata to Björn
**Status:** ⏳ NOT STARTED

**Email Template:**
```
Subject: SAML SP Registration for EPSM

Hi Björn,

EPSM is now deployed and accessible at https://epsm.chalmers.se

Please register our Service Provider with the Chalmers IdP:
- Attached: sp_metadata.xml
- Entity ID: https://epsm.chalmers.se/saml/metadata/
- ACS URL: https://epsm.chalmers.se/saml/acs/
- Single Logout URL: https://epsm.chalmers.se/saml/sls/

Entity Category: REFEDS Personalized Access
(https://refeds.org/category/personalized)

Required attributes:
* samlSubjectID or eduPersonPrincipalName (unique identifier)
* mail (urn:oid:0.9.2342.19200300.100.1.3)
* displayName (urn:oid:2.16.840.1.113730.3.1.241)
* givenName (urn:oid:2.5.4.42)
* sn (urn:oid:2.5.4.4)
* eduPersonScopedAffiliation (urn:oid:1.3.6.1.4.1.5923.1.1.1.9)
* schacHomeOrganization (urn:oid:1.3.6.1.4.1.25178.1.2.9)

Privacy Policy: https://epsm.chalmers.se/privacy

Service Purpose: Building energy simulation management for research 
and education at Chalmers. The service enables researchers and students 
to run EnergyPlus simulations, analyze building performance, and evaluate 
energy renovation scenarios.

Please let me know once the SP is registered and ready for testing.

Thanks!
Sanjay

---
Sanjay Somanath
PhD Candidate, Building Technology
Chalmers University of Technology
sanjay.somanath@chalmers.se
```

**Checklist:**
- [ ] Email sent to Björn
- [ ] `sp_metadata.xml` attached
- [ ] Privacy policy URL included
- [ ] Service purpose described
- [ ] All required attributes listed

---

### Step 12: Wait for SAML Registration
**Status:** ⏳ NOT STARTED

**Expected from Björn:**
- [ ] Confirmation that SP is registered
- [ ] Any additional configuration needed
- [ ] Testing instructions
- [ ] Estimated activation time

---

## 🧪 Testing and Validation

### Step 13: Test Basic Functionality
**Status:** ⏳ NOT STARTED

**Web Access:**
- [ ] https://epsm.chalmers.se loads
- [ ] HTTPS redirect works (http → https)
- [ ] No SSL certificate warnings
- [ ] Privacy policy accessible at `/privacy/`
- [ ] Static files loading correctly
- [ ] Frontend rendering properly

**Backend Health:**
```bash
# Test API endpoint
curl https://epsm.chalmers.se/api/test/

# Test database connectivity
curl https://epsm.chalmers.se/api/db-test/

# Check Django admin
# Visit: https://epsm.chalmers.se/admin/
```

**Checklist:**
- [ ] Website accessible via HTTPS
- [ ] API endpoints responding
- [ ] Database connectivity confirmed
- [ ] Django admin accessible
- [ ] No console errors in browser
- [ ] Page load times acceptable

---

### Step 14: Test SAML Login
**Status:** ⏳ NOT STARTED (Requires SAML registration)

**Login Flow Test:**
1. Visit `https://epsm.chalmers.se`
2. Click "Login with Chalmers CID"
3. Redirected to Chalmers IdP
4. Enter CID credentials
5. Redirected back to EPSM
6. Check user session

**Verify User Account:**
```bash
docker-compose -f docker-compose.production.yml exec backend \
  python manage.py shell
```

```python
from django.contrib.auth.models import User

# Check your user
user = User.objects.get(username='ssanjay')  # Use your CID
print(f"Username: {user.username}")
print(f"Email: {user.email}")
print(f"First Name: {user.first_name}")
print(f"Last Name: {user.last_name}")
print(f"Is Staff: {user.is_staff}")
print(f"Is Superuser: {user.is_superuser}")
print(f"Last Login: {user.last_login}")
```

**SAML Attribute Mapping Verification:**
```bash
# Check SAML logs
docker-compose -f docker-compose.production.yml logs backend | grep -i saml

# Check attribute mapping logs
docker-compose -f docker-compose.production.yml logs backend | grep -i "custom_update_user"
```

**Checklist:**
- [ ] SAML login redirects to Chalmers IdP
- [ ] Authentication successful
- [ ] User account created automatically
- [ ] Username matches CID
- [ ] Email populated correctly
- [ ] First/last name populated
- [ ] Staff status assigned (if applicable)
- [ ] Can access EPSM features after login
- [ ] Session persists correctly

---

### Step 15: Test Single Logout (SLO)
**Status:** ⏳ NOT STARTED

1. Login via SAML
2. Click logout in EPSM
3. Verify redirected to IdP SLO
4. Verify logged out from both EPSM and IdP
5. Test accessing EPSM again (should require re-login)

**Checklist:**
- [ ] Logout initiates SAML SLO
- [ ] Redirected to IdP logout page
- [ ] Session cleared in EPSM
- [ ] Session cleared in IdP
- [ ] Cannot access protected pages without re-login

---

### Step 16: Test Application Features
**Status:** ⏳ NOT STARTED

**Core Functionality:**
- [ ] Create new simulation project
- [ ] Upload IDF file
- [ ] Upload EPW file
- [ ] Run baseline simulation
- [ ] Create renovation scenario
- [ ] Run scenario simulation
- [ ] View simulation results
- [ ] Download simulation results
- [ ] View charts and visualizations

**Performance:**
- [ ] Page load times < 2 seconds
- [ ] Simulation execution time reasonable
- [ ] File upload/download working
- [ ] No timeout errors
- [ ] Memory usage stable

---

## 📊 Monitoring and Maintenance

### Step 17: Set Up Monitoring
**Status:** ⏳ NOT STARTED

**Log Monitoring:**
```bash
# View live logs
docker-compose -f docker-compose.production.yml logs -f

# Check specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f database
```

**System Resources:**
```bash
# Check Docker stats
docker stats

# Check disk usage
df -h

# Check service health
docker-compose -f docker-compose.production.yml ps
```

**Checklist:**
- [ ] Log rotation configured
- [ ] Disk space monitoring set up
- [ ] Email alerts configured (optional)
- [ ] Backup strategy defined
- [ ] Update schedule planned

---

### Step 18: Configure Backups
**Status:** ⏳ NOT STARTED

**Database Backup Script:**
```bash
#!/bin/bash
# /opt/epsm/scripts/backup.sh

BACKUP_DIR="/opt/epsm/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f /opt/epsm/docker-compose.production.yml exec -T database \
  pg_dump -U epsm_user epsm_db > $BACKUP_DIR/epsm_db_$DATE.sql

# Backup media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /opt/epsm/backend/media/

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Schedule Daily Backups:**
```bash
chmod +x /opt/epsm/scripts/backup.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /opt/epsm/scripts/backup.sh >> /var/log/epsm_backup.log 2>&1
```

**Checklist:**
- [ ] Backup script created
- [ ] Backup directory created
- [ ] Daily backup cron job configured
- [ ] Backup retention policy set (30 days)
- [ ] Test backup restoration procedure
- [ ] Offsite backup configured (optional)

---

## 📝 Documentation

### Step 19: Update Internal Documentation
**Status:** ⏳ NOT STARTED

**Documents to Update:**
- [ ] Add production URL to README.md
- [ ] Document backup/restore procedure
- [ ] Create troubleshooting guide
- [ ] Document monitoring setup
- [ ] Create runbook for common issues

---

## ✅ Go-Live Checklist

### Final Pre-Launch Verification
**Status:** ⏳ NOT STARTED

- [ ] All services running and healthy
- [ ] SAML login working correctly
- [ ] Privacy policy accessible
- [ ] SSL certificates valid
- [ ] Database migrations applied
- [ ] Static files serving correctly
- [ ] Email notifications working (if configured)
- [ ] Backup system operational
- [ ] Monitoring in place
- [ ] Error logging configured
- [ ] Performance acceptable
- [ ] Security headers configured
- [ ] CSRF protection enabled
- [ ] XSS protection enabled
- [ ] Content Security Policy set

---

## 🎉 Post-Launch

### Step 20: Announce Availability
**Status:** ⏳ NOT STARTED

**Internal Communication:**
- [ ] Notify research group
- [ ] Notify Alexander Hollberg
- [ ] Send announcement to potential users
- [ ] Update project website

**External Communication:**
- [ ] Update GitHub repository README
- [ ] Add production URL to documentation
- [ ] Consider blog post/announcement

---

## 📞 Support Contacts

- **EPSM Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
- **Chalmers IT (Björn):** biorn@chalmers.se, +46 31 772 6600
- **Chalmers IT Support:** support@chalmers.se, +46 31 772 6000
- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)
- **Security/Abuse:** abuse@chalmers.se, +46 31 772 8450

---

## 📚 Reference Documents

- `docs/DEPLOYMENT_CHALMERS.md` - Full deployment guide
- `docs/PRIVACY_POLICY.md` - Privacy policy document
- `docs/SAML_QUICK_REFERENCE.md` - SAML quick reference
- `docs/EMAIL_TO_BJORN_RESPONSE.txt` - Email template
- `change summary/REFEDS_PERSONALIZED_ACCESS_IMPLEMENTATION.md` - Technical details

---

**Checklist Version:** 1.0  
**Last Updated:** 7 October 2025  
**Target Go-Live:** TBD (pending VM provisioning)
