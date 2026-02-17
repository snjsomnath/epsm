# Testing Architecture for Scalable Systems

## Executive Summary

This document outlines the comprehensive testing architecture for the Energy Performance Simulation Manager (EPSM), designed with scalability, maintainability, and reliability as core principles. The testing infrastructure supports continuous integration, rapid iteration, and confidence in system behavior across distributed components.

## Architectural Principles

### 1. Test Pyramid Architecture

The EPSM testing strategy implements a balanced test pyramid:

```
                    ┌─────────────────┐
                    │   E2E Tests     │  <-- 5% (Slow, High Value)
                    │   (User Flows)  │
                    └─────────────────┘
                 ┌──────────────────────┐
                 │  Integration Tests   │  <-- 25% (Medium Speed)
                 │  (API, Database, WS) │
                 └──────────────────────┘
            ┌───────────────────────────────┐
            │      Unit Tests               │  <-- 70% (Fast, Isolated)
            │  (Models, Views, Components)  │
            └───────────────────────────────┘
```

**Rationale**: This distribution ensures fast feedback (unit tests) while maintaining confidence in system integration (integration tests) and user experience (E2E tests).

### 2. Isolation & Independence

**Challenge**: Complex system with multiple services (Django backend, React frontend, PostgreSQL, Redis, EnergyPlus containers).

**Solution**:
- **Backend**: pytest-django with database transactions that auto-rollback
- **Frontend**: Vitest with jsdom for isolated component testing
- **Fixtures**: Shared fixtures in `conftest.py` provide clean state
- **Mocking**: External dependencies (EnergyPlus, file systems) are mocked

**Benefits**:
- Tests don't interfere with each other
- Can run in parallel (`pytest -n auto`)
- No "flaky" tests due to shared state
- CI/CD runs predictably

### 3. Fast Feedback Loop

**Performance Targets**:
- Unit tests: <1s each
- Integration tests: <10s each
- Full test suite: <5 minutes in CI

**Optimizations**:
- Parallel test execution (pytest-xdist, Vitest workers)
- Database reuse (`--reuse-db` flag)
- Lazy fixture loading
- Test result caching (pytest-testmon)
- Incremental testing (only run affected tests locally)

### 4. Comprehensive Coverage

**Coverage Targets**:
```
Critical Paths:  >90% (auth, simulation core, file handling)
Business Logic:  >85% (models, services, API endpoints)
UI Components:   >80% (React components, user interactions)
Utilities:       >80% (helpers, formatters, validators)
Overall:         >80%
```

**Coverage Tracking**:
- Backend: pytest-cov with branch coverage
- Frontend: @vitest/coverage-v8
- Reports: HTML, XML (for CI), terminal output
- CI integration: Codecov for trend analysis

## System Components & Testing Strategy

### Backend (Django/Python)

#### Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Views     │────▶│   Services   │────▶│   Models    │
│ (API Layer) │     │ (Business)   │     │ (Database)  │
└─────────────┘     └──────────────┘     └─────────────┘
      │                    │                     │
      ▼                    ▼                     ▼
  test_views.py      test_services.py      test_models.py
```

#### Test Layers

**1. Model Tests** (`test_models.py`)
- **What**: Django ORM models, field validation, relationships
- **How**: Direct model instantiation, database queries
- **Coverage**: 42 tests for Simulation, SimulationFile, SimulationResult, Material, Construction

Example:
```python
@pytest.mark.unit
@pytest.mark.models
def test_simulation_cascade_delete(sample_simulation):
    """Verify files deleted when simulation is deleted."""
    SimulationFile.objects.create(simulation=sample_simulation, ...)
    simulation_id = sample_simulation.id
    sample_simulation.delete()
    assert SimulationFile.objects.filter(simulation_id=simulation_id).count() == 0
```

**2. View Tests** (`test_views.py`)
- **What**: REST API endpoints, request/response handling, authentication
- **How**: APIClient with mock requests, fixtures for auth
- **Coverage**: 27 tests for parse_idf, CRUD, file uploads, errors

**3. Service Tests** (`test_services.py`)
- **What**: Business logic, EnergyPlus integration, file processing
- **How**: Mock external dependencies (Docker, file system), unit test algorithms

**4. Utility Tests** (`test_utils.py`)
- **What**: Helper functions, data processing, system monitoring
- **How**: Pure function testing with mocked external calls

#### Fixtures & Configuration

**conftest.py**: Shared fixtures
```python
@pytest.fixture
def test_user(db):
    """Standard test user."""
    return User.objects.create_user(...)

@pytest.fixture
def authenticated_client(api_client, test_user):
    """Authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client
```

**pytest.ini**: Configuration
- Test discovery patterns
- Coverage settings
- Test markers (unit, integration, slow, api, models)
- Parallel execution settings

### Frontend (React/TypeScript)

#### Architecture
```
┌──────────────┐     ┌────────────┐     ┌─────────────┐
│  Components  │────▶│   Hooks    │────▶│  API Client │
│ (UI Layer)   │     │  (State)   │     │  (Data)     │
└──────────────┘     └────────────┘     └─────────────┘
      │                    │                     │
      ▼                    ▼                     ▼
  *.test.tsx          *.test.ts            api.test.ts
```

#### Test Layers

**1. Component Tests**
- **What**: React component rendering, props, user interactions
- **How**: React Testing Library, user-event for interactions
- **Coverage**: Sample tests demonstrate 8 patterns

Example:
```typescript
it('should handle button clicks', async () => {
  const handleClick = vi.fn()
  const user = userEvent.setup()
  
  render(<Button onClick={handleClick}>Click</Button>)
  await user.click(screen.getByText('Click'))
  
  expect(handleClick).toHaveBeenCalledOnce()
})
```

**2. Hook Tests**
- **What**: Custom React hooks, state management
- **How**: renderHook from Testing Library

**3. Utility Tests**
- **What**: API helpers, formatters, validators
- **How**: Pure function testing

#### Configuration

**vitest.config.ts**:
- jsdom environment for DOM APIs
- Coverage thresholds (80% lines/functions/branches)
- Test file patterns
- Global setup file

**setup.ts**:
- Global mocks (window.matchMedia, IntersectionObserver, ResizeObserver)
- Canvas mocking for Chart.js
- Testing Library cleanup

## CI/CD Integration

### GitHub Actions Workflow

```yaml
┌──────────────────────────────────────────┐
│           Test Workflow                  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────┐  ┌────────────────┐ │
│  │ Backend Tests  │  │ Frontend Tests │ │
│  │  - Lint       │  │  - Lint        │ │
│  │  - Type Check │  │  - Type Check  │ │
│  │  - Unit Tests │  │  - Unit Tests  │ │
│  │  - Coverage   │  │  - Coverage    │ │
│  └────────────────┘  └────────────────┘ │
│           │                   │          │
│           └─────────┬─────────┘          │
│                     ▼                    │
│           ┌────────────────┐             │
│           │ Integration    │             │
│           │ Tests          │             │
│           └────────────────┘             │
│                     │                    │
│                     ▼                    │
│           ┌────────────────┐             │
│           │ Coverage       │             │
│           │ Reporting      │             │
│           └────────────────┘             │
└──────────────────────────────────────────┘
```

### Quality Gates

Tests must pass before:
- ✅ Merging pull requests
- ✅ Deploying to staging
- ✅ Deploying to production
- ✅ Creating releases

**Enforcement**:
- GitHub branch protection rules
- Required status checks
- Minimum coverage thresholds

## Scalability Considerations

### 1. Parallel Execution

**Backend**:
```bash
pytest -n auto  # Use all CPU cores
```

**Frontend**:
```bash
vitest --threads  # Worker threads per core
```

**Impact**: Test suite scales with available hardware, maintaining fast feedback even as test count grows.

### 2. Test Sharding (Future)

For very large test suites, implement sharding:
```yaml
# CI matrix strategy
strategy:
  matrix:
    shard: [1, 2, 3, 4]
run: pytest --shard-id=${{ matrix.shard }}
```

### 3. Incremental Testing

**Local Development**:
```bash
pytest --testmon  # Only run tests affected by changes
vitest --watch    # Only re-run affected tests
```

**Benefits**:
- Developers get immediate feedback
- No need to run full suite for small changes
- Productivity increased

### 4. Test Data Management

**Challenge**: Large datasets for simulations, materials database

**Solutions**:
- Factories (factory-boy, model-bakery) generate data on-demand
- Minimal fixtures - only what's needed for each test
- Database snapshots for integration tests
- Mock data for large result sets

### 5. Flakiness Prevention

**Strategies**:
- ❌ No `time.sleep()` - use `waitFor()` instead
- ❌ No hardcoded IDs - use factories
- ❌ No shared state - use fixtures
- ✅ Explicit waits with timeouts
- ✅ Retry logic only for genuine flakiness (network)
- ✅ Clear mocking of non-deterministic behavior

## Maintenance & Evolution

### Adding New Tests

**1. Backend Model**:
```python
# simulation/test_models.py
@pytest.mark.unit
@pytest.mark.models
class TestNewModel:
    def test_creation(self, db):
        obj = NewModel.objects.create(...)
        assert obj.field == expected
```

**2. Frontend Component**:
```typescript
// components/NewComponent.test.tsx
describe('NewComponent', () => {
  it('should render', () => {
    render(<NewComponent />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })
})
```

### Test Maintenance

**Indicators of Poor Test Quality**:
- ⚠️ Test takes >10s (needs optimization or is integration test)
- ⚠️ Test fails intermittently (flakiness - fix immediately)
- ⚠️ Test tests implementation details (brittle - refactor)
- ⚠️ Test requires extensive setup (too coupled - simplify)

**Refactoring Strategy**:
1. Identify slow or flaky tests
2. Add markers (`@pytest.mark.slow`)
3. Profile test execution
4. Optimize or move to integration suite
5. Remove or consolidate redundant tests

## Monitoring & Metrics

### Key Metrics

**Coverage Trends**:
- Overall coverage %
- Coverage by module
- New code coverage (PR diff)
- Uncovered critical paths

**Performance Metrics**:
- Test execution time (overall)
- Test execution time (per suite)
- Slowest tests (p95, p99)
- Flaky test rate

**CI/CD Metrics**:
- Build success rate
- Time to feedback (commit to results)
- Test failure rate
- Deployment frequency

### Reporting

**Tools**:
- Codecov for coverage tracking
- GitHub Actions for CI metrics
- pytest-html for detailed reports
- Vitest UI for interactive exploration

## Security Testing

### Current Coverage

**Authentication**:
- Login/logout flows
- Permission checks
- Session management

**Input Validation**:
- File upload validation (size, type)
- API parameter validation
- SQL injection prevention (ORM)

**Future Enhancements**:
- Dependency vulnerability scanning (safety, npm audit)
- Static security analysis (bandit, eslint-plugin-security)
- Dynamic security testing (OWASP ZAP)
- Secrets scanning (git-secrets)

## Documentation & Knowledge Sharing

### Test Documentation

**Inline Documentation**:
```python
def test_complex_scenario(fixtures):
    """
    Test the complete simulation workflow.
    
    Given: A user with uploaded IDF files
    When: Running a parametric simulation
    Then: Results should be stored and accessible
    """
```

**README Files**:
- `TESTING.md` - Comprehensive guide
- `TESTING_README.md` - Quick start
- Module-specific READMEs

**Examples**:
- Sample test files demonstrate patterns
- Real-world test scenarios included
- Common pitfalls documented

## Conclusion

The EPSM testing architecture is designed for **scalability**, **maintainability**, and **reliability**:

✅ **Scalable**: Parallel execution, sharding, incremental testing  
✅ **Fast**: Unit tests <1s, full suite <5min  
✅ **Comprehensive**: >80% coverage, all layers tested  
✅ **Reliable**: No flaky tests, isolated, repeatable  
✅ **Maintainable**: Clear structure, documented patterns  
✅ **Automated**: CI/CD integration, quality gates  
✅ **Observable**: Coverage reports, metrics, trends  

This infrastructure supports the EPSM application's growth from a research prototype to a production system serving building energy analysis at scale.

## References

- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
