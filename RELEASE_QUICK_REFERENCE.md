# EPSM Release Process - Quick Reference Card

## 🎯 One-Command Release

```bash
./scripts/release.sh [patch|minor|major] ["Optional message"]
```

## 📊 Release Flow Diagram

```
Developer                    Git                    GitHub Actions              Artifacts
    │                        │                           │                          │
    │  Make changes          │                           │                          │
    │─────────────────────>  │                           │                          │
    │                        │                           │                          │
    │  ./release.sh patch    │                           │                          │
    │─────────────────────>  │                           │                          │
    │                        │                           │                          │
    │                        │  Updates VERSION          │                          │
    │                        │  Updates package.json     │                          │
    │                        │  Updates CHANGELOG.md     │                          │
    │                        │  Commits changes          │                          │
    │                        │  Creates tag v0.1.1       │                          │
    │                        │                           │                          │
    │  git push origin main  │                           │                          │
    │─────────────────────>  │                           │                          │
    │                        │                           │                          │
    │  git push origin tag   │                           │                          │
    │─────────────────────>  │                           │                          │
    │                        │                           │                          │
    │                        │  Tag pushed event         │                          │
    │                        │──────────────────────────>│                          │
    │                        │                           │                          │
    │                        │                           │  Validates VERSION       │
    │                        │                           │  Extracts CHANGELOG      │
    │                        │                           │  Creates GitHub Release  │
    │                        │                           │────────────────────────> │
    │                        │                           │                          │
    │                        │                           │  Builds frontend image   │
    │                        │                           │  Builds backend image    │
    │                        │                           │────────────────────────> │
    │                        │                           │                          │
    │                        │                           │  Pushes to GHCR          │
    │                        │                           │────────────────────────> │
    │                        │                           │                          │
    │                        │                           │  ✅ Complete             │
    │                        │                           │                          │
```

## 🔢 Version Bumping Examples

| Current | Patch | Minor | Major |
|---------|-------|-------|-------|
| 0.1.0   | 0.1.1 | 0.2.0 | 1.0.0 |
| 0.1.5   | 0.1.6 | 0.2.0 | 1.0.0 |
| 1.2.3   | 1.2.4 | 1.3.0 | 2.0.0 |

## 📦 Docker Image Tags Generated

For release `v0.1.1`, these images are created:

```
Frontend:
  ghcr.io/snjsomnath/epsm-frontend:latest
  ghcr.io/snjsomnath/epsm-frontend:0.1.1
  ghcr.io/snjsomnath/epsm-frontend:0.1
  ghcr.io/snjsomnath/epsm-frontend:0

Backend:
  ghcr.io/snjsomnath/epsm-backend:latest
  ghcr.io/snjsomnath/epsm-backend:0.1.1
  ghcr.io/snjsomnath/epsm-backend:0.1
  ghcr.io/snjsomnath/epsm-backend:0
```

## 🚀 Common Release Scenarios

### Scenario 1: Bug Fix Release
```bash
# Fix a bug
git add .
git commit -m "fix: resolve simulation timeout issue"

# Create patch release
./scripts/release.sh patch

# Push
git push origin main
git push origin $(git describe --tags --abbrev=0)
```

### Scenario 2: New Feature Release
```bash
# Add new feature
git add .
git commit -m "feat: add hourly data export"

# Create minor release
./scripts/release.sh minor "Add hourly data export feature"

# Push
git push origin main
git push origin $(git describe --tags --abbrev=0)
```

### Scenario 3: Breaking Change Release
```bash
# Make breaking change
git add .
git commit -m "BREAKING CHANGE: new API authentication"

# Create major release
./scripts/release.sh major "Major update: new authentication system"

# Push
git push origin main
git push origin $(git describe --tags --abbrev=0)
```

## ⚡ Quick Commands

```bash
# Check current version
cat VERSION

# List all releases
git tag -l

# View specific release
git show v0.1.0

# Undo last release (before push)
git tag -d $(git describe --tags --abbrev=0)
git reset --hard HEAD~1

# Deploy specific version
VERSION=0.1.0 docker-compose -f docker-compose.versioned.yml up -d

# Check deployed version
curl http://localhost:8000/api/version/ | jq .version
```

## 📝 Pre-Release Checklist

- [ ] All changes committed
- [ ] Tests passing
- [ ] CHANGELOG.md updated
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] On correct branch (main/development)

## 🔄 Release Workflow States

```
┌──────────────┐
│ Development  │
│   (0.1.0)    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Run release  │
│    script    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Local commit │────>│  Push main   │
│   and tag    │     │   and tag    │
└──────────────┘     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │GitHub Actions│
                     │   triggers   │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Released   │
                     │   (0.1.1)    │
                     └──────────────┘
```

## 📞 Emergency Procedures

### Rollback a Released Version
```bash
# 1. Delete GitHub release (via web UI)
# 2. Delete tag
git tag -d v0.1.1
git push origin :refs/tags/v0.1.1

# 3. Revert commit
git revert HEAD
git push origin main

# 4. Or hard reset (if not yet pulled by others)
git reset --hard HEAD~1
git push origin main --force
```

### Fix Released Version
```bash
# Create hotfix branch from tag
git checkout v0.1.0
git checkout -b hotfix/0.1.1

# Make fixes
git add .
git commit -m "fix: critical bug"

# Release hotfix
./scripts/release.sh patch "Hotfix: critical bug"
git push origin hotfix/0.1.1
git push origin v0.1.1

# Merge back
git checkout main
git merge hotfix/0.1.1
git push origin main
```

## 🎓 Cheat Sheet

| Action | Command |
|--------|---------|
| Create patch release | `./scripts/release.sh patch` |
| Create minor release | `./scripts/release.sh minor` |
| Create major release | `./scripts/release.sh major` |
| Check version | `cat VERSION` |
| List releases | `git tag -l` |
| Push release | `git push origin main && git push origin v<VERSION>` |
| Undo release (local) | `git tag -d v<VERSION> && git reset --hard HEAD~1` |
| Deploy version | `VERSION=<VERSION> docker-compose up` |
| Check API version | `curl localhost:8000/api/version/` |

---

**Print this page and keep it handy!** 📄🖨️
