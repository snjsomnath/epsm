# EPSM Codebase Restructure Plan

## Current Issues
- Frontend and backend files mixed in root directory
- Multiple loose configuration and test files in root
- Partial containerization (backend only)
- Complex dual database setup
- No clear separation of concerns

## Proposed New Structure

```
epsm/
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── DEPLOYMENT.md
│
├── frontend/                    # React + TypeScript + Vite
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── ...
│   └── dist/                    # Build output
│
├── backend/                     # Django API
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   ├── requirements.prod.txt
│   ├── manage.py
│   ├── config/
│   ├── simulation/
│   ├── database/
│   ├── media/
│   ├── staticfiles/
│   ├── templates/
│   └── tests/
│
├── database/                    # Database related files
│   ├── Dockerfile               # Custom PostgreSQL with extensions
│   ├── init/                    # Initialization scripts
│   │   ├── 01-create-databases.sql
│   │   ├── 02-import-schema.sql
│   │   └── 03-import-data.sql
│   ├── exports/                 # Database exports
│   ├── migrations/              # Custom migrations
│   └── backups/                 # Database backups
│
├── scripts/                     # Deployment and utility scripts
│   ├── start.sh
│   ├── stop.sh
│   ├── backup.sh
│   ├── restore.sh
│   ├── deploy.sh
│   └── test.sh
│
├── docs/                        # Documentation
│   ├── API.md
│   ├── DEVELOPMENT.md
│   ├── DEPLOYMENT.md
│   └── ARCHITECTURE.md
│
├── tests/                       # Integration tests
│   ├── api/
│   ├── e2e/
│   └── docker/
│
└── .docker/                     # Docker-related configs
    ├── nginx/
    │   ├── Dockerfile
    │   └── nginx.conf
    └── volumes/                 # Persistent data
```

## Benefits of New Structure

1. **Clear Separation**: Each service has its own directory
2. **Full Containerization**: Everything runs in Docker
3. **Production Ready**: Separate prod configurations
4. **Scalable**: Easy to add new services
5. **Developer Friendly**: Clear development workflow
6. **Deployment Ready**: Comprehensive deployment scripts

## Migration Steps

1. Create new directory structure
2. Move frontend files to `frontend/` directory
3. Improve backend Docker configuration
4. Create database container with initialization
5. Update docker-compose for all services
6. Create deployment scripts and documentation
7. Update CI/CD configurations