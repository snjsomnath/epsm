# Release Guide for EPSM

This guide explains how to create and manage releases for the Energy Performance Simulation Manager (EPSM) project.

## Table of Contents

1. [Version Management](#version-management)
2. [Quick Release Process](#quick-release-process)
3. [Detailed Release Steps](#detailed-release-steps)
4. [Docker Image Releases](#docker-image-releases)
5. [Hotfix Releases](#hotfix-releases)
6. [Rollback Procedure](#rollback-procedure)
7. [Best Practices](#best-practices)

---

## Version Management

### Semantic Versioning

EPSM follows [Semantic Versioning](https://semver.org/) (SemVer):

```
MAJOR.MINOR.PATCH (e.g., 1.2.3)
```

- **MAJOR**: Incompatible API changes or major architectural changes
- **MINOR**: New features in a backward-compatible manner
- **PATCH**: Backward-compatible bug fixes

### Version Storage

The version number is stored in multiple locations:

1. **`VERSION`** (root) - Single source of truth
2. **`frontend/package.json`** - Frontend package version
3. **`backend/__version__.py`** - Backend Python module
4. **`CHANGELOG.md`** - Historical version records

The release script automatically synchronizes all these files.

---

## Quick Release Process

### Prerequisites

- Clean working directory (commit or stash changes)
- On the `main` or `development` branch
- All tests passing
- Updated CHANGELOG.md with changes

### Steps

1. **Run the release script:**
   ```bash
   ./scripts/release.sh [major|minor|patch] ["Optional message"]
   ```

2. **Review the changes:**
   ```bash
   git log -1 --stat
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   git push origin v<VERSION>
   ```

4. **GitHub Actions automatically:**
   - Creates a GitHub Release with changelog notes
   - Builds and pushes Docker images with version tags
   - Sends notifications (if configured)

---

## Detailed Release Steps

### 1. Prepare for Release

#### Update Documentation
```bash
# Review and update docs
vim docs/CHANGELOG.md
vim README.md
```

#### Run Tests
```bash
# Backend tests
docker-compose exec backend python manage.py test

# Frontend tests (if configured)
docker-compose exec frontend npm test
```

#### Check for Security Issues
```bash
# Backend dependencies
docker-compose exec backend pip check

# Frontend dependencies
docker-compose exec frontend npm audit
```

### 2. Update CHANGELOG.md

Before running the release script, ensure `CHANGELOG.md` has been updated with:

- New features added
- Changes to existing functionality
- Bug fixes
- Security patches
- Breaking changes (if any)

Example entry:
```markdown
## [Unreleased]

### Added
- New feature for batch simulation filtering
- Enhanced error reporting in results page

### Changed
- Improved performance of IDF parsing by 30%
- Updated Material-UI to v5.16

### Fixed
- Fixed race condition in Celery task queue
- Resolved memory leak in hourly data visualization

### Security
- Updated Django to 3.2.26 (security patch)
```

### 3. Run Release Script

The release script automates version bumping:

```bash
# For a patch release (0.1.0 -> 0.1.1)
./scripts/release.sh patch

# For a minor release (0.1.1 -> 0.2.0)
./scripts/release.sh minor "Add new simulation features"

# For a major release (0.2.0 -> 1.0.0)
./scripts/release.sh major "Version 1.0 stable release"
```

The script will:
- ✅ Check git repository status
- ✅ Parse current version from VERSION file
- ✅ Calculate new version based on bump type
- ✅ Update VERSION file
- ✅ Update frontend/package.json
- ✅ Update CHANGELOG.md with release date
- ✅ Create git commit
- ✅ Create git tag (e.g., v0.1.1)

### 4. Push to GitHub

```bash
# Push the commit
git push origin main

# Push the tag
git push origin v<VERSION>
```

**Example:**
```bash
git push origin main
git push origin v0.1.1
```

### 5. GitHub Actions Workflow

Once the tag is pushed, the `.github/workflows/release.yml` workflow triggers:

#### Steps:
1. **Validate**: Ensures VERSION file matches the tag
2. **Extract Changelog**: Pulls relevant section from CHANGELOG.md
3. **Create Release**: Creates GitHub release with notes
4. **Build Images**: Builds Docker images for frontend and backend
5. **Push Images**: Pushes to GitHub Container Registry with tags:
   - `latest`
   - `<VERSION>` (e.g., `0.1.1`)
   - `<MAJOR>.<MINOR>` (e.g., `0.1`)
   - `<MAJOR>` (e.g., `0`)

#### Monitor the workflow:
- Go to GitHub → Actions tab
- Click on the running workflow
- Review logs for each job

---

## Docker Image Releases

### Image Tagging Strategy

Each release creates Docker images with multiple tags:

```bash
ghcr.io/snjsomnath/epsm-frontend:latest
ghcr.io/snjsomnath/epsm-frontend:0.1.1
ghcr.io/snjsomnath/epsm-frontend:0.1
ghcr.io/snjsomnath/epsm-frontend:0

ghcr.io/snjsomnath/epsm-backend:latest
ghcr.io/snjsomnath/epsm-backend:0.1.1
ghcr.io/snjsomnath/epsm-backend:0.1
ghcr.io/snjsomnath/epsm-backend:0
```

### Using Specific Versions

#### Pull specific version:
```bash
docker pull ghcr.io/snjsomnath/epsm-frontend:0.1.1
docker pull ghcr.io/snjsomnath/epsm-backend:0.1.1
```

#### Run with specific version:
```bash
VERSION=0.1.1 docker-compose -f docker-compose.versioned.yml up
```

#### Production deployment:
```bash
# Update .env file
echo "VERSION=0.1.1" >> .env

# Pull images
docker-compose -f docker-compose.versioned.yml pull

# Start services
docker-compose -f docker-compose.versioned.yml up -d
```

---

## Hotfix Releases

For urgent bug fixes on a released version:

### 1. Create Hotfix Branch

```bash
# From the tag that needs fixing
git checkout v0.1.0
git checkout -b hotfix/0.1.1
```

### 2. Apply Fix

```bash
# Make your changes
git add .
git commit -m "fix: critical bug in simulation queue"
```

### 3. Release Hotfix

```bash
# Run release script for patch version
./scripts/release.sh patch "Hotfix: critical simulation queue bug"

# Push changes
git push origin hotfix/0.1.1
git push origin v0.1.1
```

### 4. Merge Back

```bash
# Merge hotfix to main
git checkout main
git merge hotfix/0.1.1
git push origin main

# Merge to development
git checkout development
git merge hotfix/0.1.1
git push origin development

# Delete hotfix branch
git branch -d hotfix/0.1.1
git push origin --delete hotfix/0.1.1
```

---

## Rollback Procedure

### If Release Script Failed (Before Pushing)

```bash
# Delete the tag
git tag -d v0.1.1

# Reset the commit
git reset --hard HEAD~1

# Fix issues and try again
```

### If GitHub Release Was Created

```bash
# Delete the GitHub release (via web UI or CLI)
gh release delete v0.1.1

# Delete the tag locally and remotely
git tag -d v0.1.1
git push origin :refs/tags/v0.1.1

# Reset your branch
git reset --hard <commit-before-release>
git push origin main --force
```

### Rollback Production Deployment

```bash
# Switch to previous version
VERSION=0.1.0 docker-compose -f docker-compose.versioned.yml pull
VERSION=0.1.0 docker-compose -f docker-compose.versioned.yml up -d

# Verify rollback
docker-compose ps
docker-compose logs backend | grep "VERSION"
```

---

## Best Practices

### Before Every Release

- [ ] Review all merged PRs since last release
- [ ] Update CHANGELOG.md with all changes
- [ ] Run full test suite
- [ ] Check for security vulnerabilities
- [ ] Review breaking changes (if any)
- [ ] Update documentation if needed
- [ ] Verify all CI/CD checks pass

### Release Timing

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly or bi-weekly for new features
- **Major releases**: Quarterly or when significant changes accumulate

### Communication

- **Internal team**: Slack/email with release notes
- **Users**: GitHub release notes, blog post (for major releases)
- **Documentation**: Update getting started guide if workflows change

### Version Compatibility

- Maintain backward compatibility within major versions
- Document breaking changes prominently
- Provide migration guides for major version upgrades

### Testing Releases

Before pushing tags:
```bash
# Test locally with new version
VERSION=$(cat VERSION) docker-compose -f docker-compose.versioned.yml build
VERSION=$(cat VERSION) docker-compose -f docker-compose.versioned.yml up -d

# Verify version in UI
curl http://localhost:8000/api/version/

# Run smoke tests
# - Login
# - Upload IDF
# - Run simulation
# - View results
```

---

## Troubleshooting

### Release Script Errors

**Error: "Not in a git repository"**
```bash
# Ensure you're in the project root
cd /path/to/epsm
```

**Error: "VERSION file not found"**
```bash
# Create VERSION file
echo "0.1.0" > VERSION
git add VERSION
git commit -m "chore: add VERSION file"
```

### GitHub Actions Errors

**Docker build fails:**
- Check Dockerfile.prod exists
- Verify build context is correct
- Review build logs in Actions tab

**Push fails (authentication):**
- Ensure GITHUB_TOKEN has package:write permission
- Check repository settings → Actions → General → Workflow permissions

### Version Mismatch

If VERSION file and tag don't match:
```bash
# Update VERSION file
echo "0.1.1" > VERSION

# Recommit
git add VERSION
git commit --amend --no-edit

# Force update tag
git tag -fa v0.1.1 -m "Release version 0.1.1"
git push origin v0.1.1 --force
```

---

## Additional Resources

- [Semantic Versioning Specification](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases Documentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Docker Image Tagging Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Quick Reference

```bash
# Create patch release
./scripts/release.sh patch
git push origin main && git push origin $(git describe --tags --abbrev=0)

# Create minor release
./scripts/release.sh minor "Add new features"
git push origin main && git push origin $(git describe --tags --abbrev=0)

# Create major release
./scripts/release.sh major "Breaking changes"
git push origin main && git push origin $(git describe --tags --abbrev=0)

# Check current version
cat VERSION

# View release history
git tag -l

# View specific release
git show v0.1.0

# Pull specific version images
docker pull ghcr.io/snjsomnath/epsm-frontend:0.1.0
docker pull ghcr.io/snjsomnath/epsm-backend:0.1.0
```

---

**Last Updated**: 2025-10-07  
**Document Version**: 1.0  
**Maintained By**: EPSM Development Team
