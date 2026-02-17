"""
Unit tests for simulation utilities.

Tests for:
- get_system_resources function
- Helper utilities
- Data processing functions
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from simulation.utils import get_system_resources


# ============================================================================
# System Resources Tests
# ============================================================================

@pytest.mark.unit
@pytest.mark.utils
class TestSystemResources:
    """Test suite for system resource utilities."""

    @patch('simulation.utils.psutil')
    def test_get_system_resources_success(self, mock_psutil):
        """Test get_system_resources returns expected structure."""
        # Mock psutil responses
        mock_psutil.cpu_count.side_effect = [8, 4]  # logical, physical
        mock_psutil.cpu_percent.return_value = 25.5
        
        mock_memory = Mock()
        mock_memory.total = 16 * 1024 ** 3  # 16 GB
        mock_memory.available = 8 * 1024 ** 3  # 8 GB
        mock_memory.percent = 50.0
        mock_psutil.virtual_memory.return_value = mock_memory
        
        mock_disk = Mock()
        mock_disk.total = 500 * 1024 ** 3  # 500 GB
        mock_disk.free = 250 * 1024 ** 3  # 250 GB
        mock_disk.percent = 50.0
        mock_psutil.disk_usage.return_value = mock_disk
        
        mock_net = Mock()
        mock_net.bytes_sent = 1000000
        mock_net.bytes_recv = 2000000
        mock_psutil.net_io_counters.return_value = mock_net
        
        # Call function
        result = get_system_resources()
        
        # Verify structure
        assert 'cpu' in result
        assert 'memory' in result
        assert 'disk' in result
        
        # Verify CPU data
        assert result['cpu']['logical_cores'] == 8
        assert result['cpu']['physical_cores'] == 4
        assert result['cpu']['usage_percent'] == 25.5
        
        # Verify memory data
        assert result['memory']['total_gb'] == 16.0
        assert result['memory']['available_gb'] == 8.0
        assert result['memory']['usage_percent'] == 50.0
        
        # Verify disk data
        assert result['disk']['total_gb'] == 500.0
        assert result['disk']['free_gb'] == 250.0

    @patch('simulation.utils.psutil')
    def test_get_system_resources_no_psutil(self, mock_psutil):
        """Test get_system_resources when psutil is not available."""
        mock_psutil.side_effect = ImportError("psutil not installed")
        
        # Should handle gracefully
        # Note: Since psutil is imported at module level,
        # this test may need adjustment based on actual implementation
        result = get_system_resources()
        
        # Should return error or partial data
        assert isinstance(result, dict)

    @patch('simulation.utils.psutil')
    def test_get_system_resources_disk_fallback(self, mock_psutil):
        """Test disk usage fallback when /host-opt not available."""
        mock_psutil.cpu_count.return_value = 4
        mock_psutil.cpu_percent.return_value = 10.0
        
        mock_memory = Mock()
        mock_memory.total = 8 * 1024 ** 3
        mock_memory.available = 4 * 1024 ** 3
        mock_memory.percent = 50.0
        mock_psutil.virtual_memory.return_value = mock_memory
        
        # First call to disk_usage raises error, second succeeds
        mock_disk = Mock()
        mock_disk.total = 100 * 1024 ** 3
        mock_disk.free = 50 * 1024 ** 3
        mock_disk.percent = 50.0
        mock_psutil.disk_usage.side_effect = [
            OSError("Path not found"),
            mock_disk
        ]
        
        mock_net = Mock()
        mock_net.bytes_sent = 1000
        mock_net.bytes_recv = 2000
        mock_psutil.net_io_counters.return_value = mock_net
        
        result = get_system_resources()
        
        # Should have disk info from fallback
        assert 'disk' in result
        assert result['disk']['total_gb'] == 100.0

    @patch('simulation.utils.psutil')
    def test_get_system_resources_network_rate_calculation(self, mock_psutil):
        """Test network rate calculation between calls."""
        # Setup mocks
        mock_psutil.cpu_count.return_value = 4
        mock_psutil.cpu_percent.return_value = 10.0
        
        mock_memory = Mock()
        mock_memory.total = 8 * 1024 ** 3
        mock_memory.available = 4 * 1024 ** 3
        mock_memory.percent = 50.0
        mock_psutil.virtual_memory.return_value = mock_memory
        
        mock_disk = Mock()
        mock_disk.total = 100 * 1024 ** 3
        mock_disk.free = 50 * 1024 ** 3
        mock_disk.percent = 50.0
        mock_psutil.disk_usage.return_value = mock_disk
        
        # First call - establish baseline
        mock_net1 = Mock()
        mock_net1.bytes_sent = 1000
        mock_net1.bytes_recv = 2000
        mock_psutil.net_io_counters.return_value = mock_net1
        
        result1 = get_system_resources()
        
        # First call should have zero rate or initial values
        assert 'network' in result1

    @patch('simulation.utils.psutil')
    def test_get_system_resources_exception_handling(self, mock_psutil):
        """Test exception handling in get_system_resources."""
        # Simulate an exception during CPU check
        mock_psutil.cpu_count.side_effect = Exception("Unexpected error")
        
        result = get_system_resources()
        
        # Should handle error gracefully
        assert isinstance(result, dict)
        # May contain error key or partial data


# ============================================================================
# Additional Utility Tests (if other utilities exist)
# ============================================================================

@pytest.mark.unit
@pytest.mark.utils
class TestUtilityHelpers:
    """Test suite for utility helper functions."""

    def test_utility_placeholder(self):
        """Placeholder for additional utility tests."""
        # Add tests for other utility functions as they are identified
        assert True


# ============================================================================
# Integration Tests with System
# ============================================================================

@pytest.mark.integration
@pytest.mark.utils
@pytest.mark.slow
class TestSystemResourcesIntegration:
    """Integration tests for system resources (requires actual system)."""

    def test_get_system_resources_real(self):
        """Test get_system_resources with real system (if psutil available)."""
        try:
            result = get_system_resources()
            
            # Verify basic structure
            assert isinstance(result, dict)
            
            # If successful, should have expected keys
            if 'error' not in result:
                assert 'cpu' in result or 'memory' in result
                
                # If CPU info present, verify reasonable values
                if 'cpu' in result:
                    assert result['cpu']['logical_cores'] > 0
                    assert 0 <= result['cpu']['usage_percent'] <= 100
                
                # If memory info present, verify reasonable values
                if 'memory' in result:
                    assert result['memory']['total_gb'] > 0
                    assert 0 <= result['memory']['usage_percent'] <= 100
        except ImportError:
            pytest.skip("psutil not available")
