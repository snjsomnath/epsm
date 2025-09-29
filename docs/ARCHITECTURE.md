# EPSM Architecture Documentation

---
title: Architecture
layout: default
---

## System Overview

EPSM (Energy Performance Simulation Manager) is a microservices-based web application for managing building energy simulations. The system is built with modern technologies and follows best practices for scalability, maintainability, and deployment.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **UI Components**: Material-UI (MUI)
- **Charts**: Recharts, Chart.js
- **State Management**: React Context API
- **HTTP Client**: Axios

### Backend  
- **Framework**: Django 3.2 with Django REST Framework
- **Language**: Python 3.11
- **Database**: PostgreSQL 15
- **Caching**: Redis 7
- **WebSockets**: Django Channels
- **File Processing**: eppy (EnergyPlus), lxml
- **Container Runtime**: Docker

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL with custom initialization
- **Caching**: Redis for sessions and caching
- **Simulation Engine**: EnergyPlus (containerized)

## Architecture Patterns

### Microservices Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Nginx (Reverse Proxy)                       │
│  - Load balancing                                           │
│  - SSL termination                                          │
│  - Static file serving                                      │
│  - Rate limiting                                            │
└─────────────┬───────────────────┬───────────────────────────┘
              │                   │
              ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐
│   Frontend Service  │  │   Backend Service   │
│   (React/Vite)      │  │   (Django API)      │
│                     │  │                     │
│ - User Interface    │  │ - REST API          │
│ - Client Logic      │  │ - WebSocket API     │
│ - Asset Serving     │  │ - Business Logic    │
└─────────────────────┘  └─────────┬───────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │   Database Service  │
                         │   (PostgreSQL)      │
                         │                     │
                         │ - Application data  │
                         │ - Materials data    │
                         │ - User management   │
                         └─────────────────────┘
```

### Data Flow Architecture
```
Frontend (React) ←→ Backend (Django) ←→ Database (PostgreSQL)
      ↓                     ↓                     ↓
   User Actions         Business Logic       Data Persistence
   - Forms              - Validation         - User data
   - Charts             - Processing         - Simulation data  
   - Navigation         - Simulation         - Materials data
                        - File handling
                             ↓
                    EnergyPlus Container
                    - Simulation execution
                    - Result processing
```

## Service Details

### Frontend Service (React)

**Responsibilities:**
- User interface rendering
- Client-side routing
- State management
- API communication
- Real-time updates via WebSocket

**Key Components:**
```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── simulation/     # Simulation management
│   ├── results/        # Results visualization
│   └── layout/         # Layout components
├── context/            # React Context providers
├── lib/                # API clients and utilities
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

**API Integration:**
- REST API for CRUD operations
- WebSocket for real-time simulation updates
- File upload/download handling
- Authentication token management

### Backend Service (Django)

**Responsibilities:**
- REST API endpoints
- WebSocket handling
- Business logic
- Authentication & authorization
- File processing
- Simulation orchestration

**App Structure:**
```
backend/
├── config/             # Django settings and configuration
├── simulation/         # Core simulation logic
│   ├── models.py      # Data models
│   ├── views.py       # API views
│   ├── services.py    # Business logic
│   ├── consumers.py   # WebSocket consumers
│   └── utils.py       # Utility functions
├── database/          # Database app for materials
└── media/             # File storage
    ├── simulation_files/    # Input files
    └── simulation_results/  # Output files
```

**Key Features:**
- Django REST Framework for API
- Django Channels for WebSocket
- PostgreSQL for data persistence
- Redis for caching and sessions
- Docker integration for EnergyPlus

### Database Service (PostgreSQL)

**Database Schema:**
```sql
-- Application Database (epsm_db)
├── auth_user              # Django users
├── simulation_project     # Projects
├── simulation_scenario    # Scenarios
├── simulation_run         # Simulation runs
└── simulation_result      # Results

-- Materials Database (epsm_materials)  
├── materials              # Building materials
├── constructions          # Wall/roof constructions
├── schedules             # Occupancy schedules
└── thermal_zones         # Zone definitions
```

**Data Relationships:**
- Users → Projects (1:many)
- Projects → Scenarios (1:many)  
- Scenarios → Simulation Runs (1:many)
- Simulation Runs → Results (1:many)

## Security Architecture

### Authentication & Authorization
```
Client Request → Nginx → Django → Database
     ↓              ↓        ↓
Session Cookie → Rate Limit → Permission Check
     ↓              ↓        ↓
CSRF Token →   SSL/TLS →  Row Level Security
```

**Security Measures:**
- Session-based authentication
- CSRF protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- Secure headers
- SSL/TLS encryption

### File Security
- Upload size limits
- File type validation
- Virus scanning (planned)
- Secure file storage
- Access control

## Performance Architecture

### Caching Strategy
```
Browser Cache → CDN → Nginx Cache → Redis → Database
     ↓           ↓         ↓          ↓        ↓
  Static      Static    API Cache   Session   Data
  Assets      Assets    Results     Data      Storage
```

**Caching Layers:**
1. **Browser Cache**: Static assets (CSS, JS, images)
2. **Nginx Cache**: API responses, static files
3. **Redis Cache**: Database queries, session data
4. **Database Cache**: Query optimization

### Scalability
- Horizontal scaling with Docker Swarm/Kubernetes
- Database connection pooling
- Async task processing
- Load balancing
- Auto-scaling policies

## Development Architecture

### Development Workflow
```
Developer → Git → CI/CD → Testing → Deployment
    ↓        ↓      ↓       ↓         ↓
 Local    Branch  Build   Tests    Production
 Docker   Push   Image   Pass     Container
```

**Development Stack:**
- Docker Compose for local development
- Hot reloading for frontend and backend
- Database migrations
- Test automation
- Code quality checks

### Testing Strategy
```
Unit Tests → Integration Tests → E2E Tests → Performance Tests
     ↓              ↓               ↓             ↓
Component     API Endpoints    User Flows    Load Testing
 Tests         Database       UI Testing     Stress Tests
```

## Deployment Architecture

### Container Strategy
```
Application Images → Container Registry → Production Deployment
        ↓                    ↓                     ↓
   Multi-stage           Docker Hub           Docker Compose
   Dockerfiles          Private Registry      Kubernetes/Swarm
```

**Production Configuration:**
- Multi-stage Docker builds
- Environment-specific configurations
- Health checks and monitoring
- Automated backups
- Log aggregation
- Security scanning

### Infrastructure
- **Development**: Docker Compose
- **Staging**: Docker Swarm
- **Production**: Kubernetes (recommended)
- **Database**: Managed PostgreSQL or container
- **Storage**: Object storage for files
- **Monitoring**: Prometheus, Grafana
- **Logging**: ELK stack

## Monitoring & Observability

### Health Checks
- Application health endpoints
- Database connectivity
- Redis connectivity  
- Container health status
- External dependencies

### Metrics Collection
- Application performance
- Database performance
- Container resource usage
- Business metrics
- User activity

### Logging Strategy
- Structured logging
- Centralized log collection
- Log retention policies
- Error tracking
- Audit trails

## Future Architecture Considerations

### Planned Improvements
1. **Microservices Split**: Separate simulation service
2. **Event-Driven Architecture**: Message queues for async processing
3. **API Gateway**: Centralized API management
4. **Service Mesh**: Inter-service communication
5. **Serverless Functions**: For batch processing
6. **Multi-tenant Architecture**: SaaS deployment model

### Technology Roadmap
- GraphQL API alongside REST
- Machine learning integration
- Real-time collaboration features
- Mobile application support
- Cloud-native deployment