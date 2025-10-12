# Production Deployment Scripts

This directory contains automated scripts for deploying EPSM on the Chalmers production VM.

## Scripts

### 1. `install-production.sh` - Clean Install Script

**Purpose:** Sets up EPSM from scratch on a fresh Red Hat Enterprise Linux 9 VM.

**What it does:**
- ✅ Installs Docker and Docker Compose
- ✅ Installs Git and Certbot
- ✅ Configures firewall (opens ports 80, 443)
- ✅ Clones the EPSM repository
- ✅ Obtains SSL certificates from Let's Encrypt
- ✅ Creates `.env` configuration file with secure random keys
- ✅ Creates Nginx configuration

**Usage:**
```bash
# Run as root or with sudo
sudo bash /opt/epsm/scripts/install-production.sh
```

**Requirements:**
- Fresh RHEL 9 VM
- Root access
- DNS configured (epsm.chalmers.se → VM IP)
- Ports 80 and 443 accessible

---

### 2. `deploy-production.sh` - Deployment Script

**Purpose:** Deploys or updates the EPSM application.

**What it does:**
- ✅ Checks environment (Docker, .env, SSL)
- ✅ Stops running services
- ✅ Pulls latest code from GitHub
- ✅ Pulls latest Docker images
- ✅ Starts all services
- ✅ Runs database migrations
- ✅ Collects static files
- ✅ Generates SAML metadata

**Usage:**
```bash
# Run from any directory (will cd to /opt/epsm)
bash /opt/epsm/scripts/deploy-production.sh
```

**Requirements:**
- `install-production.sh` must have been run first
- `.env` file configured
- SSL certificates in place

---

## Quick Start for New VM

### Step 1: Initial Setup (First Time Only)

```bash
# SSH into the VM
ssh your-cid@epsm.ita.chalmers.se

# Clone the repository (if not already done)
cd /opt
sudo git clone https://github.com/snjsomnath/epsm.git

# Run the installation script
cd epsm
sudo bash scripts/install-production.sh
```

This will:
1. Install all dependencies
2. Obtain SSL certificates
3. Create configuration files

### Step 2: Customize Configuration

```bash
# Edit environment variables if needed
sudo nano /opt/epsm/.env
```

### Step 3: Deploy the Application

```bash
# Run the deployment script
cd /opt/epsm
bash scripts/deploy-production.sh
```

### Step 4: Create Django Superuser

```bash
# Create an admin user
docker-compose -f docker-compose.production.yml exec backend python manage.py createsuperuser
```

### Step 5: Share SAML Metadata

Send this URL to Björn for SAML integration:
- **SAML Metadata:** `https://epsm.chalmers.se/saml/metadata/`

---

## Updating the Application

To deploy updates after the initial setup:

```bash
cd /opt/epsm
bash scripts/deploy-production.sh
```

This will:
1. Pull latest code
2. Pull latest Docker images
3. Restart services
4. Run migrations
5. Collect static files

---

## Troubleshooting

### Check Service Status
```bash
cd /opt/epsm
docker-compose -f docker-compose.production.yml ps
```

### View Logs
```bash
# Backend logs
docker-compose -f docker-compose.production.yml logs -f backend

# Frontend logs
docker-compose -f docker-compose.production.yml logs -f frontend

# All services
docker-compose -f docker-compose.production.yml logs -f
```

### Restart Services
```bash
cd /opt/epsm
docker-compose -f docker-compose.production.yml restart
```

### Rebuild Containers
```bash
cd /opt/epsm
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

### SSL Certificate Renewal
```bash
# Renew SSL certificates (auto-renewed by certbot)
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem /opt/epsm/nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem /opt/epsm/nginx/ssl/

# Restart nginx
docker-compose -f docker-compose.production.yml restart nginx
```

---

## Application URLs

After successful deployment:

- **Frontend:** https://epsm.chalmers.se
- **Admin Panel:** https://epsm.chalmers.se/admin/
- **SAML Metadata:** https://epsm.chalmers.se/saml/metadata/
- **Privacy Policy:** https://epsm.chalmers.se/privacy/

---

## Environment Variables

Key variables in `.env`:

```bash
# Django
SECRET_KEY=<random-secret-key>
DEBUG=False
ALLOWED_HOSTS=epsm.chalmers.se

# Database
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=<random-password>

# SAML
SAML_ENABLED=True
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml
SAML_ENTITY_ID=https://epsm.chalmers.se/saml/metadata/
SAML_ACS_URL=https://epsm.chalmers.se/saml/acs/
```

---

## Support

For issues or questions:
- **Principal Investigator:** Alexander Hollberg (alexander.hollberg@chalmers.se)
- **Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
- **Chalmers IT:** Björn (SAML/infrastructure support)
