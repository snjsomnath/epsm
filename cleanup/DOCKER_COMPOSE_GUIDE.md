# Docker Compose Files - Usage Guide

**Last Updated:** October 13, 2025

---

## 📦 Files Overview

EPSM uses **2 Docker Compose files**:

| File | Purpose | When to Use |
|------|---------|-------------|
| `docker-compose.yml` | **Development** | Local development on your machine |
| `docker-compose.production.yml` | **Production** | Production server deployment |

---

## 🚀 Usage

### Development (Local Machine)

**Start:**
```bash
docker-compose up -d
# OR
./scripts/start.sh
```

**Stop:**
```bash
docker-compose down
# OR
./scripts/stop.sh
```

**Rebuild:**
```bash
docker-compose up -d --build
```

**Configuration:**
- Uses `.env` or `.env.local` for settings
- Default ports: Frontend (5173), Backend (8000), DB (5432)
- Debug mode enabled
- Hot reload for development

### Production (Server)

**Deploy:**
```bash
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

**Stop:**
```bash
docker-compose -f docker-compose.production.yml down
```

**Configuration:**
- Uses `.env.production` for settings
- Production ports: 80 (HTTP), 443 (HTTPS)
- Debug mode disabled
- Optimized builds

---

## 🔧 Version Management

Both compose files support version tagging via environment variables:

**Development:**
```bash
# In .env
VERSION=dev
```

**Production:**
```bash
# In .env.production
VERSION=0.2.2
```

Images are tagged as:
- `epsm-backend:dev` or `epsm-backend:0.2.2`
- `epsm-frontend:dev` or `epsm-frontend:0.2.2`
- `epsm-database:dev` or `epsm-database:0.2.2`

---

## 🔀 Environment-Specific Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Debug** | `DEBUG=True` | `DEBUG=False` |
| **Volumes** | Hot reload enabled | Optimized static builds |
| **Ports** | 5173, 8000, 5432 | 80, 443 (via nginx) |
| **SSL** | Not required | Required (Let's Encrypt) |
| **CORS** | Localhost only | Production domain only |
| **Secrets** | Default/simple | Strong, unique secrets |
| **Container Names** | `epsm_*_dev` | `epsm_*_prod` |
| **Build Context** | Fast rebuilds | Optimized production builds |

---

## 📂 File Locations

### Development
```
Project Root/
├── docker-compose.yml          # Main dev config
├── .env                        # Shared dev settings (gitignored)
├── .env.local                  # Personal overrides (gitignored)
└── environments/
    └── development.env.example # Template
```

### Production
```
/opt/epsm/
├── docker-compose.production.yml  # Main prod config
├── .env.production                # Prod settings (gitignored)
└── environments/
    └── production.env.example     # Template
```

---

## 🎯 Common Tasks

### View Running Services
```bash
# Development
docker-compose ps

# Production
docker-compose -f docker-compose.production.yml ps
```

### View Logs
```bash
# Development
docker-compose logs -f [service-name]

# Production
docker-compose -f docker-compose.production.yml logs -f [service-name]
```

### Execute Commands in Containers
```bash
# Development
docker-compose exec backend python manage.py migrate

# Production
docker-compose -f docker-compose.production.yml exec backend python manage.py migrate
```

### Restart Specific Service
```bash
# Development
docker-compose restart backend

# Production
docker-compose -f docker-compose.production.yml restart backend
```

---

## ⚠️ Important Notes

### Don't Mix Development and Production

❌ **Never run production compose on dev machine:**
```bash
# DON'T DO THIS in development
docker-compose -f docker-compose.production.yml up
```

❌ **Never use dev compose on production server:**
```bash
# DON'T DO THIS on server
docker-compose up
```

### Always Specify Environment File in Production

✅ **Always use --env-file for production:**
```bash
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

### Use Scripts When Available

✅ **Prefer scripts over direct docker-compose:**
```bash
# Development
./scripts/start.sh    # Instead of: docker-compose up -d
./scripts/stop.sh     # Instead of: docker-compose down
./scripts/status.sh   # Instead of: docker-compose ps

# Production
./scripts/production/deploy-production.sh  # Handles compose properly
```

---

## 🔍 Validation

### Check Compose File Syntax
```bash
# Development
docker-compose config

# Production
docker-compose -f docker-compose.production.yml --env-file .env.production config
```

### Test Without Starting
```bash
# Development
docker-compose up --no-start

# Production
docker-compose -f docker-compose.production.yml --env-file .env.production up --no-start
```

---

## 📚 Related Documentation

- `environments/README.md` - Environment configuration guide
- `CLEANUP_PLAN.md` - Configuration cleanup strategy
- `docs/DEVELOPMENT.md` - Development setup guide
- `docs/DEPLOYMENT.md` - Production deployment guide

---

## ❓ FAQ

**Q: Why only 2 compose files?**
A: Simplicity. Development and production are the only environments we deploy to. Versioning is handled via `.env` files.

**Q: What happened to `docker-compose.versioned.yml`?**
A: Archived. Version tagging is handled via `VERSION` environment variable in `.env` files.

**Q: Can I have personal development overrides?**
A: Yes! Use `.env.local` (takes precedence over `.env`)

**Q: How do I test production config locally?**
A: Don't. Use development compose for local testing. Test production config on staging server (if available) or isolated VM.

**Q: What about staging environment?**
A: Currently not configured by Chalmers IT. Template available at `environments/staging.env.example` if needed later.

---

## ✅ Quick Reference

```bash
# Development
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose ps                 # Status
docker-compose logs -f backend    # Logs

# Production
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f backend
```

---

**Keep it simple:** 2 files, 2 environments, clear separation. ✨
