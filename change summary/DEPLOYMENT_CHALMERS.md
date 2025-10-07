# EPSM Production Deployment - Chalmers Infrastructure

## 🎯 Deployment Readiness Status

### ✅ Completed

**Backend Infrastructure:**
- [x] Production Django settings with SAML SSO support
- [x] SAML authentication backend (djangosaml2 with pysaml2)
- [x] Custom SAML attribute mapping for REFEDS Personalized Access
- [x] Production requirements with SAML dependencies
- [x] Updated Dockerfile with SAML system libraries
- [x] Docker Compose production configuration
- [x] Authentication API endpoints (local + SAML)
- [x] Backend prepared for ghcr.io Docker images

**SAML & Privacy Compliance:**
- [x] REFEDS Personalized Access entity category implementation
- [x] SAML attribute mapping (eduPersonPrincipalName, samlSubjectID, etc.)
- [x] Privacy Policy document (GDPR + REFEDS compliant)
- [x] Privacy Policy web view at `/privacy/` endpoint
- [x] Privacy Policy HTML template with professional styling
- [x] IdP metadata URL confirmed: `https://www.ita.chalmers.se/idp.chalmers.se.xml`
- [x] Contact information for SAML SP registration

**Documentation:**
- [x] Comprehensive deployment guide (this document)
- [x] SAML quick reference guide
- [x] Step-by-step deployment checklist
- [x] Email templates for IT communication
- [x] Technical implementation summary

### 📋 Remaining Tasks (Before First Deployment)

**VM Provisioning & Infrastructure:**
1. **Order VM from Chalmers IT** ✅ CONFIRMED (7 Oct 2025)  
   - **VM Hostname:** `epsm.ita.chalmers.se`
   - **Service Domain:** `epsm.chalmers.se` (no www subdomain)
   - **Host IP:** 129.16.69.25
   - **OS:** Red Hat Enterprise Linux 9
   - **Platform:** VMware
   - **Action:** Wait for final VM provisioning and SSH access credentials

2. **Receive VM Access** ⏳ PENDING  
   - SSH credentials and VM hostname
   - Network configuration details
   - DNS verification for `epsm.chalmers.se`

**Deployment Tasks (After VM Provisioning):**

3. **Install Docker & Prerequisites** ⏳ NOT STARTED  
   - Install Docker and Docker Compose on VM
   - Install certbot for SSL certificates
   - System updates and security patches

4. **Obtain SSL Certificates** ⏳ NOT STARTED  
   - Let's Encrypt recommended by Björn
   - Alternative: Harica (1-year certificates, manual process)
   - Configure auto-renewal for Let's Encrypt

5. **Create Nginx Configuration** ⏳ NOT STARTED  
   - Configure reverse proxy (template provided below)
   - Set up SSL certificate paths
   - Configure SAML endpoint routing

6. **Create Environment File** ⏳ NOT STARTED  
   - Generate SECRET_KEY (50+ characters)
   - Set database credentials
   - Configure SAML_IDP_METADATA_URL
   - Set email configuration (optional)

7. **Deploy Application** ⏳ NOT STARTED  
   - Clone repository to `/opt/epsm`
   - Start Docker services
   - Run database migrations
   - Collect static files
   - Create superuser account

**SAML Configuration (After Deployment):**

8. **Generate SP Metadata** ⏳ NOT STARTED  
   - Run `python manage.py saml_metadata`
   - Verify Entity ID and ACS URL

9. **Register with Chalmers IdP** ⏳ NOT STARTED  
   - Send SP metadata to Björn
   - Include privacy policy URL
   - Specify REFEDS Personalized Access entity category
   - Wait for SAML registration confirmation

10. **Test SAML Integration** ⏳ NOT STARTED  
    - Test login with Chalmers CID
    - Verify attribute mapping
    - Test Single Logout (SLO)
    - Verify user permissions

**Optional (Nice to Have):**

11. **Update Frontend for SAML** ⏳ OPTIONAL  
    - Update LoginPage.tsx with "Login with Chalmers CID" button
    - Add SAML-specific UI elements
    - Improve user experience for SSO

12. **Configure Monitoring** ⏳ OPTIONAL  
    - Set up log monitoring
    - Configure error alerts
    - Disk space monitoring
    - Performance metrics

13. **Set Up Automated Backups** ⏳ OPTIONAL  
    - Database backup script
    - Media files backup
    - Backup retention policy (30 days)
    - Test restore procedure

---

## 📦 What's Been Prepared

### Backend Changes

**1. Production Settings** (`backend/config/settings/production.py`)
- SAML SSO configuration with REFEDS Personalized Access
- Chalmers Identity Provider integration
- IdP Metadata URL: `https://www.ita.chalmers.se/idp.chalmers.se.xml`
- Security headers (HSTS, CSP, etc.)
- Session management
- Logging configuration

**2. SAML Integration** (`backend/config/saml_hooks.py`)
- Maps REFEDS Personalized Access attributes to Django User
- Supports: eduPersonPrincipalName, samlSubjectID, displayName, givenName, sn
- Handles eduPersonScopedAffiliation for role assignment
- Automatic user creation on first login
- Staff/superuser assignment based on affiliation
- CID becomes username (e.g., 'ssanjay')

**3. Privacy Policy** (`docs/PRIVACY_POLICY.md` + web view)
- GDPR and REFEDS Personalized Access compliant
- Accessible at `/privacy/` endpoint
- Details data collection, usage, retention, and user rights
- Required for REFEDS entity category registration

**4. Authentication Views** (`backend/simulation/auth_views.py`)
- `/api/auth/login-info/` - Determines auth method (local vs SAML)
- `/api/auth/current-user/` - Returns logged-in user info
- `/api/auth/local-login/` - Development-only local auth
- `/api/auth/logout-view/` - Handles SAML Single Logout

**5. Updated Dependencies** (`backend/requirements.prod.txt`)
```
pysaml2==7.5.0
djangosaml2==1.9.3
markdown==3.5.1  # For privacy policy rendering
sentry-sdk==1.40.0  # Optional error tracking
```

**6. Updated Dockerfile** (`backend/Dockerfile.prod`)
- Added SAML system libraries (libxml2-dev, libxmlsec1-dev, xmlsec1)
- Configured for production gunicorn deployment

### Infrastructure

**Docker Compose Production** (`docker-compose.production.yml`)
- PostgreSQL 15 database
- Redis 7 cache
- Backend (Django + Gunicorn + Celery)
- Frontend (React + Nginx)
- Nginx reverse proxy
- All services with health checks
- Persistent volumes for data

---

## 🚀 Quick Start Deployment Guide

### Step 1: VM Setup (After IT Provisions)

```bash
# SSH into VM (confirmed hostname: epsm.ita.chalmers.se)
# Service URL will be: https://epsm.chalmers.se (no www)
# Replace 'your-cid' with your Chalmers CID (e.g., ssanjay)
ssh your-cid@epsm.ita.chalmers.se

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
cd /opt
sudo git clone https://github.com/snjsomnath/epsm.git
sudo chown -R $USER:$USER epsm
cd epsm
git checkout tags/v0.2.0  # Or latest version
```

### Step 2: Configure Environment

```bash
# Create production environment file
nano .env.production
```

**Required `.env.production` content:**
```bash
# Django
SECRET_KEY=your-50-char-random-secret-here
DEBUG=False

# Database
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=your-secure-password

# SAML
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml

# Docker Images
VERSION=0.2.0

# Optional: Email
EMAIL_HOST=smtp.chalmers.se
EMAIL_HOST_USER=your-email@chalmers.se
EMAIL_HOST_PASSWORD=your-password

# Optional: Sentry
SENTRY_DSN=
```

**Generate SECRET_KEY:**
```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Step 3: SSL Certificates

**Option A: Let's Encrypt** (Recommended by Björn)
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d epsm.chalmers.se

# Copy certificates
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl

# Auto-renewal
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet && docker-compose -f /opt/epsm/docker-compose.production.yml restart nginx
```

**Note:** Only `epsm.chalmers.se` is configured (no www subdomain) as confirmed by Chalmers IT.

**Note:** Björn mentions Apache module `mod_md` works well with minimal configuration for Let's Encrypt automation.

**Option B: Harica** (1-year certificates)
Chalmers provides Harica certificates that last 1 year but require manual request/retrieval steps. Contact Björn for Swedish instructions if you prefer this option.

### Step 4: Create Nginx Configuration

Create `nginx/nginx.conf`:
```nginx
user nginx;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    client_max_body_size 100M;
    keepalive_timeout 65;

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name epsm.chalmers.se;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name epsm.chalmers.se;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        
        # Backend API
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SAML endpoints
        location /saml/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /app/staticfiles/;
        }

        # Media files
        location /media/ {
            alias /app/media/;
        }

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
        }
    }
}
```

### Step 5: Deploy

```bash
# Pull images
docker-compose -f docker-compose.production.yml pull

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Create superuser
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

### Step 6: Configure SAML

```bash
# Generate SP metadata
docker-compose -f docker-compose.production.yml exec backend python manage.py saml_metadata > sp_metadata.xml

# Send sp_metadata.xml to Björn (it-support@chalmers.se)
```

**Email to Björn (After Deployment):**
```
Subject: SAML SP Registration for EPSM

Hi Björn,

EPSM is now deployed at https://epsm.chalmers.se

Please register our Service Provider with the Chalmers IdP:
- Attached: sp_metadata.xml
- Entity ID: https://epsm.chalmers.se/saml/metadata/
- ACS URL: https://epsm.chalmers.se/saml/acs/
- Entity Category: REFEDS Personalized Access (https://refeds.org/category/personalized)
- Required attributes from REFEDS Personalized Access bundle:
  * samlSubjectID (urn:oasis:names:tc:SAML:attribute:subject-id)
  * mail (urn:oid:0.9.2342.19200300.100.1.3)
  * displayName (urn:oid:2.16.840.1.113730.3.1.241)
  * givenName (urn:oid:2.5.4.42)
  * sn (urn:oid:2.5.4.4)
  * eduPersonScopedAffiliation (urn:oid:1.3.6.1.4.1.5923.1.1.1.9)
  * schacHomeOrganization (urn:oid:1.3.6.1.4.1.25178.1.2.9)
- Privacy Policy: https://epsm.chalmers.se/privacy (will be published)

Purpose: Building energy simulation management for research and education at Chalmers.

Thanks!
Sanjay
```

---

## 🔐 User Login Flow

1. User visits `https://epsm.chalmers.se`
2. Clicks "Login with Chalmers CID"
3. Redirected to Chalmers IdP
4. Enters CID credentials (e.g., `ssanjay` / password)
5. IdP validates and sends SAML assertion
6. EPSM creates/updates user account:
   - Username: `ssanjay` (CID)
   - Email: `ssanjay@chalmers.se`
   - Name: From SAML attributes
7. User logged into EPSM

---

## 📞 Support Contacts

- **EPSM Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
- **Chalmers IT:** Björn (it-support@chalmers.se), +46 31 772 6600
- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)

---

## 💰 Estimated Cost

- Base system: 1,400 kr/year
- RAM (8 GB): 1,840 kr/year
- Disk (100 GB): 400 kr/year
- **Total: ~3,640 kr/year (~$350 USD/year)**

---

## 🎉 Next Steps

1. ✅ Order VM from Chalmers IT (Confirmed: 7 Oct 2025)
   - VM: `epsm.ita.chalmers.se` (129.16.69.25)
   - Service: `epsm.chalmers.se` (no www)
   - OS: Red Hat Enterprise Linux 9
2. ⏳ Receive SSH credentials and access (waiting for IT)
3. ⏳ Deploy using this guide
4. ⏳ Configure SAML with Björn
5. ⏳ Test login with your CID
6. ✅ EPSM Production Ready!

---

**Document Version:** 1.0  
**Last Updated:** 7 October 2025  
**EPSM Version:** 0.2.0 (Production Ready)
