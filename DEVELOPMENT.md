# EPSM Development Environment

Complete containerized setup for the Energy Performance Simulation Manager (EPSM) with React frontend, Django backend, PostgreSQL database, and Docker EnergyPlus integration.

## 🚀 Quick Start

### One-Command Startup
```bash
./start-epsm.sh
```

This script will:
- Start Docker services (PostgreSQL + Django backend)
- Open separate terminals for:
  - Backend logs monitoring
  - Frontend development server
  - Database monitoring
  - Docker services status

### One-Command Shutdown
```bash
./stop-epsm.sh
```

### Check Status
```bash
./status-epsm.sh
```

## 🌐 Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin/
- **API Test**: http://localhost:8000/api/test/

## 🔑 Login Credentials

- **Username**: sanjay.somanath@chalmers.se
- **Password**: password

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Port**: 5173
- **Technology**: React 18, TypeScript, Tailwind CSS, Material-UI
- **Features**: IDF file parsing, simulation management, results visualization

### Backend (Django + REST Framework)
- **Port**: 8000
- **Technology**: Django 3.2, PostgreSQL, Docker
- **Features**: Authentication, IDF parsing with eppy, EnergyPlus simulation orchestration

### Database (PostgreSQL)
- **Port**: 5432
- **Technology**: PostgreSQL 13 in Docker container
- **Features**: User management, simulation tracking, results storage

### EnergyPlus Integration
- **Technology**: NREL EnergyPlus Docker container (nrel/energyplus:23.2.0)
- **Features**: Containerized simulation execution, no local EnergyPlus installation required

## 📋 Manual Commands

### Docker Services
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f db

# Restart specific service
docker-compose restart backend

# Check service status
docker-compose ps
```

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Management
```bash
# Django shell
docker-compose exec backend python manage.py shell

# Database migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d epsm_db

# Check simulation data
docker-compose exec db psql -U postgres -d epsm_db -c "SELECT * FROM simulation_runs;"

# Check simulation files
docker-compose exec db psql -U postgres -d epsm_db -c "SELECT * FROM simulation_files;"
```

## 🔧 Development Workflow

### 1. Start Development Environment
```bash
./start-epsm.sh
```

### 2. Make Changes
- Frontend code: Files automatically reload via Vite HMR
- Backend code: Container automatically restarts on changes
- Database: Persistent data in Docker volumes

### 3. Test IDF Parsing
```bash
# Test with sample IDF file
curl -X POST http://localhost:8000/api/parse/idf/ \
  -F "files=@test_building.idf" \
  -H "X-Requested-With: XMLHttpRequest"
```

### 4. Run Simulation
```bash
# Test complete simulation workflow
curl -X POST http://localhost:8000/api/simulation/run/ \
  -F "idf_files=@test_building.idf" \
  -F "weather_file=@test_weather.epw" \
  -H "X-Requested-With: XMLHttpRequest" \
  -H "X-CSRFToken: [token]" \
  -b cookies.txt
```

### 5. Monitor Progress
- Check backend logs terminal for simulation progress
- Use Django admin to view simulation records
- Query database directly for detailed inspection

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

### Legacy Tables (from Supabase migration)
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