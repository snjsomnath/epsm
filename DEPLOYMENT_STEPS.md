# EPSM Production Deployment - Quick Start Guide

**Target VM:** `epsm.ita.chalmers.se` (129.16.69.25)  
**Service URL:** `epsm.chalmers.se` (no www subdomain)  
**OS:** Red Hat Enterprise Linux 9  
**Date:** October 2025

---

## Step 1: Test SSH Access

First, verify you can access the VM:

```bash
# From your local machine
ssh ssanjay@epsm.ita.chalmers.se

# Or if you need to use your Chalmers CID
ssh your-cid@epsm.ita.chalmers.se
```

**If SSH fails:**
- Verify the VM is provisioned and running
- Check if you received SSH credentials from Chalmers IT
- Confirm your public key is installed on the VM

---

## Step 2: Install Docker and Prerequisites

Once logged into the VM:

```bash
# Update system packages
sudo dnf update -y

# Install Docker (Red Hat method)
sudo dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install certbot for SSL
sudo dnf install certbot -y

# Install git (if not already installed)
sudo dnf install git -y

# Log out and back in for group changes to take effect
exit
```

Then SSH back in:
```bash
ssh ssanjay@epsm.ita.chalmers.se
```

Verify installations:
```bash
docker --version
docker-compose --version
certbot --version
git --version
```

---

## Step 3: Clone Repository

```bash
# Create directory
sudo mkdir -p /opt/epsm
sudo chown -R $USER:$USER /opt/epsm

# Clone repository
cd /opt
git clone https://github.com/snjsomnath/epsm.git
cd epsm

# Checkout the latest stable version (or specific tag)
git checkout main
# OR for a specific version: git checkout tags/v0.2.2
```

---

## Step 4: Create Environment File

```bash
cd /opt/epsm
nano .env.production
```

Copy and paste this content (update the SECRET_KEY and passwords):

```bash
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=CHANGE_THIS_TO_A_RANDOM_50_CHAR_STRING
DEBUG=False
ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se

# Database
POSTGRES_DB=epsm_db
POSTGRES_USER=epsm_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_DB_PASSWORD

# Database Password (for docker-compose)
DB_PASSWORD=CHANGE_THIS_SECURE_DB_PASSWORD

# SAML
SAML_IDP_METADATA_URL=https://www.ita.chalmers.se/idp.chalmers.se.xml

# Docker
VERSION=0.2.2

# Redis (optional but recommended)
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# Email (optional - for notifications)
EMAIL_HOST=smtp.chalmers.se
EMAIL_HOST_USER=sanjay.somanath@chalmers.se
EMAIL_HOST_PASSWORD=YOUR_EMAIL_PASSWORD
EMAIL_PORT=587
EMAIL_USE_TLS=True

# Error Tracking (optional)
SENTRY_DSN=
```

**Generate a secure SECRET_KEY:**
```bash
python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
```

**Generate secure passwords:**
```bash
# For database
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'

# For Redis
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
```

Save and exit (Ctrl+X, Y, Enter)

---

## Step 5: Obtain SSL Certificates

**IMPORTANT:** Before running certbot, make sure:
- DNS for `epsm.chalmers.se` points to your VM IP (129.16.69.25)
- Port 80 is open and accessible
- No other web server is running on port 80

```bash
# Stop any running services first
cd /opt/epsm
docker-compose -f docker-compose.prod.yml down

# Obtain certificates with certbot
sudo certbot certonly --standalone \
  -d epsm.chalmers.se \
  --email sanjay.somanath@chalmers.se \
  --agree-tos \
  --no-eff-email

# Create SSL directory
mkdir -p /opt/epsm/.docker/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/fullchain.pem /opt/epsm/.docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/privkey.pem /opt/epsm/.docker/nginx/ssl/
sudo chown -R $USER:$USER /opt/epsm/.docker/nginx/ssl

# Set up auto-renewal (every month)
sudo crontab -e
# Add this line:
# 0 0 1 * * certbot renew --quiet --deploy-hook "docker-compose -f /opt/epsm/docker-compose.prod.yml restart nginx"
```

---

## Step 6: Create Nginx Configuration

```bash
mkdir -p /opt/epsm/.docker/nginx
nano /opt/epsm/.docker/nginx/nginx.conf
```

Paste this configuration:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    client_max_body_size 100M;

    gzip on;
    gzip_disable "msie6";

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name epsm.chalmers.se;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name epsm.chalmers.se;

        # SSL certificates
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Backend API
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # SAML endpoints
        location /saml/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Admin panel
        location /admin/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Privacy policy
        location /privacy/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

        # Media files
        location /media/ {
            alias /app/media/;
            expires 7d;
        }

        # Frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

Create the Nginx Dockerfile:

```bash
nano /opt/epsm/.docker/nginx/Dockerfile
```

Paste:

```dockerfile
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories for static files
RUN mkdir -p /var/www/static /app/media

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

---

## Step 7: Deploy Docker Containers

```bash
cd /opt/epsm

# Load environment variables
export $(cat .env.production | xargs)

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs (Ctrl+C to exit)
docker-compose -f docker-compose.prod.yml logs -f
```

**Expected output:**
- All services should show "Up" status
- Database, Redis, Backend, Frontend, and Nginx containers running

---

## Step 8: Initialize Database and Create Superuser

```bash
cd /opt/epsm

# Wait for database to be ready (about 30 seconds)
sleep 30

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --no-input

# Create superuser account
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
# Enter email: sanjay.somanath@chalmers.se
# Enter password: (choose a strong password)
```

---

## Step 9: Verify Deployment

### Test Web Access

Open your browser and visit:
- **Main site:** https://epsm.chalmers.se
- **Admin panel:** https://epsm.chalmers.se/admin
- **Privacy policy:** https://epsm.chalmers.se/privacy
- **API test:** https://epsm.chalmers.se/api/health/

### Check Service Health

```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# View backend logs
docker-compose -f docker-compose.prod.yml logs backend

# View nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Check database
docker-compose -f docker-compose.prod.yml exec database pg_isready -U epsm_user -d epsm_db
```

---

## Step 10: Configure SAML (After Deployment)

### Generate SAML Metadata

```bash
cd /opt/epsm
docker-compose -f docker-compose.prod.yml exec backend python manage.py saml_metadata > sp_metadata.xml

# View the metadata
cat sp_metadata.xml
```

### Send to Chalmers IT

Email Björn (biorn@chalmers.se) with:

**Subject:** SAML SP Registration for EPSM

**Body:**
```
Hi Björn,

EPSM is now deployed and accessible at https://epsm.chalmers.se

Please register our Service Provider with the Chalmers IdP:
- Attached: sp_metadata.xml
- Entity ID: https://epsm.chalmers.se/saml/metadata/
- ACS URL: https://epsm.chalmers.se/saml/acs/
- Single Logout URL: https://epsm.chalmers.se/saml/sls/

Entity Category: REFEDS Personalized Access
(https://refeds.org/category/personalized)

Privacy Policy: https://epsm.chalmers.se/privacy

Required attributes from REFEDS Personalized Access bundle:
* samlSubjectID or eduPersonPrincipalName (unique identifier)
* mail (urn:oid:0.9.2342.19200300.100.1.3)
* displayName (urn:oid:2.16.840.1.113730.3.1.241)
* givenName (urn:oid:2.5.4.42)
* sn (urn:oid:2.5.4.4)
* eduPersonScopedAffiliation (urn:oid:1.3.6.1.4.1.5923.1.1.1.9)
* schacHomeOrganization (urn:oid:1.3.6.1.4.1.25178.1.2.9)

Service Purpose: Building energy simulation management for research 
and education at Chalmers. The service enables researchers and students 
to run EnergyPlus simulations, analyze building performance, and evaluate 
energy renovation scenarios.

Please let me know once the SP is registered and ready for testing.

Thanks!
Sanjay Somanath
sanjay.somanath@chalmers.se
```

---

## Ongoing Maintenance

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Update Application
```bash
cd /opt/epsm
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --no-input
```

### Backup Database
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec -T database \
  pg_dump -U epsm_user epsm_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup_YYYYMMDD_HHMMSS.sql | \
  docker-compose -f docker-compose.prod.yml exec -T database \
  psql -U epsm_user -d epsm_db
```

---

## Troubleshooting

### Port conflicts
```bash
# Check what's using ports
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### Certificate issues
```bash
# Test SSL
curl -I https://epsm.chalmers.se

# Renew certificates manually
sudo certbot renew
```

### Container issues
```bash
# Stop all
docker-compose -f docker-compose.prod.yml down

# Remove volumes (CAUTION: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

---

## Support Contacts

- **EPSM Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
- **Chalmers IT:** Björn (biorn@chalmers.se), +46 31 772 6600
- **Chalmers IT Support:** support@chalmers.se, +46 31 772 6000

---

**Good luck with the deployment! 🚀**
