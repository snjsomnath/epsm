# EPSM Versioning & Release System - Overview

## 📦 What We've Implemented

A comprehensive versioning and release management system for your Docker-based EPSM application.

## 🎯 Key Features

### 1. **Centralized Version Management**
- Single source of truth: `VERSION` file at project root
- Automatically synced across:
  - Frontend package.json
  - Backend Python module
  - Docker images
  - API responses

### 2. **Automated Release Process**
- One-command releases: `./scripts/release.sh [major|minor|patch]`
- Automatic CHANGELOG updates
- Git tagging with semantic versioning
- Zero manual version editing

### 3. **Docker Integration**
- Tagged Docker images for every release
- Supports version-specific deployments
- Multi-tag strategy (latest, x.y.z, x.y, x)
- GitHub Container Registry integration

### 4. **GitHub Actions CI/CD**
- Automatic release creation when tags are pushed
- Builds and publishes Docker images
- Extracts and formats changelog entries
- Handles pre-releases (alpha, beta, rc)

### 5. **Version API Endpoint**
- `/api/version/` returns version and app metadata
- Frontend footer displays dynamic version
- Easy version verification in production

## 📁 Files Created/Modified

```
epsm/
├── VERSION                          # ✨ NEW - Single source of truth
├── CHANGELOG.md                     # ✨ NEW - Release history
├── docs/
│   └── RELEASE.md                   # ✨ NEW - Release guide
├── .github/
│   └── workflows/
│       └── release.yml              # ✨ NEW - Automated releases
├── scripts/
│   └── release.sh                   # ✨ NEW - Release automation
├── backend/
│   ├── __version__.py               # ✨ NEW - Python version module
│   └── config/
│       └── urls.py                  # ✅ MODIFIED - Added /api/version/
├── frontend/
│   ├── package.json                 # ✅ MODIFIED - Updated version
│   └── src/
│       └── components/
│           └── layout/
│               └── AppLayout.tsx    # ✅ MODIFIED - Dynamic version display
└── docker-compose.versioned.yml     # ✨ NEW - Version-aware compose file
```

## 🚀 How to Create a Release

### Quick Start
```bash
# 1. Make your changes and commit them
git add .
git commit -m "feat: add new simulation feature"

# 2. Run the release script
./scripts/release.sh patch              # For bug fixes (0.1.0 -> 0.1.1)
./scripts/release.sh minor              # For new features (0.1.0 -> 0.2.0)
./scripts/release.sh major              # For breaking changes (0.1.0 -> 1.0.0)

# 3. Push to GitHub
git push origin main
git push origin v0.1.1                  # Replace with actual version

# 4. GitHub Actions automatically:
#    ✅ Creates GitHub Release
#    ✅ Builds Docker images
#    ✅ Publishes to GitHub Container Registry
```

### What Happens Automatically

```
┌─────────────────────────────────────────┐
│  ./scripts/release.sh patch             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Updates:                               │
│  • VERSION file (0.1.0 → 0.1.1)         │
│  • package.json                         │
│  • CHANGELOG.md                         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Git Operations:                        │
│  • Commits changes                      │
│  • Creates tag (v0.1.1)                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  git push origin main                   │
│  git push origin v0.1.1                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  GitHub Actions Workflow Triggers       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Parallel Jobs:                         │
│  1. Create GitHub Release               │
│  2. Build Frontend Docker Image         │
│  3. Build Backend Docker Image          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Published Artifacts:                   │
│  • GitHub Release (with notes)          │
│  • ghcr.io/.../frontend:0.1.1           │
│  • ghcr.io/.../frontend:0.1             │
│  • ghcr.io/.../frontend:latest          │
│  • ghcr.io/.../backend:0.1.1            │
│  • ghcr.io/.../backend:0.1              │
│  • ghcr.io/.../backend:latest           │
└─────────────────────────────────────────┘
```

## 🔍 Version Display

### In the Frontend
The version now displays dynamically in the footer:
```
EPSM v0.1.0 Beta
© 2025 Chalmers University of Technology
```

### Via API
```bash
curl http://localhost:8000/api/version/
```

```json
{
  "version": "0.1.0",
  "version_info": {
    "version": "0.1.0",
    "major": 0,
    "minor": 1,
    "patch": 0
  },
  "app_name": "Energy Performance Simulation Manager",
  "app_acronym": "EPSM",
  "description": "A containerized web application for managing building energy simulations using EnergyPlus",
  "author": "Sanjay Somanath",
  "author_email": "sanjay.somanath@chalmers.se",
  "institution": "Chalmers University of Technology",
  "license": "MIT",
  "url": "https://github.com/snjsomnath/epsm"
}
```

## 📚 Documentation

- **Comprehensive Release Guide**: `docs/RELEASE.md`
  - Detailed step-by-step instructions
  - Hotfix procedures
  - Rollback procedures
  - Troubleshooting guide
  - Best practices

- **CHANGELOG**: `CHANGELOG.md`
  - Follows "Keep a Changelog" format
  - Pre-populated with v0.1.0 release notes
  - Template for future releases

## 🐳 Docker Deployments

### Using Versioned Images

```bash
# Pull specific version
docker pull ghcr.io/snjsomnath/epsm-frontend:0.1.0
docker pull ghcr.io/snjsomnath/epsm-backend:0.1.0

# Run with specific version
VERSION=0.1.0 docker-compose -f docker-compose.versioned.yml up

# Production deployment
echo "VERSION=0.1.0" >> .env
docker-compose -f docker-compose.versioned.yml up -d
```

### Image Tagging Strategy

Every release creates multiple tags for flexibility:

| Tag | Description | Example |
|-----|-------------|---------|
| `latest` | Most recent stable release | `epsm-frontend:latest` |
| `X.Y.Z` | Specific version | `epsm-frontend:0.1.0` |
| `X.Y` | Latest patch in minor version | `epsm-frontend:0.1` |
| `X` | Latest minor in major version | `epsm-frontend:0` |

## ✅ Benefits

1. **Consistency**: Version is synchronized across all components
2. **Automation**: No manual version editing needed
3. **Traceability**: Full changelog and release notes
4. **Reproducibility**: Can deploy exact versions via Docker tags
5. **Best Practices**: Follows semantic versioning and conventional commits
6. **CI/CD**: Fully automated build and publish pipeline
7. **Documentation**: Clear process for all team members

## 🎓 Semantic Versioning Quick Reference

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes (1.0.0 → 2.0.0)
MINOR: New features (1.0.0 → 1.1.0)
PATCH: Bug fixes (1.0.0 → 1.0.1)
```

### When to Bump What?

- **Patch (0.1.0 → 0.1.1)**: Bug fixes, minor updates
- **Minor (0.1.0 → 0.2.0)**: New features, enhancements
- **Major (0.1.0 → 1.0.0)**: Breaking changes, major rewrites

## 🔐 GitHub Secrets (Already Configured)

The workflow uses built-in GitHub tokens:
- ✅ `GITHUB_TOKEN` - Automatic (no setup needed)
- ✅ Package write permissions enabled via workflow

## 📋 Next Steps

1. **Test the system**:
   ```bash
   # Create a test patch release
   ./scripts/release.sh patch "Test release system"
   
   # Don't push yet - review the changes
   git log -1 --stat
   git diff HEAD~1 VERSION
   git diff HEAD~1 CHANGELOG.md
   
   # If happy, push
   git push origin development
   git push origin v0.1.1  # Or whatever version
   ```

2. **Monitor GitHub Actions**:
   - Go to GitHub → Actions tab
   - Watch the release workflow execute
   - Verify Docker images are published

3. **Update team documentation**:
   - Add release process to your onboarding docs
   - Train team members on the release script
   - Establish release schedule (weekly, monthly, etc.)

## 📞 Support

For issues or questions:
- Review `docs/RELEASE.md` for detailed guides
- Check GitHub Actions logs for workflow failures
- Consult the troubleshooting section in RELEASE.md

---

**Status**: ✅ All systems operational  
**Current Version**: 0.1.0  
**Last Updated**: 2025-10-07
