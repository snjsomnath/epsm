# EPSM - Energy Performance Simulation Manager

[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://www.typescriptlang.org/)
[![Django](https://img.shields.io/badge/Django-3.2-092E20.svg)](https://www.djangoproject.com/)
[![Docker](https://img.shields.io/badge/Docker-24.x-2496ED.svg)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg)](https://www.postgresql.org/)

A modern, containerized web application for managing building energy performance simulations using EnergyPlus. Developed at Chalmers University of Technology, EPSM empowers building owners, researchers, and engineers to explore and evaluate energy renovation strategies across large building stocks—quickly, transparently, and at low cost.

## 🚀 Quick Start

### Prerequisites
- Docker 24.x+ with Docker Compose
- 4GB+ RAM, 10GB+ disk space
- Git

### Development Setup
```bash
# Clone repository
git clone https://github.com/snjsomnath/epsm.git
cd epsm

# Start development environment
./scripts/start.sh

# Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# Django Admin: http://localhost:8000/admin (admin/admin123)
```

## 📁 Project Structure

## 📁 Project Structure

```
epsm/
├── frontend/              # React + TypeScript + Vite frontend
├── backend/               # Django REST API backend
├── src/                   # Legacy frontend source (being migrated)
├── database/              # PostgreSQL configuration & migrations
├── scripts/               # Development and deployment scripts
├── docs/                  # Documentation
├── tests/                 # Test files
├── configs/               # Configuration files (symlinked to root)
├── .docker/               # Docker configurations
├── docker-compose.yml     # Development services
├── docker-compose.prod.yml # Production services
└── package.json           # Root npm configuration
```

## 🏗️ Architecture

- **Frontend**: React 18, TypeScript 5.9, Vite 5, Tailwind CSS, Material-UI
- **Backend**: Django 3.2, Django REST Framework, PostgreSQL 15, Redis 7
- **Infrastructure**: Docker Compose, Nginx (production), WebSocket support
- **Simulation**: EnergyPlus (containerized via NREL Docker image)
- **Development**: Hot reload, containerized services, automated setup

## 📖 Documentation

 - [📋 Development Guide](DEVELOPMENT.md) - Setup and development workflow
 - [🚀 Deployment Guide](DEPLOYMENT.md) - Production deployment
 - [🏛️ Architecture Guide](ARCHITECTURE.md) - System architecture
 - [📋 API Documentation](http://localhost:8000/api/docs/) - REST API docs

## 🚀 Features

- **Interactive Component Database**
  - Create and manage materials, constructions, and construction sets
  - Track environmental impact (GWP) and cost metrics
  - Version control and change tracking
  - Real-time collaboration support

- **Baseline Model Management**
  - Upload and parse IDF files
  - Extract geometry and schedules
  - Run baseline simulations
  - Automatic component detection

- **Scenario Builder**
  - Create renovation scenarios
  - Define parameter combinations
  - Estimate simulation times
  - Track scenario versions

- **Batch Simulation Runner**
  - Parallel simulation execution
  - Real-time progress monitoring
  - Resource usage tracking
  - Error handling and recovery

- **Results Analysis**
  - Interactive visualization
  - Energy savings comparison
  - Cost-benefit analysis
  - Export to various formats

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript 5.9
- **Build Tool**: Vite 5
- **UI Components**: Material-UI (@mui/material 5.15)
- **Styling**: Tailwind CSS 3.4
- **Charts**: Chart.js, Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Development**: Hot Module Replacement (HMR)

### Backend  
- **Framework**: Django 3.2 with Django REST Framework
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15
- **Caching**: Redis 7 (Alpine)
- **WebSockets**: Django Channels + Daphne
- **File Processing**: eppy (EnergyPlus), lxml
- **Authentication**: Django sessions + JWT

### Infrastructure
- **Containerization**: Docker Compose
- **Development**: Hot reload for both frontend and backend
- **Database**: PostgreSQL with persistent volumes
- **Caching**: Redis for sessions and caching
- **Simulation**: EnergyPlus via Docker containers
- **Reverse Proxy**: Nginx (production)

## 📦 Project Structure

```
epsm/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── baseline/      # Baseline simulation
│   │   ├── database/      # Database management
│   │   ├── layout/        # Layout components
│   │   ├── scenario/      # Scenario management
│   │   └── simulation/    # Simulation controls
│   ├── context/           # React context providers
│   ├── lib/               # Shared utilities
│   ├── types/             # TypeScript definitions
│   └── utils/             # Helper functions
├── backend/               # Django backend
│   ├── simulation/        # Simulation management
│   ├── database/          # Database models
│   └── config/            # Django settings
├── supabase/              # Supabase configuration
│   └── migrations/        # Database migrations
└── public/                # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Python 3.8+
- [EnergyPlus](https://energyplus.net/) installed
- PostgreSQL (optional, for local development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/epsm.git
   cd epsm
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

### Development

1. Start the frontend development server:
   ```bash
   npm run dev
   ```

2. Start the Django backend:
   ```bash
   cd backend
   daphne -p 8000 config.asgi:application
   ```

3. Access the application at [http://localhost:5173](http://localhost:5173)


### Production Deployment

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Configure your web server (e.g., Nginx) to serve the static files from `dist/`

3. Set up the Django backend with Gunicorn and Nginx

4. Configure environment variables for production

## 🔒 Security

- All database access is controlled through Django ORM and permissions
- Authentication handled by Django with JWT tokens
- CORS configured for production domains only
- Rate limiting on API endpoints
- Input validation and sanitization
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

This project is funded by the Swedish Energy Agency under Project ID P2024-04053.

### Partners
- Lindholmen Science Park AB
- Sinom AB
- Stiftelsen Chalmers Industriteknik

### Team
- **Lead Developer**: Sanjay Somanath
- **Principal Investigator**: Alexander Hollberg
- **Team Members**: Yinan Yu, Sanjay Somanath

## 📞 Contact

For questions and support, please contact:
- Sanjay Somanath (Lead Developer)
- Email: sanjay.somanath@chalmers.se

