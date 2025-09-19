import os
import platform
from django.conf import settings

def get_system_resources():
    """
    Get system resources information including CPU, memory, disk and EnergyPlus details.
    
    Returns:
        dict: A dictionary containing system resource information
    """
    system_info = {}
    
    try:
        # Try to import psutil - this should be installed in requirements.txt
        import psutil
        
        # Get CPU information
        system_info['cpu'] = {
            'logical_cores': psutil.cpu_count(logical=True) or 0,
            'physical_cores': psutil.cpu_count(logical=False) or 0,
            'usage_percent': psutil.cpu_percent(interval=0.1)
        }
        
        # Get memory information
        memory = psutil.virtual_memory()
        system_info['memory'] = {
            'total_gb': round(memory.total / (1024 ** 3), 2),
            'available_gb': round(memory.available / (1024 ** 3), 2),
            'usage_percent': memory.percent
        }
        
        # Get disk information
        disk = psutil.disk_usage('/')
        system_info['disk'] = {
            'total_gb': round(disk.total / (1024 ** 3), 2),
            'free_gb': round(disk.free / (1024 ** 3), 2),
            'usage_percent': disk.percent
        }
    except ImportError:
        system_info['error'] = "The psutil package is not installed. Install it with 'pip install psutil' for system resource monitoring."
    except Exception as e:
        system_info['error'] = f"Error fetching system resources: {str(e)}"
    
    # Check Docker and EnergyPlus container availability
    try:
        import subprocess
        
        # Check if Docker is available
        docker_available = False
        energyplus_info = {
            'docker_available': False,
            'container_image': 'nrel/energyplus:23.2.0',
            'status': 'Docker not available'
        }
        
        try:
            # Check Docker availability
            result = subprocess.run(['docker', '--version'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                docker_available = True
                
                # Check if EnergyPlus container image is available
                result = subprocess.run(['docker', 'images', 'nrel/energyplus:23.2.0', '--format', 'table {{.Repository}}:{{.Tag}}'], 
                                      capture_output=True, text=True, timeout=10)
                
                if 'nrel/energyplus:23.2.0' in result.stdout:
                    energyplus_info = {
                        'docker_available': True,
                        'container_image': 'nrel/energyplus:23.2.0',
                        'status': 'Container image available locally'
                    }
                else:
                    energyplus_info = {
                        'docker_available': True,
                        'container_image': 'nrel/energyplus:23.2.0',
                        'status': 'Container image will be pulled when needed'
                    }
                    
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError):
            energyplus_info = {
                'docker_available': False,
                'container_image': 'nrel/energyplus:23.2.0',
                'status': 'Docker not available or accessible'
            }

        system_info['energyplus'] = energyplus_info
        
    except Exception as e:
        system_info['energyplus'] = {
            'docker_available': False,
            'container_image': 'nrel/energyplus:23.2.0',
            'status': f'Error checking Docker: {str(e)}'
        }
    
    # Add platform information
    system_info['platform'] = {
        'system': platform.system(),
        'release': platform.release(),
        'python': platform.python_version()
    }
    
    return system_info
