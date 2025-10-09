# Docker Compose Files - Production Strategy

## 📋 Available Files

You currently have two production Docker Compose files:

### 1. `docker-compose.prod.yml` ⭐ **RECOMMENDED FOR VM DEPLOYMENT**

**Purpose:** Build images locally from source code

**Features:**
- Builds Docker images on the VM from source
- Uses `Dockerfile.prod` for backend and frontend
- Database exports and migrations included
- Full Celery worker and beat services
- Nginx with SSL configuration

**Use When:**
- Deploying to Chalmers VM
- You want to build from source
- Making frequent code changes
- Don't have CI/CD pipeline set up

**Command:**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

### 2. `docker-compose.production.yml` (Alternative)

**Purpose:** Use pre-built Docker images from GitHub Container Registry

**Features:**
- Uses pre-built images: `ghcr.io/snjsomnath/epsm-backend:VERSION`
- Requires GitHub Container Registry setup
- Faster deployment (no build time)
- Better for CI/CD pipelines

**Use When:**
- You have automated CI/CD building images
- Images are published to GitHub Container Registry
- Want faster deployments (no build step)
- Running in multiple environments

**Command:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## ✅ Recommendation: Use `docker-compose.prod.yml`

For your Chalmers VM deployment, **use `docker-compose.prod.yml`** because:

1. ✅ **Simpler setup** - No need for GitHub Container Registry
2. ✅ **Full control** - Build from source with latest changes
3. ✅ **Better for development** - Easy to make quick fixes
4. ✅ **Includes all services** - Database, Redis, Celery, Nginx
5. ✅ **Already updated** - Has SSL paths and all configurations ready

---

## 🔄 When to Use Each File

| Scenario | File to Use |
|----------|-------------|
| **First deployment to Chalmers VM** | `docker-compose.prod.yml` |
| **Making code changes and testing** | `docker-compose.prod.yml` |
| **Production with CI/CD pipeline** | `docker-compose.production.yml` |
| **Multiple production servers** | `docker-compose.production.yml` |
| **Need fastest deployment** | `docker-compose.production.yml` |

---

## 📝 Key Differences

| Feature | `docker-compose.prod.yml` | `docker-compose.production.yml` |
|---------|---------------------------|----------------------------------|
| **Image Source** | Built locally | Pre-built from ghcr.io |
| **Build Time** | ~5-10 minutes | ~1 minute (pull only) |
| **Requires GitHub Registry** | No | Yes |
| **Database Init Scripts** | Included | Included |
| **SSL Configuration** | `.docker/nginx/ssl/` | `./nginx/ssl/` |
| **Environment Variables** | `.env.production` | `.env.production` |
| **Nginx Config** | `.docker/nginx/nginx.conf` | `./nginx/nginx.conf` |

---

## 🚀 Quick Start (Recommended Approach)

### For Chalmers VM Deployment:

```bash
# 1. Use docker-compose.prod.yml
cd /opt/epsm

# 2. Create environment file
nano .env.production

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Initialize
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

---

## 🔧 Future: Setting Up GitHub Container Registry (Optional)

If you later want to use `docker-compose.production.yml`, you'll need to:

1. **Enable GitHub Container Registry:**
   ```bash
   # In your GitHub repo settings, enable GitHub Packages
   ```

2. **Build and push images:**
   ```bash
   # Tag version
   export VERSION=0.2.2
   
   # Build and push backend
   docker build -t ghcr.io/snjsomnath/epsm-backend:$VERSION -f backend/Dockerfile.prod backend/
   docker push ghcr.io/snjsomnath/epsm-backend:$VERSION
   
   # Build and push frontend
   docker build -t ghcr.io/snjsomnath/epsm-frontend:$VERSION -f frontend/Dockerfile.prod frontend/
   docker push ghcr.io/snjsomnath/epsm-frontend:$VERSION
   ```

3. **Deploy using production file:**
   ```bash
   export VERSION=0.2.2
   docker-compose -f docker-compose.production.yml up -d
   ```

---

## 📌 All Scripts Now Use `docker-compose.prod.yml`

The deployment scripts have been configured to use `docker-compose.prod.yml`:
- ✅ `scripts/deploy-prod.sh`
- ✅ `scripts/manage-prod.sh`
- ✅ `DEPLOYMENT_STEPS.md`
- ✅ `DEPLOYMENT_QUICK_REF.md`

---

## 🗑️ Should You Delete One?

**No, keep both files:**

- Keep `docker-compose.prod.yml` for current VM deployment
- Keep `docker-compose.production.yml` for future CI/CD setup
- Consider renaming for clarity:
  - `docker-compose.prod.yml` → Stay as is (main production file)
  - `docker-compose.production.yml` → Could rename to `docker-compose.registry.yml` or `docker-compose.cicd.yml`

---

## 📝 Updated Documentation

All deployment documentation now consistently references `docker-compose.prod.yml`:
- `DEPLOYMENT_STEPS.md` ✅
- `DEPLOYMENT_QUICK_REF.md` ✅
- `scripts/deploy-prod.sh` ✅
- `scripts/manage-prod.sh` ✅

---

**Summary:** Use `docker-compose.prod.yml` for your Chalmers VM deployment. Keep `docker-compose.production.yml` for future CI/CD enhancements.
