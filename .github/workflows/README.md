# GitHub Actions CI/CD Workflows

This directory contains automated workflows for building, testing, and deploying EPSM.

## Workflows

### 1. `docker-publish.yml` - Continuous Docker Image Builds

**Triggers:**
- Push to `main` or `development` branches
- Pull requests to `main` or `development`
- Manual trigger via workflow_dispatch
- Pushes to version tags (`v*.*.*`)

**What it does:**
- ✅ Builds multi-platform Docker images (linux/amd64, linux/arm64)
- ✅ Pushes to GitHub Container Registry (ghcr.io)
- ✅ Uses GitHub Actions cache for faster builds
- ✅ Tags images based on branch/tag names

**Images produced:**
- `ghcr.io/snjsomnath/epsm-backend:latest` (from main branch)
- `ghcr.io/snjsomnath/epsm-backend:development` (from development branch)
- `ghcr.io/snjsomnath/epsm-frontend:latest`
- `ghcr.io/snjsomnath/epsm-frontend:development`

**Platforms supported:**
- linux/amd64 (x86_64) - For production VM
- linux/arm64 (ARM64) - For Apple Silicon development

---

### 2. `release.yml` - Release and Version Management

**Triggers:**
- Push of version tags (e.g., `v0.2.3`, `v1.0.0`)

**What it does:**
- ✅ Creates GitHub Release with changelog
- ✅ Builds multi-platform Docker images with version tags
- ✅ Pushes tagged images to GHCR
- ✅ Generates deployment instructions

**Images produced:**
- `ghcr.io/snjsomnath/epsm-backend:v0.2.3`
- `ghcr.io/snjsomnath/epsm-backend:0.2.3`
- `ghcr.io/snjsomnath/epsm-backend:0.2`
- `ghcr.io/snjsomnath/epsm-backend:0`
- `ghcr.io/snjsomnath/epsm-backend:latest`

---

## Creating a New Release

### Method 1: Using Git Tags (Recommended)

```bash
# 1. Update VERSION file
echo "0.2.4" > VERSION

# 2. Update CHANGELOG.md
nano CHANGELOG.md

# 3. Commit changes
git add VERSION CHANGELOG.md
git commit -m "chore: bump version to 0.2.4"
git push origin development

# 4. Create and push tag
git tag -a v0.2.4 -m "Release v0.2.4"
git push origin v0.2.4
```

This will automatically:
1. Trigger the release workflow
2. Build multi-platform Docker images
3. Create a GitHub Release with changelog
4. Tag images with version numbers

### Method 2: Using GitHub UI

1. Go to: https://github.com/snjsomnath/epsm/releases
2. Click "Draft a new release"
3. Click "Choose a tag"
4. Type `v0.2.4` (or your version)
5. Click "Create new tag on publish"
6. Fill in release title and notes
7. Click "Publish release"

---

## Viewing Build Status

### GitHub Actions Tab
- Go to: https://github.com/snjsomnath/epsm/actions
- See all workflow runs, logs, and status

### GitHub Container Registry
- Go to: https://github.com/users/snjsomnath/packages
- View published images and tags

---

## Using the Images

### Pull Latest Development Build

```bash
# Backend
docker pull ghcr.io/snjsomnath/epsm-backend:development

# Frontend
docker pull ghcr.io/snjsomnath/epsm-frontend:development
```

### Pull Specific Version

```bash
# Backend v0.2.3
docker pull ghcr.io/snjsomnath/epsm-backend:v0.2.3

# Frontend v0.2.3
docker pull ghcr.io/snjsomnath/epsm-frontend:v0.2.3
```

### Pull Latest Stable (from main branch)

```bash
# Backend
docker pull ghcr.io/snjsomnath/epsm-backend:latest

# Frontend
docker pull ghcr.io/snjsomnath/epsm-frontend:latest
```

---

## Deployment Workflow

### Development Branch → Testing

```bash
# Push to development
git push origin development

# Wait for GitHub Actions to build (2-5 minutes)
# Images will be tagged as 'development'

# On test server
docker pull ghcr.io/snjsomnath/epsm-backend:development
docker pull ghcr.io/snjsomnath/epsm-frontend:development
docker-compose up -d
```

### Main Branch → Production

```bash
# Merge development to main
git checkout main
git merge development
git push origin main

# Images will be tagged as 'latest'

# On production VM
cd /opt/epsm
git pull origin main
bash scripts/deploy-production.sh
```

### Tagged Release → Production with Version

```bash
# Create release tag
git tag -a v0.2.4 -m "Release v0.2.4"
git push origin v0.2.4

# Wait for release workflow (3-7 minutes)

# On production VM
cd /opt/epsm
git checkout v0.2.4
bash scripts/deploy-production.sh
```

---

## Troubleshooting

### Build Failed

1. Check Actions tab for error logs
2. Common issues:
   - Dockerfile syntax errors
   - Missing dependencies in requirements.txt
   - Network timeout during npm install

### Image Not Found

1. Check if workflow completed successfully
2. Verify image name and tag:
   ```bash
   docker pull ghcr.io/snjsomnath/epsm-backend:latest
   ```
3. Check package visibility (should be public)

### Authentication Failed

1. GitHub Actions uses `GITHUB_TOKEN` automatically
2. For local pulls, login first:
   ```bash
   docker login ghcr.io -u snjsomnath
   ```

### Multi-Platform Build Issues

1. Ensure QEMU is set up (done automatically in workflows)
2. Check if both platforms succeeded:
   ```bash
   docker buildx imagetools inspect ghcr.io/snjsomnath/epsm-backend:latest
   ```

---

## Advanced Configuration

### Adding New Platforms

Edit `docker-publish.yml`:

```yaml
platforms: linux/amd64,linux/arm64,linux/arm/v7
```

### Cache Management

GitHub Actions cache is automatically managed but limited to 10GB per repository. Old caches are pruned automatically.

### Build Secrets

For private dependencies, add secrets in:
- Settings → Secrets and variables → Actions
- Reference as: `${{ secrets.SECRET_NAME }}`

---

## Performance

### Build Times

| Component | Time (cold) | Time (cached) |
|-----------|-------------|---------------|
| Backend   | 5-7 min     | 2-3 min       |
| Frontend  | 4-6 min     | 1-2 min       |

### Image Sizes

| Component | Size (amd64) | Size (arm64) |
|-----------|--------------|--------------|
| Backend   | ~450 MB      | ~420 MB      |
| Frontend  | ~50 MB       | ~45 MB        |

---

## Best Practices

1. **Always test in development before merging to main**
2. **Update CHANGELOG.md before creating releases**
3. **Use semantic versioning (MAJOR.MINOR.PATCH)**
4. **Tag releases from main branch, not development**
5. **Monitor GitHub Actions for failed builds**

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Buildx Multi-Platform](https://docs.docker.com/build/building/multi-platform/)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Semantic Versioning](https://semver.org/)
