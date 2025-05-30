# EnergyPlus Simulation Manager (EPSM)

[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.39-3ECF8E.svg)](https://supabase.io/)
[![Django](https://img.shields.io/badge/Django-3.2-092E20.svg)](https://www.djangoproject.com/)

EPSM is a comprehensive web-based platform for managing, running, and analyzing EnergyPlus building energy simulations. Developed at Chalmers University of Technology, it empowers building owners, researchers, and engineers to explore and evaluate energy renovation strategies across large building stocks—quickly, transparently, and at low cost.

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
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Material-UI
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Data Fetching**: Axios
- **Real-time Updates**: Supabase Realtime

### Backend
- **Framework**: Django REST Framework
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Task Queue**: Django Background Tasks
- **API Documentation**: OpenAPI/Swagger

### Simulation Engine
- **Core Engine**: EnergyPlus
- **File Format**: IDF (Input Data File)
- **Weather Data**: EPW (EnergyPlus Weather)
- **Parallel Processing**: Python Multiprocessing

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
- [Supabase](https://supabase.com/) account
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
   # Edit .env with your Supabase credentials
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

- All database access is controlled through Row Level Security (RLS)
- Authentication handled by Supabase with JWT tokens
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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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