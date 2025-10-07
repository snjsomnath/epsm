# Multi-User Architecture in EPSM

## Overview

EPSM currently has **basic multi-user support** with Django's built-in authentication system, but **data isolation between users is limited**. The application is designed more for collaborative work where users share resources rather than strict user-specific data segregation.

## Current Multi-User Implementation

### 🔐 **Authentication System**

#### Backend (Django)
- **Framework**: Django's built-in `User` model (`django.contrib.auth.models.User`)
- **Session Management**: Django session-based authentication
- **Storage**: PostgreSQL database (default database)
- **Location**: `backend/simulation/auth_views.py`

**Key Features:**
- ✅ User registration and login
- ✅ Session-based authentication with cookies
- ✅ CSRF protection
- ✅ Password hashing (Django's built-in PBKDF2)
- ✅ Role-based access (staff, superuser flags)
- ✅ Admin user management interface

#### User Model Fields
```python
User (Django's built-in model):
  - id (primary key)
  - username
  - email
  - password (hashed)
  - first_name
  - last_name
  - is_active
  - is_staff
  - is_superuser
  - date_joined
  - last_login
```

### 📊 **Data Ownership Model**

#### What IS User-Specific

1. **Simulation Runs** (`Simulation` model)
   ```python
   user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
   ```
   - Each simulation can be associated with a user
   - **But**: `null=True, blank=True` means simulations can exist without a user
   - **Current limitation**: No filtering by user in most views

2. **Simulation Results** (`SimulationResult` model)
   ```python
   user_id = models.IntegerField(null=True, blank=True, db_index=True)
   ```
   - Stores user ID as an integer (not a ForeignKey to avoid cross-database issues)
   - Results can be filtered by user
   - **Limitation**: Not enforced - users can potentially see all results

#### What Is SHARED Across All Users

1. **Materials Database**
   - Location: Separate `epsm_materials` database
   - All materials, constructions, and construction sets are **globally accessible**
   - No user ownership tracking
   - Everyone can see and use all materials

2. **Window Glazing**
   - Shared resource pool
   - No user filtering

3. **Constructions & Construction Sets**
   - Globally accessible
   - No per-user isolation

4. **IDF/EPW Files**
   - Uploaded files are stored in shared media directory
   - File paths stored in database are accessible to all users
   - **No access control on file downloads**

### 🔒 **Access Control**

#### Current Access Controls

1. **Admin Dashboard**
   ```python
   if not request.user.is_authenticated or not request.user.is_staff:
       return JsonResponse({'error': 'Forbidden'}, status=403)
   ```
   - Only staff users can access admin features
   - Can manage all users (list, create, update, delete)

2. **User Management**
   - Staff can create/edit/delete other users
   - Users cannot delete themselves via API
   - Changing own elevated flags requires password confirmation

3. **Simulation Results**
   ```python
   # Can filter by user_id (optional)
   if user_id:
       sims = Simulation.objects.filter(user__id=user_id)
   ```
   - Results API supports filtering by `user_id`
   - **But**: Filtering is not enforced by default
   - Any authenticated user can query all results if they don't provide `user_id`

#### What's NOT Protected

❌ **No data isolation for:**
- Materials
- Constructions
- Construction sets
- Window glazing
- Other users' simulations (if you know the ID)
- Uploaded files (if you know the path)

❌ **No row-level security (RLS)**
❌ **No tenant isolation**
❌ **No resource quotas per user**

## Authentication Flow

### Login Process

```
Frontend                          Backend                     Database
   │                                 │                            │
   │  POST /api/auth/login/          │                            │
   │  { email, password }            │                            │
   │────────────────────────────────>│                            │
   │                                 │  SELECT * FROM auth_user   │
   │                                 │  WHERE email = ?           │
   │                                 │───────────────────────────>│
   │                                 │<───────────────────────────│
   │                                 │  Verify password (bcrypt)  │
   │                                 │  Create session            │
   │                                 │  Set session cookie        │
   │<────────────────────────────────│                            │
   │  { user: {...}, session: {...} }│                            │
   │                                 │                            │
```

### Session Management

- **Cookie-based**: `sessionid` cookie set by Django
- **Storage**: PostgreSQL `django_session` table
- **Expiry**: Configurable (default: 2 weeks)
- **Frontend Storage**: Session data also stored in `localStorage` for quick access

## Frontend Authentication

### Context Provider
**Location**: `frontend/src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  session: AuthSession | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}
```

### Protected Routes
```typescript
// Routes requiring authentication
<Route path="/" element={<AppLayout />}>
  <Route index element={<HomePage />} />
  <Route path="database/*" element={<DatabasePage />} />
  <Route path="baseline" element={<BaselinePage />} />
  <Route path="scenario" element={<ScenarioPage />} />
  <Route path="simulation" element={<SimulationPage />} />
  <Route path="results" element={<ResultsPage />} />
  <Route path="admin" element={<AdminDashboard />} />
</Route>
```

- All routes under `AppLayout` check authentication status
- Unauthenticated users redirected to `/login`

## Database Architecture

### User Data Distribution

```
PostgreSQL (default database - epsm_db)
├── auth_user                    # Django users
├── django_session               # Active sessions
├── simulation_runs              # Has user FK (nullable)
└── simulation_results           # Has user_id (nullable)

PostgreSQL (materials database - epsm_materials)
├── materials                    # SHARED - no user tracking
├── constructions                # SHARED - no user tracking
├── construction_sets            # SHARED - no user tracking
└── window_glazing               # SHARED - no user tracking
```

### Cross-Database Considerations

**Why `user_id` is IntegerField instead of ForeignKey:**
```python
# In SimulationResult model
user_id = models.IntegerField(null=True, blank=True, db_index=True)
```

- Results might be stored in a separate database
- Django doesn't support cross-database ForeignKey constraints
- Storing user ID as integer allows flexibility

## Current Limitations & Security Concerns

### 🔴 **Critical Limitations**

1. **No Data Isolation**
   - Users can access each other's simulations if they know the ID
   - No enforcement of user-specific data access
   - Materials and constructions are globally shared

2. **No Resource Quotas**
   - Users can create unlimited simulations
   - No limits on file uploads
   - No disk space management per user

3. **No Audit Trail**
   - No tracking of who created/modified what
   - No change history
   - Limited logging of user actions

4. **File System Access**
   - Uploaded files not protected by user
   - Direct file paths accessible if known
   - No signed URLs or time-limited access

5. **Celery Task Ownership**
   - Simulation tasks run without user context
   - Anyone can potentially access task results
   - No user-based task isolation

### ⚠️ **Medium Concerns**

1. **Session Security**
   - Sessions stored in database (good)
   - But no session timeout enforcement
   - No concurrent session limits

2. **CORS Configuration**
   ```python
   CORS_ALLOWED_ORIGINS: "http://localhost:5173,http://frontend:5173"
   ```
   - Development-focused configuration
   - Needs tightening for production

3. **API Rate Limiting**
   - No rate limiting implemented
   - Users can spam requests
   - No DDoS protection

## Recommended Improvements

### Short-Term (Easy Wins)

1. **Enforce User Filtering in Views**
   ```python
   # Always filter by current user
   def list_simulation_results(request):
       if not request.user.is_authenticated:
           return JsonResponse({'error': 'Unauthorized'}, status=401)
       
       # Force user filtering
       results = SimulationResult.objects.filter(user_id=request.user.id)
       # ... rest of logic
   ```

2. **Add User to All Resources**
   ```python
   # Add user field to materials, constructions, etc.
   class Material(models.Model):
       user = models.ForeignKey(User, on_delete=models.CASCADE)
       # ... other fields
   ```

3. **File Access Control**
   ```python
   # Check user ownership before serving files
   def download_file(request, file_path):
       simulation = get_simulation_from_path(file_path)
       if simulation.user != request.user:
           return HttpResponse('Forbidden', status=403)
       return FileResponse(...)
   ```

### Medium-Term (Moderate Effort)

1. **Row-Level Security (RLS)**
   - Implement database-level access control
   - Use PostgreSQL RLS policies
   - Automatically filter queries by user

2. **Resource Quotas**
   ```python
   class UserProfile(models.Model):
       user = models.OneToOneField(User, on_delete=models.CASCADE)
       max_simulations = models.IntegerField(default=100)
       max_storage_mb = models.IntegerField(default=1000)
       current_storage_mb = models.FloatField(default=0)
   ```

3. **Audit Logging**
   ```python
   class AuditLog(models.Model):
       user = models.ForeignKey(User, on_delete=models.CASCADE)
       action = models.CharField(max_length=50)
       resource_type = models.CharField(max_length=50)
       resource_id = models.UUIDField()
       timestamp = models.DateTimeField(auto_now_add=True)
       ip_address = models.GenericIPAddressField()
   ```

### Long-Term (Major Refactoring)

1. **Multi-Tenancy**
   - Separate organizations/workspaces
   - Team collaboration features
   - Shared and private resources

2. **Advanced Permissions**
   - Role-based access control (RBAC)
   - Custom permission groups
   - Resource-level permissions

3. **OAuth/SSO Integration**
   - Support for institutional logins
   - SAML integration
   - Social auth providers

## Usage Patterns

### Current Design Philosophy

EPSM is designed for **collaborative research environments** where:
- Small teams share materials and constructions
- Users trust each other
- Focus is on simulation workflows, not strict data isolation
- Typical use: University research groups, small consulting firms

### Not Suitable For

❌ **SaaS Multi-Tenant Environments**
- Where strict user isolation is required
- Commercial use with paying customers
- Regulatory compliance requirements (GDPR, HIPAA, etc.)

❌ **Public/Untrusted Users**
- Open internet access
- Unknown/untrusted user base
- Requires bulletproof security

## Configuration

### Default Users

Development setup includes:
```python
# Superuser
username: admin
password: admin123

# Demo user
email: demo@chalmers.se
password: demo123
```

⚠️ **Change these in production!**

### Environment Variables

```bash
# Django settings
DJANGO_SECRET_KEY=<change-in-production>
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=epsm_db
DB_USER=epsm_user
DB_PASSWORD=<secure-password>
```

## Testing Multi-User Scenarios

### Manual Testing

```bash
# 1. Create test users
curl -X POST http://localhost:8000/api/auth/users/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "test123",
    "is_staff": false
  }'

# 2. Login as different users
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "test123"
  }'

# 3. Test data isolation (should be improved)
curl http://localhost:8000/api/simulation/results/?user_id=<user_id> \
  -H "Cookie: sessionid=<session_id>"
```

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | ✅ Implemented | Django built-in |
| Session Management | ✅ Implemented | Cookie-based |
| Role-Based Access | ⚠️ Partial | Staff/superuser only |
| Data Isolation | ❌ Limited | Simulations only, not enforced |
| Resource Quotas | ❌ Not Implemented | No limits |
| Audit Logging | ❌ Not Implemented | No tracking |
| Multi-Tenancy | ❌ Not Implemented | Single workspace |
| File Access Control | ❌ Not Implemented | Files accessible if path known |
| API Rate Limiting | ❌ Not Implemented | No protection |

**Current Best Use Case**: Small, trusted research teams collaborating on building simulations with shared material databases.

**Not Recommended For**: Public SaaS, untrusted users, or scenarios requiring strict data isolation.

---

**Last Updated**: 2025-10-07  
**Document Version**: 1.0  
**Related Docs**: [SECURITY.md](SECURITY.md), [API.md](API.md), [DEVELOPMENT.md](DEVELOPMENT.md)
