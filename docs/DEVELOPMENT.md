# EPSM Development Guide

---
title: Development Guide
layout: default
---

Complete development environment setup and workflow guide for the Energy Performance Simulation Manager (EPSM).

## 🚀 Quick Start

### One-Command Startup
```bash
./scripts/start.sh
```

This script will:
- Start Docker services (PostgreSQL + Django backend + React frontend + Redis)
- Run database migrations automatically
- Create default admin user (admin/admin123)
- Display service status and URLs

### One-Command Shutdown
```bash
./scripts/stop.sh
```

### Check Status
```bash
./scripts/status.sh
```

## 🌐 Service URLs

- **Frontend**: http://localhost:5173 (React + Vite dev server)
- **Backend API**: http://localhost:8000 (Django REST API)
- **Django Admin**: http://localhost:8000/admin/
- **Database**: localhost:5432 (PostgreSQL)
- **Redis**: localhost:6379 (Caching)

## 🔑 Default Credentials

- **Admin User**: admin / admin123
- **Database**: epsm_user / epsm_secure_password

## 🏗️ Architecture Overview

### Frontend (React + TypeScript + Vite)
- **Port**: 5173
- **Technology**: React 18, TypeScript 5.9, Vite 5, Material-UI, Tailwind CSS
- **Features**: Hot Module Replacement, TypeScript compilation, component development
- **Location**: `frontend/` directory

### Backend (Django + REST Framework)
- **Port**: 8000  
- **Technology**: Django 3.2, Django REST Framework, Python 3.11+
- **Features**: REST API, WebSocket support, file processing, EnergyPlus integration
- **Location**: `backend/` directory

### Database (PostgreSQL)
- **Port**: 5432
- **Technology**: PostgreSQL 15 in Docker container
- **Features**: Persistent data storage, materials database, simulation tracking
- **Location**: `database/` directory

### Caching (Redis)
- **Port**: 6379
- **Technology**: Redis 7 Alpine
- **Features**: Session storage, API caching, real-time updates
- **Usage**: Automatic via Django configuration

## 📋 Development Workflow

### Starting Development
```bash
# Start all services
./scripts/start.sh

# Verify everything is running
./scripts/status.sh
```

### Making Changes

#### Frontend Development (frontend/)
- Edit files in `frontend/src/`
- Changes automatically reload via Hot Module Replacement (HMR)
- TypeScript compilation happens automatically
- Tailwind CSS rebuilds on change

#### Backend Development (backend/)
- Edit files in `backend/`
- Django auto-reloads on Python file changes
- For model changes, create and run migrations:
```bash
# Create migrations for model changes
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate
```

#### Database Development
- Access PostgreSQL directly:
```bash
docker-compose exec database psql -U epsm_user -d epsm_db
```

- Common SQL commands:
```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- View user data
SELECT * FROM auth_user;

-- Check simulation runs
SELECT * FROM simulation_runs ORDER BY created_at DESC LIMIT 10;
```

### Testing

#### Run All Tests
```bash
./scripts/test.sh
```

#### Backend Tests Only
```bash
docker-compose exec backend python manage.py test
```

#### Frontend Tests Only
```bash
docker-compose exec frontend npm test
```

#### Manual API Testing
```bash
# Test authentication
curl -X POST http://localhost:8000/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Test materials API
curl -X GET http://localhost:8000/api/materials/ \
  -b cookies.txt

# Test system resources
curl -X GET http://localhost:8000/api/simulation/system-resources/
```

## 🐳 Docker Configuration

### Services
- **backend**: Django application with eppy IDF parsing
- **db**: PostgreSQL database with persistent volumes
- **frontend**: Vite development server (started separately)

### Volumes
- **postgres_data**: Database persistence
- **media_files**: Uploaded IDF/EPW files and simulation results

### Networks
- **default**: Bridge network for inter-service communication

## 📊 Database Schema

### Core Tables
- **auth_user**: Django user authentication
- **simulation_runs**: Simulation metadata and status
- **simulation_files**: File uploads and references
- **simulation_results**: Simulation outputs and metrics
- **simulation_zones**: Zone-specific results
- **simulation_energy_uses**: Energy consumption breakdown

### Legacy Tables (from previous data migration)
- **materials**: Material definitions
- **constructions**: Construction assemblies
- **construction_sets**: Grouped constructions

## 🔍 Troubleshooting

### Services Not Starting
```bash
# Check Docker status
docker version
docker-compose version

# Check port conflicts
lsof -i :5173  # Frontend port
lsof -i :8000  # Backend port
lsof -i :5432  # Database port
```

### Database Connection Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Check database logs
docker-compose logs db
```

### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend Python Issues
```bash
# Rebuild backend container
docker-compose build --no-cache backend
docker-compose up -d backend
```

## 📝 Logging

### Application Logs
- **Backend**: `docker-compose logs backend`
- **Database**: `docker-compose logs db`
- **Frontend**: Console output in frontend terminal

### Simulation Logs
- **EnergyPlus**: Stored in simulation result directories
- **Django**: Application logs show simulation start/completion
- **Database**: Simulation status tracked in `simulation_runs` table

## 🧪 Testing

### API Testing
```bash
# Test authentication
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"sanjay.somanath@chalmers.se","password":"password"}'

# Test system resources
curl -X GET http://localhost:8000/api/simulation/system-resources/

# Test IDF parsing
curl -X POST http://localhost:8000/api/parse/idf/ \
  -F "files=@test_building.idf"
```

### Frontend Testing
- Navigate to http://localhost:5173
- Login with provided credentials
- Upload IDF files and test parsing
- Run simulations through the UI

## 🔐 Security Notes

### Development Environment
- CSRF protection enabled but configured for development
- CORS enabled for frontend-backend communication
- Debug mode enabled for detailed error messages

### Production Considerations
- Change default passwords
- Disable debug mode
- Configure proper CORS origins
- Set up SSL/TLS certificates
- Use environment variables for secrets

## 📚 Additional Resources

- **Django Documentation**: https://docs.djangoproject.com/
- **React Documentation**: https://react.dev/
- **EnergyPlus Documentation**: https://energyplus.net/documentation
- **Eppy Documentation**: https://eppy.readthedocs.io/
- **Docker Compose**: https://docs.docker.com/compose/