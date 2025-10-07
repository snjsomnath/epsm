# EPSM Production Deployment - Chalmers Infrastructure

## 🎯 Deployment Readiness Status

### ✅ Completed
- [x] Production Django settings with SAML SSO support
- [x] SAML authentication backend (djangosaml2)
- [x] Custom SAML attribute mapping for Chalmers CID
- [x] Production requirements with SAML dependencies
- [x] Updated Dockerfile with SAML system libraries
- [x] Docker Compose production configuration
- [x] Authentication API endpoints (local + SAML)
- [x] Backend prepared for ghcr.io Docker images

### 📋 Remaining Tasks (Before First Deployment)

1. **Order VM from Chalmers IT** ⏳ IN PROGRESS  
   URL: https://intranet.chalmers.se/en/tools-support/general-support-services/it/it-services/order-virtual-machine/

2. **Create Nginx configuration** (see templates below)
3. **Create deployment scripts** (see scripts below)
4. **Update frontend for SAML** (LoginPage.tsx changes)
5. **Create environment file** (.env.production)
6. **Obtain SSL certificates** (Let's Encrypt or Harica)
7. **Configure SAML with IT** (get IdP metadata URL)

---

## 📦 What's Been Prepared

### Backend Changes

**1. Production Settings** (`backend/config/settings/production.py`)
- SAML SSO configuration
- Chalmers Identity Provider integration
- Security headers (HSTS, CSP, etc.)
- Session management
- Logging configuration

**2. SAML Integration** (`backend/config/saml_hooks.py`)
- Maps Chalmers attributes (uid, mail, givenName, sn) to Django User
- Automatic user creation on first login
- Staff/superuser assignment based on affiliation
- CID becomes username (e.g., 'ssanjay')

**3. Authentication Views** (`backend/simulation/auth_views.py`)
- `/api/auth/login-info/` - Determines auth method (local vs SAML)
- `/api/auth/current-user/` - Returns logged-in user info
- `/api/auth/local-login/` - Development-only local auth
- `/api/auth/logout-view/` - Handles SAML Single Logout

**4. Updated Dependencies** (`backend/requirements.prod.txt`)
```
python3-saml==1.16.0
djangosaml2==1.9.3
xmlsec==1.3.13
sentry-sdk==1.40.0  # Optional error tracking
```

**5. Updated Dockerfile** (`backend/Dockerfile.prod`)
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
# SSH into VM
ssh your-cid@epsm.chalmers.se

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

# SAML (get from Björn)
SAML_IDP_METADATA_URL=https://idp.chalmers.se/idp/shibboleth

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

**Option A: Let's Encrypt** (Recommended)
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d epsm.chalmers.se -d www.epsm.chalmers.se

# Copy certificates
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem nginx/ssl/
sudo chown -R $USER:$USER nginx/ssl

# Auto-renewal
sudo crontab -e
# Add: 0 0 1 * * certbot renew --quiet && docker-compose -f /opt/epsm/docker-compose.production.yml restart nginx
```

**Option B: Harica** (Chalmers-provided)
Contact Björn to obtain Harica certificates and place them in `nginx/ssl/`.

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
        server_name epsm.chalmers.se www.epsm.chalmers.se;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name epsm.chalmers.se www.epsm.chalmers.se;

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

**Email to Björn:**
```
Subject: SAML SP Registration for EPSM

Hi Björn,

EPSM is now deployed at https://epsm.chalmers.se

Please register our Service Provider with the Chalmers IdP:
- Attached: sp_metadata.xml
- Entity ID: https://epsm.chalmers.se/saml/metadata/
- ACS URL: https://epsm.chalmers.se/saml/acs/
- Required attributes: uid, mail, givenName, sn, eduPersonAffiliation

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

1. ✅ Order VM from Chalmers IT
2. ⏳ Wait for VM provisioning (1-2 weeks)
3. ⏳ Deploy using this guide
4. ⏳ Configure SAML with Björn
5. ⏳ Test login with your CID
6. ✅ EPSM Production Ready!

---

**Document Version:** 1.0  
**Last Updated:** 7 October 2025  
**EPSM Version:** 0.2.0 (Production Ready)
