"""
Unit tests for Simulation models.

Tests for:
- Simulation model creation, validation, and behavior
- SimulationFile model and relationships
- SimulationResult model and data integrity
"""

import pytest
import uuid
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.models import User

from simulation.models import Simulation, SimulationFile, SimulationResult


# ============================================================================
# Simulation Model Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.models
class TestSimulationModel:
    """Test suite for Simulation model."""

    def test_simulation_creation(self, test_user):
        """Test basic simulation creation."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Test Simulation",
            description="Test description",
            status="pending"
        )
        
        assert simulation.id is not None
        assert isinstance(simulation.id, uuid.UUID)
        assert simulation.name == "Test Simulation"
        assert simulation.description == "Test description"
        assert simulation.status == "pending"
        assert simulation.user == test_user
        assert simulation.progress == 0
        assert simulation.file_count == 0

    def test_simulation_status_choices(self, test_user):
        """Test that simulation status follows defined choices."""
        valid_statuses = ['pending', 'running', 'completed', 'failed']
        
        for status in valid_statuses:
            simulation = Simulation.objects.create(
                user=test_user,
                name=f"Test {status}",
                status=status
            )
            assert simulation.status == status

    def test_simulation_default_values(self, test_user):
        """Test default values are set correctly."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Default Test"
        )
        
        assert simulation.status == "pending"
        assert simulation.progress == 0
        assert simulation.file_count == 0
        assert simulation.description is None or simulation.description == ""
        assert simulation.error_message is None or simulation.error_message == ""

    def test_simulation_timestamps(self, test_user):
        """Test that timestamps are set automatically."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Timestamp Test"
        )
        
        assert simulation.created_at is not None
        assert simulation.updated_at is not None
        assert simulation.start_time is not None
        
        # Check that created_at is recent
        now = timezone.now()
        assert (now - simulation.created_at) < timedelta(seconds=5)

    def test_simulation_str_representation(self, test_user):
        """Test string representation of simulation."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Test Sim",
            status="running"
        )
        
        expected = "Test Sim - running"
        assert str(simulation) == expected

    def test_simulation_update(self, sample_simulation):
        """Test updating simulation fields."""
        original_updated_at = sample_simulation.updated_at
        
        # Update simulation
        sample_simulation.status = "running"
        sample_simulation.progress = 50
        sample_simulation.save()
        
        # Refresh from database
        sample_simulation.refresh_from_db()
        
        assert sample_simulation.status == "running"
        assert sample_simulation.progress == 50
        assert sample_simulation.updated_at > original_updated_at

    def test_simulation_without_user(self):
        """Test creating simulation without user (should be allowed)."""
        simulation = Simulation.objects.create(
            name="No User Simulation",
            description="Test without user"
        )
        
        assert simulation.user is None
        assert simulation.id is not None

    def test_simulation_celery_task_id(self, test_user):
        """Test celery task ID tracking."""
        task_id = "test-celery-task-123"
        simulation = Simulation.objects.create(
            user=test_user,
            name="Celery Test",
            celery_task_id=task_id
        )
        
        assert simulation.celery_task_id == task_id
        
        # Test querying by task ID
        found = Simulation.objects.filter(celery_task_id=task_id).first()
        assert found == simulation

    def test_simulation_progress_bounds(self, test_user):
        """Test progress field accepts valid range."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Progress Test",
            progress=0
        )
        
        # Test boundary values
        for progress_value in [0, 50, 100]:
            simulation.progress = progress_value
            simulation.save()
            simulation.refresh_from_db()
            assert simulation.progress == progress_value

    def test_simulation_error_message(self, test_user):
        """Test error message storage."""
        error_msg = "Test error: Simulation failed due to invalid input"
        simulation = Simulation.objects.create(
            user=test_user,
            name="Error Test",
            status="failed",
            error_message=error_msg
        )
        
        assert simulation.error_message == error_msg


# ============================================================================
# SimulationFile Model Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.models
class TestSimulationFileModel:
    """Test suite for SimulationFile model."""

    def test_simulation_file_creation(self, sample_simulation):
        """Test creating a simulation file."""
        sim_file = SimulationFile.objects.create(
            simulation=sample_simulation,
            file_type="idf",
            file_name="test.idf",
            file_path="/media/test.idf",
            original_name="original_test.idf"
        )
        
        assert sim_file.id is not None
        assert isinstance(sim_file.id, uuid.UUID)
        assert sim_file.simulation == sample_simulation
        assert sim_file.file_type == "idf"
        assert sim_file.file_name == "test.idf"

    def test_simulation_file_types(self, sample_simulation):
        """Test different file types."""
        file_types = ['idf', 'epw', 'output', 'report']
        
        for ftype in file_types:
            sim_file = SimulationFile.objects.create(
                simulation=sample_simulation,
                file_type=ftype,
                file_name=f"test.{ftype}",
                file_path=f"/media/test.{ftype}"
            )
            assert sim_file.file_type == ftype

    def test_simulation_file_relationship(self, sample_simulation):
        """Test relationship between simulation and files."""
        # Create multiple files
        for i in range(3):
            SimulationFile.objects.create(
                simulation=sample_simulation,
                file_type="idf",
                file_name=f"test_{i}.idf",
                file_path=f"/media/test_{i}.idf"
            )
        
        # Test reverse relationship
        files = sample_simulation.files.all()
        assert files.count() == 3

    def test_simulation_file_cascade_delete(self, sample_simulation):
        """Test that files are deleted when simulation is deleted."""
        # Create files
        SimulationFile.objects.create(
            simulation=sample_simulation,
            file_type="idf",
            file_name="test.idf",
            file_path="/media/test.idf"
        )
        
        file_count = SimulationFile.objects.filter(
            simulation=sample_simulation
        ).count()
        assert file_count == 1
        
        # Delete simulation
        simulation_id = sample_simulation.id
        sample_simulation.delete()
        
        # Check files are deleted
        file_count = SimulationFile.objects.filter(
            simulation_id=simulation_id
        ).count()
        assert file_count == 0

    def test_simulation_file_str_representation(self, sample_simulation):
        """Test string representation of simulation file."""
        sim_file = SimulationFile.objects.create(
            simulation=sample_simulation,
            file_type="idf",
            file_name="test.idf",
            file_path="/media/test.idf"
        )
        
        expected = f"idf file for {sample_simulation.name}"
        assert str(sim_file) == expected

    def test_simulation_file_size(self, sample_simulation):
        """Test file size tracking."""
        file_size = 1024 * 1024  # 1MB
        sim_file = SimulationFile.objects.create(
            simulation=sample_simulation,
            file_type="idf",
            file_name="test.idf",
            file_path="/media/test.idf",
            file_size=file_size
        )
        
        assert sim_file.file_size == file_size


# ============================================================================
# SimulationResult Model Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.models
class TestSimulationResultModel:
    """Test suite for SimulationResult model."""

    def test_simulation_result_creation(self, sample_simulation, test_user):
        """Test creating a simulation result."""
        result = SimulationResult.objects.create(
            simulation_id=sample_simulation.id,
            user_id=test_user.id,
            run_id="test_run_001",
            file_name="test.idf",
            building_name="Test Building",
            total_energy_use=150.5,
            heating_demand=80.0,
            cooling_demand=30.0,
            total_area=1000.0,
            status="success"
        )
        
        assert result.simulation_id == sample_simulation.id
        assert result.user_id == test_user.id
        assert result.run_id == "test_run_001"
        assert result.total_energy_use == 150.5
        assert result.heating_demand == 80.0

    def test_simulation_result_energy_metrics(self):
        """Test all energy metrics can be stored."""
        result = SimulationResult.objects.create(
            run_id="energy_test",
            file_name="test.idf",
            total_energy_use=200.0,
            heating_demand=100.0,
            cooling_demand=50.0,
            lighting_demand=30.0,
            equipment_demand=20.0
        )
        
        assert result.total_energy_use == 200.0
        assert result.heating_demand == 100.0
        assert result.cooling_demand == 50.0
        assert result.lighting_demand == 30.0
        assert result.equipment_demand == 20.0

    def test_simulation_result_environmental_metrics(self):
        """Test environmental and cost metrics."""
        result = SimulationResult.objects.create(
            run_id="env_test",
            file_name="test.idf",
            gwp_total=5000.0,  # kg CO2e
            cost_total=250000.0  # SEK
        )
        
        assert result.gwp_total == 5000.0
        assert result.cost_total == 250000.0

    def test_simulation_result_json_data(self):
        """Test storing raw JSON data."""
        json_data = {
            "energy": {"heating": 100, "cooling": 50},
            "zones": ["Zone1", "Zone2"],
            "metadata": {"version": "9.6"}
        }
        
        result = SimulationResult.objects.create(
            run_id="json_test",
            file_name="test.idf",
            raw_json=json_data
        )
        
        assert result.raw_json == json_data
        assert result.raw_json["energy"]["heating"] == 100

    def test_simulation_result_variant_tracking(self):
        """Test variant tracking for parametric studies."""
        result = SimulationResult.objects.create(
            run_id="variant_test",
            file_name="test.idf",
            variant_idx=5,
            idf_idx=2,
            construction_set_data={"wall": "Type1", "roof": "Type2"}
        )
        
        assert result.variant_idx == 5
        assert result.idf_idx == 2
        assert result.construction_set_data["wall"] == "Type1"

    def test_simulation_result_status_and_errors(self):
        """Test status tracking and error messages."""
        error_result = SimulationResult.objects.create(
            run_id="error_test",
            file_name="failed.idf",
            status="failed",
            error_message="EnergyPlus crashed: Invalid geometry"
        )
        
        assert error_result.status == "failed"
        assert "Invalid geometry" in error_result.error_message

    def test_simulation_result_query_by_simulation_id(self, sample_simulation):
        """Test querying results by simulation ID."""
        # Create multiple results
        for i in range(3):
            SimulationResult.objects.create(
                simulation_id=sample_simulation.id,
                run_id=f"run_{i}",
                file_name=f"test_{i}.idf"
            )
        
        # Query results
        results = SimulationResult.objects.filter(
            simulation_id=sample_simulation.id
        )
        assert results.count() == 3

    def test_simulation_result_timestamp(self):
        """Test automatic timestamp creation."""
        result = SimulationResult.objects.create(
            run_id="timestamp_test",
            file_name="test.idf"
        )
        
        assert result.created_at is not None
        now = timezone.now()
        assert (now - result.created_at) < timedelta(seconds=5)

    def test_simulation_result_nullable_fields(self):
        """Test that optional fields can be null."""
        result = SimulationResult.objects.create(
            run_id="minimal_test",
            file_name="test.idf"
        )
        
        # All energy metrics should be nullable
        assert result.total_energy_use is None
        assert result.heating_demand is None
        assert result.cooling_demand is None
        assert result.gwp_total is None
        assert result.cost_total is None
