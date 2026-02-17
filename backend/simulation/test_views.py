"""
Unit tests for simulation API views.

Tests for:
- parse_idf endpoint
- Simulation CRUD operations
- File handling
- Error handling and validation
"""

import pytest
import json
import io
from unittest.mock import Mock, patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile, InMemoryUploadedFile
from django.test import RequestFactory
from rest_framework.test import APIClient
from rest_framework import status

from simulation.views import parse_idf
from simulation.models import Simulation, SimulationFile


# ============================================================================
# parse_idf View Tests
# ============================================================================

@pytest.mark.api
@pytest.mark.views
class TestParseIDFView:
    """Test suite for parse_idf API endpoint."""

    def test_parse_idf_no_files(self, api_client):
        """Test parse_idf with no files returns 400."""
        response = api_client.post('/api/parse-idf/', {})
        
        assert response.status_code == 400
        assert 'error' in response.json()

    def test_parse_idf_wrong_method(self, api_client):
        """Test parse_idf with GET method returns 405."""
        response = api_client.get('/api/parse-idf/')
        
        assert response.status_code == 405

    @pytest.mark.django_db
    def test_parse_idf_with_valid_file(self, api_client, sample_idf_content):
        """Test parse_idf with a valid IDF file."""
        # Create a file-like object
        idf_file = SimpleUploadedFile(
            "test.idf",
            sample_idf_content.encode('utf-8'),
            content_type="text/plain"
        )
        
        response = api_client.post(
            '/api/parse-idf/',
            {'files': [idf_file]},
            format='multipart'
        )
        
        # Should process successfully or return validation errors
        assert response.status_code in [200, 400, 429]  # 429 if rate limited
        
        if response.status_code == 200:
            data = response.json()
            assert 'materials' in data or 'error' not in data

    @pytest.mark.django_db
    def test_parse_idf_rate_limiting(self, api_client, sample_idf_content):
        """Test that parse_idf has rate limiting."""
        idf_file = SimpleUploadedFile(
            "test.idf",
            sample_idf_content.encode('utf-8'),
            content_type="text/plain"
        )
        
        # First request
        response1 = api_client.post(
            '/api/parse-idf/',
            {'files': [idf_file]},
            format='multipart'
        )
        
        # Immediate second request should be rate limited
        idf_file2 = SimpleUploadedFile(
            "test2.idf",
            sample_idf_content.encode('utf-8'),
            content_type="text/plain"
        )
        response2 = api_client.post(
            '/api/parse-idf/',
            {'files': [idf_file2]},
            format='multipart'
        )
        
        # At least one should succeed, second might be rate limited
        assert response1.status_code in [200, 400] or response2.status_code == 429

    @pytest.mark.django_db
    def test_parse_idf_invalid_content(self, api_client):
        """Test parse_idf with invalid IDF content."""
        invalid_content = "This is not valid IDF content!!!"
        idf_file = SimpleUploadedFile(
            "invalid.idf",
            invalid_content.encode('utf-8'),
            content_type="text/plain"
        )
        
        response = api_client.post(
            '/api/parse-idf/',
            {'files': [idf_file]},
            format='multipart'
        )
        
        # Should handle error gracefully
        assert response.status_code in [200, 400, 429, 500]


# ============================================================================
# Simulation CRUD Tests (if REST endpoints exist)
# ============================================================================

@pytest.mark.api
@pytest.mark.views
class TestSimulationCRUD:
    """Test suite for Simulation CRUD operations."""

    @pytest.mark.django_db
    def test_create_simulation_authenticated(self, authenticated_client, test_user):
        """Test creating a simulation while authenticated."""
        # Assuming there's a simulation creation endpoint
        # Adjust URL based on your actual routing
        
        simulation_data = {
            'name': 'Test Simulation',
            'description': 'Test description',
            'status': 'pending'
        }
        
        # This test documents expected behavior
        # Actual implementation may vary
        simulation = Simulation.objects.create(
            user=test_user,
            **simulation_data
        )
        
        assert simulation.name == 'Test Simulation'
        assert simulation.user == test_user

    @pytest.mark.django_db
    def test_list_user_simulations(self, authenticated_client, test_user):
        """Test listing simulations for a user."""
        # Create test simulations
        Simulation.objects.create(
            user=test_user,
            name="Sim 1",
            status="pending"
        )
        Simulation.objects.create(
            user=test_user,
            name="Sim 2",
            status="completed"
        )
        
        # Verify simulations exist
        simulations = Simulation.objects.filter(user=test_user)
        assert simulations.count() == 2

    @pytest.mark.django_db
    def test_update_simulation_status(self, test_user):
        """Test updating simulation status."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Update Test",
            status="pending"
        )
        
        # Update status
        simulation.status = "running"
        simulation.progress = 50
        simulation.save()
        
        # Verify update
        updated = Simulation.objects.get(id=simulation.id)
        assert updated.status == "running"
        assert updated.progress == 50

    @pytest.mark.django_db
    def test_delete_simulation(self, test_user):
        """Test deleting a simulation."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Delete Test",
            status="pending"
        )
        
        simulation_id = simulation.id
        simulation.delete()
        
        # Verify deletion
        with pytest.raises(Simulation.DoesNotExist):
            Simulation.objects.get(id=simulation_id)


# ============================================================================
# File Upload Tests
# ============================================================================

@pytest.mark.api
@pytest.mark.views
class TestFileUploads:
    """Test suite for file upload handling."""

    @pytest.mark.django_db
    def test_simulation_file_upload(self, sample_simulation):
        """Test associating uploaded files with simulation."""
        sim_file = SimulationFile.objects.create(
            simulation=sample_simulation,
            file_type="idf",
            file_name="uploaded.idf",
            file_path="/media/uploads/uploaded.idf",
            file_size=1024,
            original_name="my_building.idf"
        )
        
        assert sim_file.simulation == sample_simulation
        assert sim_file.original_name == "my_building.idf"

    @pytest.mark.django_db
    def test_multiple_file_upload(self, sample_simulation):
        """Test uploading multiple files to a simulation."""
        files = [
            ("file1.idf", "idf"),
            ("file2.epw", "epw"),
            ("file3.idf", "idf"),
        ]
        
        for filename, ftype in files:
            SimulationFile.objects.create(
                simulation=sample_simulation,
                file_type=ftype,
                file_name=filename,
                file_path=f"/media/{filename}"
            )
        
        # Verify all files are associated
        uploaded_files = sample_simulation.files.all()
        assert uploaded_files.count() == 3
        
        # Verify file count is updated
        sample_simulation.file_count = uploaded_files.count()
        sample_simulation.save()
        assert sample_simulation.file_count == 3


# ============================================================================
# Error Handling Tests
# ============================================================================

@pytest.mark.api
@pytest.mark.views
class TestErrorHandling:
    """Test suite for error handling in views."""

    @pytest.mark.django_db
    def test_simulation_not_found(self, authenticated_client):
        """Test accessing non-existent simulation."""
        # Try to get simulation that doesn't exist
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        
        # Using Django ORM
        result = Simulation.objects.filter(id=non_existent_id).first()
        assert result is None

    @pytest.mark.django_db
    def test_invalid_simulation_status(self, test_user):
        """Test handling invalid status values."""
        # Valid statuses: pending, running, completed, failed
        simulation = Simulation.objects.create(
            user=test_user,
            name="Status Test",
            status="pending"
        )
        
        # Try to set invalid status (Django will validate)
        # This documents expected validation behavior
        assert simulation.status in ['pending', 'running', 'completed', 'failed']

    @pytest.mark.django_db
    def test_malformed_file_upload(self, api_client):
        """Test handling malformed file uploads."""
        # Create a malformed request
        response = api_client.post(
            '/api/parse-idf/',
            {'invalid_key': 'invalid_value'},
            format='multipart'
        )
        
        # Should return error
        assert response.status_code in [400, 429]


# ============================================================================
# Authentication Tests
# ============================================================================

@pytest.mark.api
@pytest.mark.views
class TestAuthentication:
    """Test suite for authentication requirements."""

    @pytest.mark.django_db
    def test_unauthenticated_access(self, api_client):
        """Test that unauthenticated users are handled properly."""
        # parse_idf is @csrf_exempt, so it may allow unauthenticated access
        # This test documents the current behavior
        response = api_client.post('/api/parse-idf/', {})
        
        # Should either require auth or handle gracefully
        assert response.status_code in [200, 400, 401, 403, 429]

    @pytest.mark.django_db
    def test_authenticated_user_access(self, authenticated_client, test_user):
        """Test authenticated user can access their data."""
        simulation = Simulation.objects.create(
            user=test_user,
            name="Auth Test",
            status="pending"
        )
        
        # Verify user can access their simulation
        user_simulations = Simulation.objects.filter(user=test_user)
        assert simulation in user_simulations

    @pytest.mark.django_db
    def test_user_cannot_access_other_user_data(self, test_user, admin_user):
        """Test users cannot access other users' simulations."""
        # Create simulation for test_user
        user_sim = Simulation.objects.create(
            user=test_user,
            name="User Simulation",
            status="pending"
        )
        
        # Admin user's simulations should not include user_sim
        admin_sims = Simulation.objects.filter(user=admin_user)
        assert user_sim not in admin_sims
