# EPSM API Documentation

This document describes the REST API endpoints available in the EPSM (Energy Performance Simulation Manager) backend.

## 🌐 Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com`

## 🔐 Authentication

EPSM uses Django session-based authentication with CSRF protection.

### Login
```http
POST /auth/login/
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

### Logout
```http
POST /auth/logout/
```

### Get Current User
```http
GET /auth/user/
```

## 📊 API Endpoints

### Health Check

#### System Health
```http
GET /api/health/
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-20T14:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### System Resources
```http
GET /api/simulation/system-resources/
```

**Response:**
```json
{
  "cpu_percent": 15.2,
  "memory": {
    "total": 8589934592,
    "available": 6442450944,
    "percent": 25.0
  },
  "disk": {
    "total": 1000000000000,
    "free": 500000000000,
    "percent": 50.0
  }
}
```

### File Management

#### Parse IDF File
```http
POST /api/parse/idf/
Content-Type: multipart/form-data

files: [IDF file(s)]
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "building.idf",
      "zones": [
        {
          "name": "Zone1",
          "floor_area": 100.0,
          "volume": 300.0
        }
      ],
      "constructions": [
        {
          "name": "Wall-1",
          "layers": ["Layer1", "Layer2"]
        }
      ],
      "materials": [
        {
          "name": "Concrete",
          "thickness": 0.1,
          "conductivity": 1.95
        }
      ]
    }
  ]
}
```

#### Parse Weather File
```http
POST /api/parse/weather/
Content-Type: multipart/form-data

files: [EPW file(s)]
```

### Simulation Management

#### Create Simulation
```http
POST /api/simulation/create/
Content-Type: multipart/form-data

idf_files: [IDF files]
weather_file: [EPW file]
name: "Test Simulation"
description: "Description of simulation"
```

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "created",
  "name": "Test Simulation",
  "files": {
    "idf_count": 1,
    "weather_file": "weather.epw"
  }
}
```

#### Run Simulation
```http
POST /api/simulation/run/
Content-Type: application/json

{
  "simulation_id": "uuid-string"
}
```

**Response:**
```json
{
  "status": "started",
  "simulation_id": "uuid-string",
  "estimated_duration": "00:05:30"
}
```

#### Get Simulation Status
```http
GET /api/simulation/{simulation_id}/status/
```

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "running",
  "progress": 65,
  "current_step": "Running EnergyPlus",
  "started_at": "2024-03-20T14:30:00Z",
  "estimated_completion": "2024-03-20T14:35:30Z"
}
```

#### Get Simulation Results
```http
GET /api/simulation/{simulation_id}/results/
```

**Response:**
```json
{
  "simulation_id": "uuid-string",
  "status": "completed",
  "results": {
    "total_energy_kwh": 15420.5,
    "heating_energy_kwh": 8320.2,
    "cooling_energy_kwh": 4100.1,
    "lighting_energy_kwh": 3000.2,
    "monthly_breakdown": [
      {"month": 1, "energy": 1500.5},
      {"month": 2, "energy": 1320.3}
    ],
    "peak_demand_kw": 25.8
  },
  "files": {
    "detailed_results": "/media/results/detailed_output.csv",
    "summary_report": "/media/results/summary.html"
  }
}
```

### Database Operations

#### Materials

##### Get All Materials
```http
GET /api/materials/
```

**Response:**
```json
{
  "count": 6,
  "results": [
    {
      "id": 1,
      "name": "Concrete",
      "thickness_m": 0.1,
      "conductivity": 1.95,
      "density": 2300,
      "specific_heat": 900,
      "cost_per_m2": 50.0,
      "gwp_per_m2": 12.5
    }
  ]
}
```

##### Create Material
```http
POST /api/materials/
Content-Type: application/json

{
  "name": "New Material",
  "thickness_m": 0.05,
  "conductivity": 0.04,
  "density": 20,
  "specific_heat": 1000,
  "cost_per_m2": 25.0,
  "gwp_per_m2": 5.2
}
```

##### Update Material
```http
PUT /api/materials/{id}/
Content-Type: application/json

{
  "name": "Updated Material",
  "thickness_m": 0.06
}
```

##### Delete Material
```http
DELETE /api/materials/{id}/
```

#### Constructions

##### Get All Constructions
```http
GET /api/constructions/
```

##### Create Construction
```http
POST /api/constructions/
Content-Type: application/json

{
  "name": "New Wall",
  "description": "High-performance wall assembly",
  "layers": [
    {"material_id": 1, "order": 1},
    {"material_id": 2, "order": 2}
  ]
}
```

#### Construction Sets

##### Get All Construction Sets
```http
GET /api/construction-sets/
```

##### Create Construction Set
```http
POST /api/construction-sets/
Content-Type: application/json

{
  "name": "Office Building Set",
  "description": "Standard office building constructions",
  "wall_construction_id": 1,
  "roof_construction_id": 2,
  "floor_construction_id": 3,
  "window_construction_id": 4
}
```

### File Downloads

#### Download Simulation Results
```http
GET /api/simulation/{simulation_id}/download/
```

Returns a ZIP file containing all simulation output files.

#### Download Sample Files
```http
GET /api/files/samples/
```

Returns sample IDF and EPW files for testing.

## 🔌 WebSocket API

Real-time updates are available via WebSocket connections.

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/simulation/');
```

### Simulation Updates
```json
{
  "type": "simulation_update",
  "data": {
    "simulation_id": "uuid-string",
    "status": "running",
    "progress": 45,
    "message": "Processing zone calculations"
  }
}
```

### System Status Updates
```json
{
  "type": "system_status",
  "data": {
    "cpu_percent": 78.5,
    "memory_percent": 45.2,
    "active_simulations": 2
  }
}
```

## 📝 Request/Response Formats

### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-03-20T14:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "thickness_m",
      "issue": "Value must be positive"
    }
  },
  "timestamp": "2024-03-20T14:30:00Z"
}
```

## 🚦 HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Delete successful
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

## 🔒 CSRF Protection

For POST/PUT/DELETE requests, include the CSRF token:

```javascript
// Get CSRF token
const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

// Include in request headers
fetch('/api/materials/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken
  },
  body: JSON.stringify(data)
});
```

## 📊 Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication**: 5 requests per minute
- **File uploads**: 10 requests per minute
- **General API**: 100 requests per minute
- **WebSocket**: 1000 messages per minute

## 🧪 Testing the API

### Using curl
```bash
# Login and get session cookie
curl -X POST http://localhost:8000/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Use session for authenticated request
curl -X GET http://localhost:8000/api/materials/ \
  -b cookies.txt
```

### Using Python requests
```python
import requests

# Create session
session = requests.Session()

# Login
response = session.post('http://localhost:8000/auth/login/', 
                       json={'username': 'admin', 'password': 'admin123'})

# Get CSRF token
csrf_token = session.cookies['csrftoken']

# Make authenticated request
response = session.get('http://localhost:8000/api/materials/')
print(response.json())
```

## 📚 Additional Resources

- **Django REST Framework**: https://www.django-rest-framework.org/
- **EnergyPlus**: https://energyplus.net/
- **WebSocket API**: https://channels.readthedocs.io/
- **CSRF Protection**: https://docs.djangoproject.com/en/3.2/ref/csrf/