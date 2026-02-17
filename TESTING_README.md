# Testing Infrastructure

This directory contains the comprehensive testing infrastructure for the EPSM application.

## Quick Start

### Backend Tests

```bash
# Install test dependencies
cd backend
pip install -r requirements-test.txt

# Run all tests
pytest

# Run with coverage
pytest --cov --cov-report=html

# Run specific test suite
pytest simulation/test_models.py
pytest -m unit  # Run only unit tests
pytest -m integration  # Run only integration tests
```

### Frontend Tests

```bash
# Install test dependencies
cd frontend
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch
```

### Run All Tests

```bash
# From project root
./scripts/test.sh
```

## Test Organization

### Backend Structure

```
backend/
├── conftest.py                    # Shared fixtures and configuration
├── pytest.ini                     # Pytest configuration
├── requirements-test.txt          # Test dependencies
├── .coveragerc                    # Coverage configuration
└── simulation/
    ├── test_models.py            # Model tests
    ├── test_views.py             # View/API tests
    ├── test_services.py          # Service layer tests
    └── test_utils.py             # Utility tests
```

### Frontend Structure

```
frontend/
├── vitest.config.ts              # Vitest configuration
├── src/
│   ├── test/
│   │   └── setup.ts             # Global test setup
│   ├── utils/
│   │   └── api.test.ts          # Utility tests
│   └── components/
│       └── __tests__/            # Component tests
│           └── sample.test.tsx   # Sample component tests
```

## Coverage Goals

- **Overall**: >80%
- **Critical Paths**: >90%
- **New Code**: >85%

## Test Types

### Unit Tests
Fast, isolated tests for individual functions and components.

```python
@pytest.mark.unit
def test_simulation_creation(test_user):
    simulation = Simulation.objects.create(
        user=test_user,
        name="Test"
    )
    assert simulation.name == "Test"
```

### Integration Tests
Tests for interactions between modules and services.

```python
@pytest.mark.integration
def test_simulation_workflow(authenticated_client):
    response = authenticated_client.post('/api/simulations/', data)
    assert response.status_code == 201
```

### Component Tests
Tests for React components.

```typescript
it('should render button', () => {
  render(<Button>Click</Button>)
  expect(screen.getByText('Click')).toBeInTheDocument()
})
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Manual workflow dispatch

See `.github/workflows/tests.yml` for configuration.

## Documentation

For comprehensive testing guidelines, see:
- [Testing Guide](../docs/TESTING.md) - Complete testing documentation
- [Contributing Guide](../CONTRIBUTING.md) - Contribution guidelines

## Resources

- [pytest](https://docs.pytest.org/)
- [pytest-django](https://pytest-django.readthedocs.io/)
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
