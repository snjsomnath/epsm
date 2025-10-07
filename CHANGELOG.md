# Changelog

All notable changes to the Energy Performance Simulation Manager (EPSM) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Backend production Docker build failing due to missing requirements.txt
  - Added requirements.txt to COPY command in backend/Dockerfile.prod
  - requirements.prod.txt references requirements.txt with `-r` flag

### Planned
- Features and improvements planned for next release

---

## [0.1.2] - 2025-10-07

### Fixed
- Production Docker build failing due to missing vite dependency
  - Changed `npm ci --only=production` to `npm ci` in frontend/Dockerfile.prod
  - Vite is required during build step but was in devDependencies

### Planned
- Features and improvements planned for next release

---

## [0.1.1] - 2025-10-07

### Release version 0.1.1


### Planned
- Enhanced data export capabilities
- Advanced filtering and search in results
- Multi-user collaboration features
- Enhanced baseline comparison tools

---

## [0.1.0] - 2025-10-07

### Added
- **Core Simulation Engine**
  - Integration with EnergyPlus 23.2.0 via Docker
  - Celery-based asynchronous task queue for parallel simulations
  - Redis for task queue and caching
  - Real-time WebSocket updates for simulation progress
  - Comprehensive error handling and retry logic

- **Frontend Features**
  - Material-UI based responsive interface
  - Dark/light theme toggle
  - Interactive login page with explainer animations
  - Homepage with system status and resource monitoring
  - Database management for materials, constructions, and construction sets
  - Baseline simulation workflow with IDF/EPW upload
  - Scenario creation with renovation strategy builder
  - Batch simulation management
  - Results visualization with interactive charts
  - Hourly timeseries data display with grouping options
  - Raw data lazy loading for large datasets
  - About dialog with project information

- **Backend Features**
  - Django 3.2 REST API
  - PostgreSQL 15 database with separate materials database
  - Django Channels for WebSocket support
  - Unified IDF parser using eppy library
  - Construction surface area calculations
  - GWP (Global Warming Potential) and cost tracking
  - System resource monitoring (CPU, memory, disk)
  - EnergyPlus version detection

- **Database Management**
  - Materials database with thermal properties
  - Window glazing specifications
  - Construction assemblies with U-value calculations
  - Construction sets for building templates
  - Migration system for schema updates

- **Infrastructure**
  - Docker Compose for development and production
  - Multi-stage Dockerfile for optimized builds
  - PostgreSQL initialization scripts
  - Nginx reverse proxy for production
  - Volume persistence for database and media files
  - Shell scripts for service management (start, stop, restart, status)

- **Documentation**
  - Comprehensive README with project overview
  - Getting Started guide
  - Development guide
  - Architecture documentation
  - API documentation
  - Deployment guide
  - Celery migration guide
  - Resource monitoring guide
  - GitHub Pages documentation site

- **Simulation Features**
  - IDF file parsing and validation
  - Zone area extraction and verification
  - Construction assignment workflows
  - Batch scenario generation
  - Queue management with priority handling
  - Simulation safeguards (timeout, resource limits)
  - Result persistence with detailed metadata

- **Data Visualization**
  - Energy use intensity charts
  - Heating/cooling demand breakdowns
  - Hourly timeseries plots
  - Comparative analysis scatter plots
  - KPI tiles with formatting
  - Export capabilities (CSV, JSON)

- **User Experience**
  - Guided tours using driver.js
  - Interactive explainer animations
  - Loading states and progress indicators
  - Error boundaries and graceful degradation
  - Responsive design for mobile/tablet
  - Keyboard shortcuts and accessibility features

### Changed
- Migrated from ThreadPoolExecutor to Celery for better scalability
- Improved IDF parser to handle edge cases
- Enhanced error messages and validation
- Optimized chart rendering for large datasets
- Refactored simulation queue management

### Fixed
- Zone area calculation edge cases
- Duplicate email handling in authentication
- WebSocket connection stability
- Memory leaks in long-running simulations
- Chart normalization issues
- Raw data pagination performance
- Result display inconsistencies

### Security
- CSRF protection enabled
- Session-based authentication
- Input validation and sanitization
- SQL injection prevention via ORM
- File upload validation
- Environment variable configuration for secrets

---

## Version History

### Version Numbering
EPSM follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner  
- **PATCH** version for backwards compatible bug fixes

### Release Types
- **Alpha**: Internal testing versions (0.0.x)
- **Beta**: Public testing versions (0.x.0)
- **Stable**: Production-ready versions (1.x.x+)

### Support
- Latest stable release receives full support
- Previous minor versions receive security updates for 6 months
- Development/beta releases are not supported in production

---

[Unreleased]: https://github.com/snjsomnath/epsm/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/snjsomnath/epsm/releases/tag/v0.1.0
