# Docker Image Build and Push Guide

## Prerequisites

1. **GitHub Personal Access Token (PAT)** with `write:packages` permission
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `write:packages`
   - Generate and copy the token

## Build and Push Backend Image

### Step 1: Login to GitHub Container Registry

```bash
# Login to GHCR
docker login ghcr.io -u snjsomnath
# When prompted for password, paste your GitHub PAT
```

### Step 2: Build the Backend Image

```bash
cd /Users/ssanjay/GitHub/epsm

# Build with both latest and version tags
docker build -f backend/Dockerfile.prod \
  -t ghcr.io/snjsomnath/epsm-backend:latest \
  -t ghcr.io/snjsomnath/epsm-backend:v0.2.4 \
  backend/
```

### Step 3: Push to GitHub Container Registry

```bash
# Push latest tag
docker push ghcr.io/snjsomnath/epsm-backend:latest

# Push version tag
docker push ghcr.io/snjsomnath/epsm-backend:v0.2.4
```

## Build and Push Frontend Image

### Step 1: Build the Frontend Image

```bash
cd /Users/ssanjay/GitHub/epsm

# Build with both latest and version tags
docker build -f frontend/Dockerfile.prod \
  -t ghcr.io/snjsomnath/epsm-frontend:latest \
  -t ghcr.io/snjsomnath/epsm-frontend:v0.2.4 \
  frontend/
```

### Step 2: Push to GitHub Container Registry

```bash
# Push latest tag
docker push ghcr.io/snjsomnath/epsm-frontend:latest

# Push version tag
docker push ghcr.io/snjsomnath/epsm-frontend:v0.2.4
```

## Update docker-compose.production.yml

After pushing new images, update the version in `docker-compose.production.yml`:

```yaml
backend:
  image: ghcr.io/snjsomnath/epsm-backend:v0.2.4  # or :latest
  
frontend:
  image: ghcr.io/snjsomnath/epsm-frontend:v0.2.4  # or :latest
```

## Make Images Public (Optional)

To make images publicly accessible without authentication:

1. Go to: https://github.com/users/snjsomnath/packages
2. Click on the package (e.g., `epsm-backend`)
3. Click "Package settings"
4. Scroll to "Danger Zone"
5. Click "Change visibility"
6. Select "Public"

## Automated CI/CD (Future Enhancement)

Create `.github/workflows/docker-publish.yml` to automatically build and push on every release:

```yaml
name: Docker Publish

on:
  release:
    types: [published]
  push:
    branches: [main, development]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3
      
      - name: Login to GHCR
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          file: ./backend/Dockerfile.prod
          push: true
          tags: |
            ghcr.io/snjsomnath/epsm-backend:latest
            ghcr.io/snjsomnath/epsm-backend:${{ github.ref_name }}
      
      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          file: ./frontend/Dockerfile.prod
          push: true
          tags: |
            ghcr.io/snjsomnath/epsm-frontend:latest
            ghcr.io/snjsomnath/epsm-frontend:${{ github.ref_name }}
```

## Troubleshooting

### Authentication Failed

```bash
# Clear cached credentials
docker logout ghcr.io

# Login again with fresh PAT
docker login ghcr.io -u snjsomnath
```

### Permission Denied

- Ensure your PAT has `write:packages` scope
- Check repository visibility settings
- Verify package name matches repository owner

### Image Pull Rate Limit

GitHub Container Registry has rate limits:
- **Authenticated:** 10,000 pulls per hour
- **Unauthenticated:** 1,000 pulls per hour

Always authenticate when possible.

## Quick Commands Reference

```bash
# Build backend
docker build -f backend/Dockerfile.prod -t ghcr.io/snjsomnath/epsm-backend:latest backend/

# Build frontend  
docker build -f frontend/Dockerfile.prod -t ghcr.io/snjsomnath/epsm-frontend:latest frontend/

# Push backend
docker push ghcr.io/snjsomnath/epsm-backend:latest

# Push frontend
docker push ghcr.io/snjsomnath/epsm-frontend:latest

# Pull on production VM
docker pull ghcr.io/snjsomnath/epsm-backend:latest
docker pull ghcr.io/snjsomnath/epsm-frontend:latest
```
