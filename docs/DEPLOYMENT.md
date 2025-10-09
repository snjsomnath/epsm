# EPSM Deployment Guide

---
title: Deployment Guide
layout: default
---

## Overview

This guide covers deploying the EPSM (Energy Performance Simulation Manager) application using Docker containers. The application consists of three main services:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Django + PostgreSQL + Redis  
- **Database**: PostgreSQL with materials data

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │    Database     │
│   (React App)   │    │  (Django API)   │    │  (PostgreSQL)   │
│                 │    │                 │    │                 │
│  Port: 5173     │    │  Port: 8000     │    │  Port: 5432     │
│  (dev) / 80     │    │                 │    │                 │
│  (prod)         │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │      Redis      │
                    │   (Caching)     │
                    │                 │
                    │  Port: 6379     │
                    └─────────────────┘
```

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB+ RAM
- 10GB+ disk space

## Quick Start (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd epsm
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values (defaults work for development)
   ```

3. **Start the application**
   ```bash
   ./scripts/start.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin (admin/admin123)

## Production Deployment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Application Deployment

```bash
# Clone repository
git clone <repository-url>
cd epsm

# Configure production environment
cp .env.example .env
nano .env  # Set production values

# Deploy to production
./scripts/deploy.sh

> **Note:** On first run, the script will generate a secure `DJANGO_SECRET_KEY` automatically if it detects a placeholder value.
```

### 3. Environment Configuration

**Required Production Variables:**
```env
DEBUG=False
DJANGO_SECRET_KEY=your-very-secure-secret-key
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DB_PASSWORD=secure-database-password
REDIS_PASSWORD=secure-redis-password
```

### 4. SSL Configuration

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificates
sudo certbot certonly --standalone -d your-domain.com

# Update nginx configuration with SSL
# Edit .docker/nginx/nginx.conf to enable HTTPS server block
```

## Database Management

### Backup Database
```bash
# Development
./scripts/backup.sh

# Production  
./scripts/backup.sh prod
```

## Recent development updates

- The development `./scripts/start.sh` has been improved to make onboarding easier for new developers and streamline local environment setup:
   - Verifies Docker is running and attempts to start Docker Desktop on macOS when necessary.
   - Creates `.env` from `.env.example` if missing and prompts to edit or continue with defaults.
   - Waits for the database to be ready before running migrations.
   - Ensures a `results` database and role exist in the Docker Compose environment (defaults: `epsm_results` / `epsm_results_user`) and runs results DB migrations when configured.
   - Creates a default Django superuser (`admin` / `admin123`) automatically if absent.

These changes target the development flow; production deployment should continue to rely on explicit provisioning and secure environment variables as documented elsewhere in this guide.

### Restore Database
```bash
# List available backups
ls -la database/backups/

# Restore from backup
./scripts/restore.sh epsm_complete_20240320_143000.sql.gz

# Production restore
./scripts/restore.sh prod epsm_complete_20240320_143000.sql.gz
```

### Manual Database Access
```bash
# Development
docker-compose exec database psql -U epsm_user -d epsm_db

# Production
docker-compose -f docker-compose.prod.yml exec database psql -U epsm_user -d epsm_db
```

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### Service Health Checks
```bash
# Frontend health
curl http://localhost/health

# Backend health  
curl http://localhost/api/health/

# Database health
docker-compose exec database pg_isready -U epsm_user
```

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Service status
docker-compose ps

# Disk usage
docker system df
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer
# Update nginx.conf to include multiple backend servers
```

### Vertical Scaling
```yaml
# In docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :5173
   sudo netstat -tulpn | grep :8000
   ```

2. **Database connection issues**
   ```bash
   # Check database logs
   docker-compose logs database
   
   # Verify database is accessible
   docker-compose exec database pg_isready -U epsm_user
   ```

3. **Frontend build issues**
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   ```

4. **Permission issues**
   ```bash
   # Fix Docker socket permissions
   sudo chmod 666 /var/run/docker.sock
   ```

### Debug Mode

```bash
# Start services in debug mode
docker-compose up --build

# Access container shell
docker-compose exec backend bash
docker-compose exec frontend sh
```

## Security Considerations

1. **Change default passwords**
2. **Use strong secret keys**
3. **Enable SSL/TLS in production**
4. **Configure firewall rules**
5. **Regular security updates**
6. **Monitor access logs**

## Updates & Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Backup database
./scripts/backup.sh prod

# Deploy updates
./scripts/deploy.sh
```

### Update Dependencies
```bash
# Backend dependencies
docker-compose exec backend pip install -r requirements.txt

# Frontend dependencies  
docker-compose exec frontend npm install
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review health checks
- Consult troubleshooting section
- Create GitHub issue with logs and configuration details