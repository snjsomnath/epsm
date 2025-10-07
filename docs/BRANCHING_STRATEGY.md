# Git Branching Strategy for EPSM

## Branch Structure

```
main (production-ready)
  └─── Tags: v0.1.0, v0.1.1, v0.2.0, etc.

development (active development)
  └─── Feature branches: feature/*, fix/*, etc.
```

## Workflow

### 1. Development Phase

```bash
# Work on features in development
git checkout development
git pull origin development

# Make changes
# ... code changes ...

git add .
git commit -m "feat: add new simulation feature"
git push origin development
```

### 2. Preparing for Release

```bash
# Ensure all features are merged to development
# Run tests
# Update CHANGELOG.md

# Switch to main
git checkout main
git pull origin main

# Merge development
git merge development

# Resolve any conflicts if needed
# Run final smoke tests
```

### 3. Creating Release

```bash
# Create release from main
./scripts/release.sh [patch|minor|major]

# Push to GitHub
git push origin main
git push origin v<VERSION>
```

### 4. After Release

```bash
# Merge release commit back to development
git checkout development
git merge main
git push origin development
```

## Branch Responsibilities

| Branch | Purpose | Protected? | Deploy to |
|--------|---------|------------|-----------|
| `main` | Production-ready code | Yes | Production |
| `development` | Integration branch | Yes | Staging/Dev |
| `feature/*` | New features | No | Local/Dev |
| `fix/*` | Bug fixes | No | Local/Dev |
| `hotfix/*` | Emergency fixes | No | Production |

## Visual Flow

```
Time ─────────────────────────────────────────────────────>

development:  A───B───C───D───────E───F───G───────H
                   \             /               /
main:               └──M1──R1───┘       M2──R2──┘
                          │                 │
Tags:                   v0.1.0           v0.2.0

Legend:
A,B,C... = Regular commits
M1,M2... = Merge commits
R1,R2... = Release commits
```

## Hotfix Workflow

For urgent production fixes:

```bash
# 1. Create hotfix from latest release tag
git checkout v0.1.0
git checkout -b hotfix/0.1.1

# 2. Make fixes
git commit -m "fix: critical security issue"

# 3. Merge to main
git checkout main
git merge hotfix/0.1.1

# 4. Release
./scripts/release.sh patch "Hotfix: security issue"
git push origin main
git push origin v0.1.1

# 5. Merge to development
git checkout development
git merge main
git push origin development

# 6. Delete hotfix branch
git branch -d hotfix/0.1.1
```

## Why This Strategy?

### ✅ Benefits

1. **Stable main** - Always production-ready
2. **Safe development** - Experiment in development
3. **Clean releases** - Releases don't clutter development history
4. **Easy rollback** - Can quickly revert to last tag
5. **Clear CI/CD** - Production deploys from main only
6. **Protected production** - Branch protection rules on main

### ❌ What to Avoid

1. **Don't release from development** - Keep it for active work
2. **Don't commit directly to main** - Always merge from development
3. **Don't skip merging back** - Keep branches in sync
4. **Don't create releases without tags** - Tags are source of truth

## Branch Protection Rules (GitHub)

Recommended settings for `main`:

```yaml
Branch Protection Rules for 'main':
  ✅ Require pull request reviews before merging
  ✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Include administrators
  ⬜ Require signed commits (optional)
  ⬜ Require linear history (optional)
```

For `development`:

```yaml
Branch Protection Rules for 'development':
  ✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ⬜ Require pull request reviews (optional for solo dev)
```

## Quick Commands

```bash
# Start new feature
git checkout development
git checkout -b feature/my-feature

# Finish feature
git checkout development
git merge feature/my-feature
git push origin development
git branch -d feature/my-feature

# Prepare release
git checkout main
git merge development

# Create release
./scripts/release.sh minor
git push origin main
git push origin v0.2.0

# Sync back
git checkout development
git merge main
git push origin development
```

## Current Status

Based on your recent merge to main, your branches should look like:

```bash
# Check branch status
git checkout main
git log --oneline -5

git checkout development  
git log --oneline -5

# Verify they're in sync
git log main..development  # Should show commits only in development
git log development..main  # Should show commits only in main
```

## Recommendation for EPSM

**Always release from `main`**. Use this workflow:

1. Develop features in `development` branch
2. When ready for release, merge `development` → `main`
3. Run `./scripts/release.sh` on `main`
4. Push `main` and the new tag
5. Merge `main` → `development` to keep in sync

This ensures your production releases are always from a stable branch!
