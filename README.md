# EnergyPlus Simulation Manager (epsm)

A web-based platform for managing, running, and analyzing EnergyPlus building energy simulations. The system provides a modern React frontend and a Django REST backend, supporting user authentication, database management, scenario creation, and batch simulation workflows.

## Features

- User authentication and session management
- Material, construction, and scenario database management (through supabase)
- Guided onboarding tour for new users
- Baseline and scenario simulation setup
- Batch simulation execution and monitoring
- Results analysis and reporting
- Responsive UI with Material UI and Tailwind CSS
- Integration with EnergyPlus simulation engine

## Folder Structure

```
epsm/
├── backend/           # Django backend (API, simulation, database)
├── src/               # React frontend source code
├── public/            # Static assets
├── index.html         # Frontend entry point
├── package.json       # Frontend dependencies and scripts
├── tailwind.config.js # Tailwind CSS config
├── vite.config.ts     # Vite config
└── README.md
```

## Prerequisites

- Node.js (v18+ recommended)
- Python 3.8+
- [EnergyPlus](https://energyplus.net/) installed (set `ENERGYPLUS_PATH` in backend)
- (Optional) [PostgreSQL](https://www.postgresql.org/) if you want to use a production database

## Getting Started

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Start the Frontend Dev Server

```bash
npm run dev
```
The app will be available at [http://localhost:5173](http://localhost:5173).

### 3. Set Up and Run the Django Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
The backend API will be available at [http://localhost:8000](http://localhost:8000).

### 4. Environment Variables

- Frontend: See `.env` (if needed for API URLs)
- Backend: Copy `.env.example` to `.env` and set `DJANGO_SECRET_KEY`, `ENERGYPLUS_PATH`, etc.

### 5. Usage

- Visit the frontend URL and register/login.
- Use the guided tour to get started.
- Manage your database, upload baseline files, create scenarios, and run simulations.

## Development

- Frontend: React + Vite + TypeScript + Tailwind CSS + Material UI
- Backend: Django + Django REST Framework + EnergyPlus integration

---
