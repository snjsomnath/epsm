"""
Pytest configuration and shared fixtures for EPSM backend tests.

This conftest.py provides:
- Django setup and configuration
- Database fixtures and factories
- Common test utilities
- Authentication fixtures
"""

import os
import pytest
import tempfile
from pathlib import Path
from typing import Generator

# Set Django settings before importing Django modules
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from django.contrib.auth.models import User
from django.test import Client
from rest_framework.test import APIClient

from simulation.models import Simulation, SimulationFile, SimulationResult
from database.models import Material, Construction


# ============================================================================
# Django and Database Fixtures
# ============================================================================

@pytest.fixture(scope='session')
def django_db_setup(django_db_blocker):
    """Setup test database with optimizations."""
    with django_db_blocker.unblock():
        # Use faster password hasher for tests
        settings.PASSWORD_HASHERS = [
            'django.contrib.auth.hashers.MD5PasswordHasher',
        ]


@pytest.fixture
def db_access(db):
    """Marker fixture to enable database access in tests."""
    return db


# ============================================================================
# User and Authentication Fixtures
# ============================================================================

@pytest.fixture
def test_user(db) -> User:
    """Create a standard test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def admin_user(db) -> User:
    """Create an admin test user."""
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


@pytest.fixture
def api_client() -> APIClient:
    """Return a DRF API test client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client: APIClient, test_user: User) -> APIClient:
    """Return an authenticated API client."""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def admin_client(api_client: APIClient, admin_user: User) -> APIClient:
    """Return an admin-authenticated API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client


# ============================================================================
# Simulation Model Fixtures
# ============================================================================

@pytest.fixture
def sample_simulation(test_user: User) -> Simulation:
    """Create a sample simulation for testing."""
    return Simulation.objects.create(
        user=test_user,
        name="Test Simulation",
        description="A test simulation",
        status="pending"
    )


@pytest.fixture
def completed_simulation(test_user: User) -> Simulation:
    """Create a completed simulation for testing."""
    return Simulation.objects.create(
        user=test_user,
        name="Completed Simulation",
        description="A completed simulation",
        status="completed",
        progress=100
    )


@pytest.fixture
def sample_simulation_file(sample_simulation: Simulation) -> SimulationFile:
    """Create a sample simulation file."""
    return SimulationFile.objects.create(
        simulation=sample_simulation,
        file_type="idf",
        file_name="test.idf",
        file_path="/media/test.idf",
        original_name="test.idf"
    )


# ============================================================================
# Material and Construction Fixtures
# ============================================================================

@pytest.fixture
def sample_material(db) -> Material:
    """Create a sample material for testing."""
    return Material.objects.create(
        name="Test Material",
        material_type="opaque",
        thickness=0.1,
        conductivity=0.5,
        density=1000,
        specific_heat=1000
    )


@pytest.fixture
def sample_construction(sample_material: Material) -> Construction:
    """Create a sample construction for testing."""
    construction = Construction.objects.create(
        name="Test Construction",
        construction_type="wall"
    )
    # Note: You may need to add layers depending on your model structure
    return construction


# ============================================================================
# File Handling Fixtures
# ============================================================================

@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_idf_content() -> str:
    """Return sample IDF file content for testing."""
    return """
!-Generator IDFEditor 1.50
!-Option SortedOrder

!-NOTE: All comments with '!-' are ignored by the IDFEditor and are generated automatically.
!-      Use '!' comments if they need to be retained when using the IDFEditor.

Version,9.6;

Building,
  Test Building,           !- Name
  0,                       !- North Axis {deg}
  Suburbs,                 !- Terrain
  0.04,                    !- Loads Convergence Tolerance Value
  0.4,                     !- Temperature Convergence Tolerance Value {deltaC}
  FullInteriorAndExterior, !- Solar Distribution
  25,                      !- Maximum Number of Warmup Days
  6;                       !- Minimum Number of Warmup Days

GlobalGeometryRules,
  UpperLeftCorner,         !- Starting Vertex Position
  CounterClockWise,        !- Vertex Entry Direction
  Relative;                !- Coordinate System

Material,
  TestMaterial,            !- Name
  Rough,                   !- Roughness
  0.1,                     !- Thickness {m}
  0.5,                     !- Conductivity {W/m-K}
  1000,                    !- Density {kg/m3}
  1000;                    !- Specific Heat {J/kg-K}

Construction,
  TestConstruction,        !- Name
  TestMaterial;            !- Outside Layer
"""


@pytest.fixture
def sample_idf_file(temp_dir: Path, sample_idf_content: str) -> Path:
    """Create a sample IDF file for testing."""
    idf_file = temp_dir / "test.idf"
    idf_file.write_text(sample_idf_content)
    return idf_file


# ============================================================================
# Mock and Utility Fixtures
# ============================================================================

@pytest.fixture
def mock_energyplus_output(temp_dir: Path) -> Path:
    """Create mock EnergyPlus output files."""
    output_dir = temp_dir / "output"
    output_dir.mkdir(exist_ok=True)
    
    # Create mock output files
    (output_dir / "eplusout.sql").write_text("MOCK SQL DATA")
    (output_dir / "eplusout.err").write_text("MOCK ERROR LOG")
    (output_dir / "eplusout.csv").write_text("MOCK CSV DATA")
    
    return output_dir


@pytest.fixture(autouse=True)
def reset_sequences(db):
    """Reset database sequences after each test (optional)."""
    yield
    # Add sequence reset logic if needed


# ============================================================================
# Marker Helpers
# ============================================================================

def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow-running"
    )


# ============================================================================
# Test Performance Optimization
# ============================================================================

@pytest.fixture(scope='session')
def _django_db_helper():
    """Optimize database access for test session."""
    # Disable migrations for faster test database creation
    settings.MIGRATION_MODULES = {
        app.split('.')[-1]: None 
        for app in settings.INSTALLED_APPS 
        if app.startswith('simulation') or app.startswith('database')
    }
