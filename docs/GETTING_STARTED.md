# Getting Started with EPSM

This comprehensive guide will help you set up and run the Energy Performance Simulation Manager (EPSM) on your local machine.

## 📋 Prerequisites

### Required Software
- **Docker Desktop**: Version 24.x or later
  - [Download for macOS](https://docs.docker.com/desktop/install/mac-install/)
  - [Download for Windows](https://docs.docker.com/desktop/install/windows-install/)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)
- **Git**: For cloning the repository
- **Text Editor**: VS Code, Sublime Text, or similar

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **Network**: Internet connection for Docker image downloads

## 🚀 Installation

### 1. Clone the Repository
```bash
# Clone the repository
git clone https://github.com/snjsomnath/epsm.git
cd epsm

# Verify directory structure
ls -la
```

You should see directories like `frontend/`, `backend/`, `scripts/`, etc.

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables (optional for development)
nano .env  # or use your preferred editor
```

**Default development values work out-of-the-box**, but you can customize:
```env
# Database Configuration
DB_NAME=epsm_db
DB_USER=epsm_user
DB_PASSWORD=epsm_secure_password
DB_HOST=database
DB_PORT=5432

# Django Configuration
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start the Application
```bash
# Make scripts executable (Unix/Linux/macOS)
chmod +x scripts/*.sh

# Start all services
./scripts/start.sh
```

The script will:
- Pull and build Docker images
- Start PostgreSQL database
- Run Django migrations
- Start the Django backend
- Start the React frontend
- Create default admin user

Notes about `./scripts/start.sh` enhancements:
- It now checks whether Docker is running and will attempt to launch Docker Desktop on macOS if Docker is not available.
- If a `.env` file is missing, the script creates one from `.env.example` and prompts you to edit or continue with defaults.
- The script waits for the database to be ready before running migrations. It also ensures a `results` database and role exist (defaults: `epsm_results` / `epsm_results_user`) and runs results-specific migrations when configured.
- A default Django superuser (`admin` / `admin123`) is created automatically if it does not exist.

### 4. Verify Installation
Open your browser and navigate to:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

**Default login credentials:**
- Username: `admin`
- Password: `admin123`

## 🔧 Development Workflow

### Daily Development
```bash
# Start services
./scripts/start.sh

# Check status
./scripts/status.sh

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
./scripts/stop.sh
```

### Making Changes

#### Frontend Development
- Files are in `frontend/src/`
- Hot Module Replacement (HMR) enabled
- Changes auto-reload in browser
- TypeScript compilation on-the-fly

#### Backend Development
- Files are in `backend/`
- Django auto-reloads on file changes
- Database changes require migrations:
```bash
# Create migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations  
docker-compose exec backend python manage.py migrate
```

#### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec database psql -U epsm_user -d epsm_db

# Common queries
\\dt                    # List tables
\\d table_name          # Describe table
SELECT * FROM auth_user; # View users
```

## 🧪 Testing

### Run Tests
```bash
# All tests
./scripts/test.sh

# Backend tests only
docker-compose exec backend python manage.py test

# Frontend tests only
docker-compose exec frontend npm test
```

### Manual Testing
1. **Authentication**: Login at http://localhost:5173
2. **API**: Test endpoints at http://localhost:8000/api/
3. **Database**: Check data via Django admin
4. **File Upload**: Try uploading IDF files
5. **Simulations**: Create and run test simulations

## 📁 Project Structure

```
epsm/
├── frontend/                   # React TypeScript Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── context/           # React context providers
│   │   ├── lib/               # API clients and utilities
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   ├── Dockerfile             # Development container
│   ├── Dockerfile.prod        # Production container
│   └── package.json           # Dependencies
│
├── backend/                    # Django Backend
│   ├── config/                # Django settings
│   ├── simulation/            # Main app
│   ├── database/              # Database models
│   ├── media/                 # File uploads
│   ├── requirements.txt       # Python dependencies
│   └── manage.py              # Django management
│
├── database/                   # Database Configuration
│   ├── init/                  # Initialization scripts
│   ├── migrations/            # SQL migrations
│   └── exports/               # Database backups
│
├── scripts/                    # Utility Scripts
│   ├── start.sh               # Start development
│   ├── stop.sh                # Stop services
│   ├── status.sh              # Check status
│   ├── test.sh                # Run tests
│   ├── backup.sh              # Database backup
│   └── deploy.sh              # Production deployment
│
└── docs/                       # Documentation
    ├── README.md               # Project overview
    ├── GETTING_STARTED.md      # This file
    ├── API.md                  # API documentation
    ├── ARCHITECTURE.md         # System architecture
    └── DEPLOYMENT.md           # Production deployment
```

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :5173  # Frontend
lsof -i :8000  # Backend
lsof -i :5432  # Database

# Kill processes if needed
kill -9 <PID>
```

#### Docker Issues
```bash
# Restart Docker Desktop
# Or reset Docker
docker system prune -a
docker volume prune
```

#### Database Connection
```bash
# Reset database
docker-compose down -v
./scripts/start.sh
```

#### Frontend Build Issues
```bash
# Clear and reinstall dependencies
docker-compose down
docker-compose build --no-cache frontend
./scripts/start.sh
```

#### Backend Python Issues
```bash
# Rebuild backend
docker-compose build --no-cache backend
./scripts/start.sh
```

### Getting Help

1. **Check logs**: `docker-compose logs [service]`
2. **Verify services**: `./scripts/status.sh`
3. **Reset everything**: `docker-compose down -v && ./scripts/start.sh`
4. **Check documentation**: Browse the `docs/` directory
5. **GitHub Issues**: Create an issue with logs and error details

## 📚 Next Steps

Once you have EPSM running:

1. **Explore the Interface**: Navigate through the web application
2. **Upload Test Files**: Try uploading sample IDF and EPW files
3. **Run Simulations**: Create and execute test simulations
4. **Check API Docs**: Visit http://localhost:8000/api/docs/
5. **Read Architecture**: Review `docs/ARCHITECTURE.md`
6. **Development Guide**: Check `docs/DEVELOPMENT.md`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `./scripts/test.sh`
5. Commit changes: `git commit -m "Description"`
6. Push to branch: `git push origin feature-name`
7. Create a Pull Request

## 📞 Support

- **Documentation**: Check the `docs/` folder
- **GitHub Issues**: https://github.com/snjsomnath/epsm/issues
- **Email**: sanjay.somanath@chalmers.se