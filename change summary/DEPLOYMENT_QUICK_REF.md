# EPSM Deployment - Quick Reference Card

## 🎯 VM Details
- **Hostname:** `epsm.ita.chalmers.se`
- **IP Address:** `129.16.69.25`
- **Service URL:** `https://epsm.chalmers.se` (no www)
- **OS:** Red Hat Enterprise Linux 9

## 📋 Deployment Checklist

### 1. First Time Setup (On VM)
```bash
# SSH to VM
ssh ssanjay@epsm.ita.chalmers.se

# Install Docker and tools (see DEPLOYMENT_STEPS.md)
sudo dnf install docker-ce docker-compose git certbot -y

# Clone repo
cd /opt
sudo git clone https://github.com/snjsomnath/epsm.git
sudo chown -R $USER:$USER epsm
cd epsm
```

### 2. Configure Environment
```bash
cd /opt/epsm
nano .env.production

# Required variables:
# - DJANGO_SECRET_KEY
# - DB_PASSWORD
# - REDIS_PASSWORD
# - SAML_IDP_METADATA_URL
# - ALLOWED_HOSTS=epsm.chalmers.se,epsm.ita.chalmers.se
```

### 3. Get SSL Certificates
```bash
sudo certbot certonly --standalone -d epsm.chalmers.se
mkdir -p .docker/nginx/ssl
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/*.pem .docker/nginx/ssl/
```

### 4. Deploy Application
```bash
# Automated deployment
./scripts/deploy-prod.sh

# OR Manual deployment
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 5. Create Superuser
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 6. Configure SAML
```bash
# Generate metadata
docker-compose -f docker-compose.prod.yml exec backend python manage.py saml_metadata > sp_metadata.xml

# Send sp_metadata.xml to biorn@chalmers.se
```

---

## 🔧 Common Management Tasks

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Update Application
```bash
cd /opt/epsm
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Backup Database
```bash
docker-compose -f docker-compose.prod.yml exec -T database \
  pg_dump -U epsm_user epsm_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Interactive Management Menu
```bash
./scripts/manage-prod.sh
```

---

## 📂 Important Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT_STEPS.md` | Complete step-by-step deployment guide |
| `.env.production` | Production environment variables |
| `docker-compose.prod.yml` | Production Docker configuration |
| `.docker/nginx/nginx.conf` | Nginx configuration |
| `.docker/nginx/ssl/` | SSL certificates directory |
| `scripts/deploy-prod.sh` | Automated deployment script |
| `scripts/manage-prod.sh` | Management menu script |

---

## 🌐 URLs to Test

After deployment, verify these URLs:
- https://epsm.chalmers.se - Main application
- https://epsm.chalmers.se/admin - Django admin
- https://epsm.chalmers.se/privacy - Privacy policy
- https://epsm.chalmers.se/api/health/ - API health check

---

## 📞 Contacts

- **Developer:** Sanjay Somanath (sanjay.somanath@chalmers.se)
- **Chalmers IT:** Björn (biorn@chalmers.se), +46 31 772 6600
- **IT Support:** support@chalmers.se, +46 31 772 6000

---

## 🚨 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### SSL certificate errors
```bash
# Renew certificates
sudo certbot renew

# Copy to nginx
sudo cp /etc/letsencrypt/live/epsm.chalmers.se/*.pem .docker/nginx/ssl/
docker-compose -f docker-compose.prod.yml restart nginx
```

### Database issues
```bash
# Check database health
docker-compose -f docker-compose.prod.yml exec database pg_isready -U epsm_user -d epsm_db

# Access database
docker-compose -f docker-compose.prod.yml exec database psql -U epsm_user -d epsm_db
```

---

**Last Updated:** October 2025  
**Version:** 0.2.2+
