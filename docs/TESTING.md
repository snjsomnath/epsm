# Testing Guide for EPSM

## Overview

This document provides comprehensive guidelines for testing the Energy Performance Simulation Manager (EPSM) application. The testing infrastructure is designed for scalability, maintainability, and comprehensive coverage.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)

## Testing Philosophy

### Test Pyramid

We follow the test pyramid approach:

```
        /\
       /  \     E2E Tests (Few)
      /    \
     /------\   Integration Tests (Some)
    /        \
   /----------\ Unit Tests (Many)
```

- **Unit Tests (70%)**: Test individual functions, classes, and components in isolation
- **Integration Tests (25%)**: Test interactions between modules and services
- **E2E Tests (5%)**: Test complete user workflows

### Key Principles

1. **Fast Feedback**: Tests should run quickly to provide rapid feedback
2. **Isolation**: Tests should be independent and not rely on external state
3. **Repeatability**: Tests should produce consistent results
4. **Clarity**: Tests should be easy to understand and maintain
5. **Coverage**: Aim for >80% code coverage for critical paths

## Backend Testing

### Technology Stack

- **Framework**: pytest + pytest-django
- **Coverage**: pytest-cov
- **Fixtures**: factory-boy, model-bakery
- **Mocking**: pytest-mock
- **Async**: pytest-asyncio

### Test Structure

```
backend/
├── conftest.py                 # Shared fixtures and configuration
├── pytest.ini                  # Pytest configuration
├── requirements-test.txt       # Test dependencies
├── simulation/
│   ├── test_models.py         # Model tests
│   ├── test_views.py          # API endpoint tests
│   ├── test_services.py       # Service layer tests
│   └── test_utils.py          # Utility function tests
└── database/
    ├── test_models.py         # Database model tests
    └── test_views.py          # Database API tests
```

### Running Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run with coverage
pytest --cov --cov-report=html

# Run specific test file
pytest simulation/test_models.py

# Run specific test class
pytest simulation/test_models.py::TestSimulationModel

# Run specific test
pytest simulation/test_models.py::TestSimulationModel::test_simulation_creation

# Run tests in parallel
pytest -n auto

# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run and stop on first failure
pytest -x

# Verbose output
pytest -v
```

### Test Markers

Use pytest markers to categorize tests:

```python
@pytest.mark.unit          # Fast, isolated unit tests
@pytest.mark.integration   # Tests requiring database/services
@pytest.mark.slow          # Slow-running tests
@pytest.mark.api           # API endpoint tests
@pytest.mark.models        # Model tests
@pytest.mark.views         # View tests
@pytest.mark.services      # Service layer tests
```

### Example Backend Test

```python
import pytest
from simulation.models import Simulation

@pytest.mark.unit
@pytest.mark.models
class TestSimulationModel:
    """Test suite for Simulation model."""

    def test_simulation_creation(self, test_user):
        """Test basic simulation creation."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Test Simulation",
            status="pending"
        )
        
        assert simulation.name == "Test Simulation"
        assert simulation.status == "pending"
        assert simulation.progress == 0
```

## Frontend Testing

### Technology Stack

- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Mocking**: vi (Vitest mocks)
- **Coverage**: @vitest/coverage-v8
- **User Simulation**: @testing-library/user-event

### Test Structure

```
frontend/
├── vitest.config.ts           # Vitest configuration
├── src/
│   ├── test/
│   │   └── setup.ts          # Test setup and global mocks
│   ├── utils/
│   │   └── api.test.ts       # Utility tests
│   ├── components/
│   │   └── Button.test.tsx   # Component tests
│   └── hooks/
│       └── useAuth.test.ts   # Custom hook tests
```

### Running Frontend Tests

```bash
# Run all tests
cd frontend
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test api.test.ts

# Watch mode
npm test -- --watch

# Run tests matching pattern
npm test -- --grep "API"
```

### Example Frontend Test

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('should render button text', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByText('Click Me')).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    
    await userEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

## Running Tests

### Local Development

```bash
# Run all tests (backend + frontend)
./scripts/test.sh

# Backend only
cd backend && pytest

# Frontend only
cd frontend && npm test
```

### Docker Environment

```bash
# Start test environment
docker-compose up -d database redis

# Run backend tests in container
docker-compose exec backend pytest

# Run frontend tests in container
docker-compose exec frontend npm test
```

### CI/CD

Tests run automatically on:
- Every push to main/develop branches
- Every pull request
- Manual workflow dispatch

See `.github/workflows/tests.yml` for CI configuration.

## Writing Tests

### Test Naming Conventions

- Test files: `test_*.py` (backend) or `*.test.ts[x]` (frontend)
- Test classes: `Test<FeatureName>` (e.g., `TestSimulationModel`)
- Test functions: `test_<what_it_tests>` (e.g., `test_simulation_creation`)

### Test Structure (AAA Pattern)

```python
def test_example():
    # Arrange: Set up test data and conditions
    user = create_user()
    
    # Act: Execute the code being tested
    result = perform_action(user)
    
    # Assert: Verify the outcome
    assert result == expected_value
```

### Using Fixtures

Backend (pytest):
```python
@pytest.fixture
def sample_simulation(test_user):
    """Create a sample simulation for testing."""
    return Simulation.objects.create(
        user=test_user,
        name="Test Simulation",
        status="pending"
    )

def test_with_fixture(sample_simulation):
    assert sample_simulation.status == "pending"
```

Frontend (Vitest):
```typescript
import { beforeEach, afterEach } from 'vitest'

let mockData: any

beforeEach(() => {
  mockData = { id: 1, name: 'Test' }
})

afterEach(() => {
  mockData = null
})
```

### Mocking

Backend:
```python
from unittest.mock import Mock, patch

@patch('simulation.services.EnergyPlusSimulator')
def test_with_mock(mock_simulator):
    mock_simulator.return_value.run.return_value = {'status': 'success'}
    # Test code using mock
```

Frontend:
```typescript
import { vi } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' })
})
```

## Coverage Requirements

### Target Coverage

- **Overall**: >80%
- **Critical Paths**: >90%
- **New Code**: >85%

### Viewing Coverage Reports

Backend:
```bash
cd backend
pytest --cov --cov-report=html
open htmlcov/index.html
```

Frontend:
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

### Coverage Configuration

Backend (`pytest.ini`):
```ini
[coverage:report]
precision = 2
show_missing = True
skip_covered = False
```

Frontend (`vitest.config.ts`):
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  lines: 80,
  functions: 80,
  branches: 80,
  statements: 80,
}
```

## CI/CD Integration

### GitHub Actions Workflow

The test workflow (`.github/workflows/tests.yml`) runs:

1. **Backend Tests**
   - Lint checks (flake8, black, isort)
   - Unit tests
   - Integration tests
   - Coverage report

2. **Frontend Tests**
   - Lint checks (eslint)
   - Type checking (TypeScript)
   - Unit tests
   - Coverage report

3. **Integration Tests**
   - Docker compose services
   - E2E scenarios

### Quality Gates

Tests must pass before:
- Merging pull requests
- Deploying to production
- Creating releases

## Best Practices

### DO's

✅ Write tests before or alongside code (TDD/BDD)
✅ Keep tests simple and focused
✅ Use descriptive test names
✅ Test edge cases and error conditions
✅ Mock external dependencies
✅ Use fixtures for common test data
✅ Run tests frequently during development
✅ Maintain test code quality

### DON'Ts

❌ Don't test framework code
❌ Don't create brittle tests (tight coupling)
❌ Don't test implementation details
❌ Don't ignore failing tests
❌ Don't skip writing tests for "simple" code
❌ Don't commit commented-out tests

### Testing Checklist

Before committing code:
- [ ] All tests pass locally
- [ ] New code has tests
- [ ] Coverage meets thresholds
- [ ] Tests are documented
- [ ] No test warnings or deprecations
- [ ] Linting passes

### Common Patterns

**Testing Models:**
```python
def test_model_creation(self, db):
    obj = MyModel.objects.create(name="Test")
    assert obj.pk is not None
    assert obj.name == "Test"
```

**Testing API Endpoints:**
```python
def test_api_endpoint(self, authenticated_client):
    response = authenticated_client.get('/api/endpoint/')
    assert response.status_code == 200
    assert 'data' in response.json()
```

**Testing React Components:**
```typescript
it('should render component', () => {
  render(<MyComponent />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

**Testing Async Code:**
```typescript
it('should handle async operations', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

## Troubleshooting

### Common Issues

**Backend:**
- Database connection errors: Ensure PostgreSQL is running
- Import errors: Check PYTHONPATH and installed dependencies
- Fixture not found: Verify fixture is in conftest.py

**Frontend:**
- Module not found: Run `npm install`
- Mock not working: Check import paths and mock setup
- Component not rendering: Verify test setup and React version

### Getting Help

- Check test output and error messages
- Review existing tests for patterns
- Consult the testing framework documentation:
  - [pytest](https://docs.pytest.org/)
  - [Vitest](https://vitest.dev/)
  - [React Testing Library](https://testing-library.com/react)

## Contributing

When contributing tests:
1. Follow the existing test structure
2. Use appropriate markers
3. Add docstrings to test classes
4. Update this guide if adding new patterns
5. Ensure all tests pass before submitting PR

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Django Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
