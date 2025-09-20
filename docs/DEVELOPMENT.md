# EPSM Development Guide

## Getting Started

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Git
- VS Code (recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd epsm
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # The defaults in .env work for development
   ```

3. **Start development environment**
   ```bash
   ./scripts/start.sh
   ```

4. **Verify setup**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API docs: http://localhost:8000/api/docs/
   - Django admin: http://localhost:8000/admin (admin/admin123)

## Development Workflow

### Project Structure
```
epsm/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context
│   │   ├── lib/             # API clients
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── Dockerfile           # Development container
│   ├── Dockerfile.prod      # Production container
│   └── package.json
│
├── backend/                  # Django application
│   ├── config/              # Django settings
│   ├── simulation/          # Main app
│   ├── database/            # Database app
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile.dev       # Development container
│   └── Dockerfile.prod      # Production container
│
├── database/                 # Database configuration
│   ├── init/                # Initialization scripts
│   ├── exports/             # Database exports
│   └── Dockerfile
│
├── scripts/                  # Deployment scripts
├── docs/                     # Documentation
└── docker-compose.yml       # Development services
```

### Frontend Development

#### Technology Stack
- **React 18**: UI library with hooks
- **TypeScript**: Type safety
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Material-UI**: Component library
- **React Router**: Client-side routing

#### Development Commands
```bash
# Install dependencies
docker-compose exec frontend npm install

# Start development server (already running)
docker-compose logs -f frontend

# Run tests
docker-compose exec frontend npm test

# Build for production
docker-compose exec frontend npm run build

# Lint code
docker-compose exec frontend npm run lint
```

#### Adding New Components
```typescript
// src/components/example/ExampleComponent.tsx
import React from 'react';
import { Button, Typography } from '@mui/material';

interface ExampleComponentProps {
  title: string;
  onClick: () => void;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  onClick
}) => {
  return (
    <div className="p-4">
      <Typography variant="h6">{title}</Typography>
      <Button onClick={onClick} variant="contained">
        Click me
      </Button>
    </div>
  );
};
```

#### API Integration
```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  withCredentials: true,
});

export const simulationApi = {
  getProjects: () => api.get('/api/simulation/projects/'),
  createProject: (data: ProjectData) => api.post('/api/simulation/projects/', data),
  runSimulation: (id: string) => api.post(`/api/simulation/projects/${id}/run/`),
};
```

### Backend Development

#### Technology Stack
- **Django 3.2**: Web framework
- **Django REST Framework**: API framework
- **Django Channels**: WebSocket support
- **PostgreSQL**: Database
- **Redis**: Caching and sessions
- **Celery**: Async task processing (planned)

#### Development Commands
```bash
# Access Django shell
docker-compose exec backend python manage.py shell

# Run migrations
docker-compose exec backend python manage.py migrate

# Create migrations
docker-compose exec backend python manage.py makemigrations

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run tests
docker-compose exec backend python manage.py test

# Collect static files
docker-compose exec backend python manage.py collectstatic
```

#### Adding New API Endpoints
```python
# simulation/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Project
from .serializers import ProjectSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    @action(detail=True, methods=['post'])
    def run_simulation(self, request, pk=None):
        project = self.get_object()
        # Simulation logic here
        return Response({'status': 'simulation_started'})
```

#### Database Models
```python
# simulation/models.py
from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

### Database Development

#### Accessing Database
```bash
# PostgreSQL shell
docker-compose exec database psql -U epsm_user -d epsm_db

# View tables
\dt

# Describe table
\d simulation_project

# Raw SQL queries
SELECT * FROM simulation_project LIMIT 10;
```

#### Database Migrations
```bash
# Create migration
docker-compose exec backend python manage.py makemigrations simulation

# Apply migrations
docker-compose exec backend python manage.py migrate

# Show migration status
docker-compose exec backend python manage.py showmigrations
```

## Testing

### Frontend Testing
```bash
# Unit tests
docker-compose exec frontend npm test

# E2E tests (if configured)
docker-compose exec frontend npm run test:e2e

# Test coverage
docker-compose exec frontend npm run test:coverage
```

### Backend Testing
```bash
# All tests
docker-compose exec backend python manage.py test

# Specific app
docker-compose exec backend python manage.py test simulation

# With coverage
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

### Integration Testing
```bash
# Run full test suite
./scripts/test.sh
```

## Debugging

### Frontend Debugging
```bash
# View logs
docker-compose logs -f frontend

# Access container
docker-compose exec frontend sh

# Install packages for debugging
docker-compose exec frontend npm install --save-dev @types/debug
```

### Backend Debugging
```bash
# View logs
docker-compose logs -f backend

# Access container shell
docker-compose exec backend bash

# Django shell
docker-compose exec backend python manage.py shell

# Debug with breakpoints
# Add this to your code:
import pdb; pdb.set_trace()
```

### Database Debugging
```bash
# View database logs
docker-compose logs database

# Monitor database activity
docker-compose exec database pg_stat_activity

# Query performance
EXPLAIN ANALYZE SELECT * FROM simulation_project;
```

## Code Quality

### Frontend Code Quality
```bash
# ESLint
docker-compose exec frontend npm run lint

# TypeScript checking
docker-compose exec frontend npm run type-check

# Prettier formatting
docker-compose exec frontend npm run format
```

### Backend Code Quality
```bash
# Python formatting with black
docker-compose exec backend black .

# Import sorting with isort
docker-compose exec backend isort .

# Linting with flake8
docker-compose exec backend flake8 .

# Type checking with mypy
docker-compose exec backend mypy .
```

## Performance Optimization

### Frontend Performance
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize bundle size with code splitting
- Use service workers for caching

### Backend Performance
- Database query optimization
- Use select_related and prefetch_related
- Implement caching strategies
- Async views for I/O operations

### Database Performance
- Add database indexes
- Optimize queries
- Use connection pooling
- Regular VACUUM and ANALYZE

## Hot Reloading

Both frontend and backend support hot reloading in development:

- **Frontend**: Vite automatically reloads on file changes
- **Backend**: Django development server reloads on Python file changes
- **Database**: Schema changes require manual migration

## Environment Variables

Development environment variables in `.env`:

```env
# Development defaults (safe to use)
DEBUG=True
DB_PASSWORD=epsm_secure_password
DJANGO_SECRET_KEY=dev-secret-key
VITE_API_BASE_URL=http://localhost:8000
```

## Common Development Tasks

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/new-feature`
2. Add backend models and API endpoints
3. Run migrations: `docker-compose exec backend python manage.py migrate`
4. Add frontend components and API integration
5. Write tests for both frontend and backend
6. Test the integration
7. Submit pull request

### Updating Dependencies
```bash
# Frontend dependencies
docker-compose exec frontend npm update

# Backend dependencies
docker-compose exec backend pip install -r requirements.txt

# Rebuild containers if needed
docker-compose build --no-cache
```

### Resetting Development Environment
```bash
# Stop all services
./scripts/stop.sh

# Remove all containers and volumes
docker-compose down -v

# Start fresh
./scripts/start.sh
```

## IDE Setup

### VS Code Extensions
- Python
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- GitLens
- Docker
- Thunder Client (for API testing)

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "python.defaultInterpreterPath": "/usr/local/bin/python",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process using port
   sudo lsof -ti:5173 | xargs kill -9
   ```

2. **Database connection refused**
   ```bash
   # Restart database service
   docker-compose restart database
   ```

3. **Frontend won't start**
   ```bash
   # Clear node_modules and reinstall
   docker-compose exec frontend rm -rf node_modules
   docker-compose exec frontend npm install
   ```

4. **Python import errors**
   ```bash
   # Rebuild backend container
   docker-compose build --no-cache backend
   ```

### Getting Help
- Check logs: `docker-compose logs -f [service]`
- Access container shell: `docker-compose exec [service] bash/sh`
- Restart services: `docker-compose restart [service]`
- Full reset: `./scripts/stop.sh && ./scripts/start.sh`