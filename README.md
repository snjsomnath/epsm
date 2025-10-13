# EPSM - Energy Performance Simulation Manager

[![Version](https://img.shields.io/badge/version-0.2.7-blue.svg)](https://github.com/snjsomnath/epsm/releases/tag/v0.2.7)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE.md)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Django](https://img.shields.io/badge/Django-3.2-092E20.svg?logo=django)](https://www.djangoproject.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker)](https://www.docker.com/)
[![EnergyPlus](https://img.shields.io/badge/EnergyPlus-23.2-red.svg)](https://energyplus.net/)

> A modern, containerized web application for managing building energy performance simulations using EnergyPlus.

Developed at **Chalmers University of Technology**, EPSM empowers building owners, researchers, and engineers to explore and evaluate energy renovation strategies across large building stocks—quickly, transparently, and at low cost.


## 🚀 Quick Start

### Prerequisites
- **Docker** 24.x+ with Docker Compose
- **System Requirements**: 4GB+ RAM, 10GB+ disk space

### Get Running in 2 Minutes

```bash
# Clone and start
git clone https://github.com/snjsomnath/epsm.git
cd epsm
./scripts/start.sh

# Access the application
# 🌐 Frontend:     http://localhost:5173
# 🔌 Backend API:  http://localhost:8000
# 👤 Admin Panel:  http://localhost:8000/admin (admin/admin123)
```

---

## ✨ Key Features

- **🗄️ Component Database** - Manage materials, constructions, and building templates
- **� Baseline Modeling** - Upload IDF files, extract geometry, run simulations
- **🎯 Scenario Builder** - Create renovation scenarios with parameter combinations
- **⚡ Batch Simulations** - Parallel execution with real-time progress monitoring
- **📊 Results Analysis** - Interactive visualizations, energy savings, cost-benefit analysis

---

## 🏗️ Architecture

```
Frontend (React + TypeScript)  →  Backend (Django REST API)  →  PostgreSQL
     ↓                                      ↓                        ↓
  Vite + MUI                    Celery Workers              Materials DB
                                      ↓
                            EnergyPlus (Docker)
```

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5.9, Vite 5, Material-UI, Tailwind CSS
- **Backend**: Django 3.2, Django REST Framework, Celery, Redis
- **Database**: PostgreSQL 15 (application + materials databases)
- **Simulation**: EnergyPlus 23.2 (containerized)
- **Infrastructure**: Docker Compose, Nginx (production), WebSockets

---

## 📖 Documentation

| Guide | Description |
|-------|-------------|
| [📋 Getting Started](docs/GETTING_STARTED.md) | Installation and first steps |
| [� Development Guide](docs/DEVELOPMENT.md) | Development workflow and patterns |
| [🏛️ Architecture](docs/ARCHITECTURE.md) | System design and components |
| [� Deployment](docs/DEPLOYMENT.md) | Production deployment guide |
| [📝 Changelog](CHANGELOG.md) | Version history and changes |

---

## 📁 Project Structure

```
epsm/
├── frontend/          # React + TypeScript UI
├── backend/           # Django REST API
├── database/          # PostgreSQL config & migrations
├── scripts/           # Dev/deployment scripts
├── docs/              # Documentation
├── nginx/             # Nginx configuration (production)
└── docker-compose.yml # Development environment
```

---

## 🛠️ Development

### Start Development Environment
```bash
./scripts/start.sh        # Start all services
./scripts/stop.sh         # Stop all services
./scripts/restart.sh      # Restart services
./scripts/status.sh       # Check service status
```

### Access Services
- **Frontend Dev Server**: http://localhost:5173 (Hot reload enabled)
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/docs/

### Common Tasks
```bash
# Backend: Run migrations
docker-compose exec backend python manage.py migrate

# Backend: Create superuser
docker-compose exec backend python manage.py createsuperuser

# Frontend: Install new packages
docker-compose exec frontend npm install <package-name>

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## 🚀 Production Deployment

For production deployment on Chalmers infrastructure or other servers:

1. **Prepare environment**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with production credentials
   ```

2. **Deploy**
   ```bash
   ./scripts/deploy.sh production
   ```

3. **Setup SSL** (for HTTPS)
   ```bash
   ./scripts/setup_ssl.sh
   ```

📚 See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`./scripts/test.sh`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the **MIT License** - see [LICENSE.md](LICENSE.md) for details.

---

## 🙏 Acknowledgments

**Funding**: Swedish Energy Agency (Project ID: P2024-04053)

**Partners**:
- Lindholmen Science Park AB
- Sinom AB  
- Stiftelsen Chalmers Industriteknik

**Team**:
- **Lead Developer**: Sanjay Somanath
- **Principal Investigator**: Alexander Hollberg
- **Contributors**: Yinan Yu

---

## 📞 Contact

**Sanjay Somanath** (Lead Developer)  
📧 sanjay.somanath@chalmers.se  
🏛️ Chalmers University of Technology

🌐 **Project Homepage**: https://github.com/snjsomnath/epsm  
📦 **Docker Images**: https://github.com/snjsomnath/epsm/pkgs/container/epsm-backend

---

<div align="center">
  
Made with ❤️ at Chalmers University of Technology

</div>