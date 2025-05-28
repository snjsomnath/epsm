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
    
    # Check EnergyPlus installation
    try:
        energyplus_exists = hasattr(settings, 'ENERGYPLUS_EXE') and os.path.exists(settings.ENERGYPLUS_EXE)
        
        # Try to get EnergyPlus version by running the executable with -v flag
        energyplus_version = "Unknown"
        if energyplus_exists:
            try:
                import subprocess
                result = subprocess.run([settings.ENERGYPLUS_EXE, '-v'], 
                                       capture_output=True, text=True, timeout=2)
                if result.stdout:
                    # Parse version from output (typically "EnergyPlus, Version X.Y.Z")
                    version_text = result.stdout.strip()
                    if "Version" in version_text:
                        energyplus_version = version_text.split("Version")[1].strip().split()[0]
            except (subprocess.SubprocessError, Exception) as e:
                energyplus_version = "Error detecting version"
        
        system_info['energyplus'] = {
            'exists': energyplus_exists,
            'version': energyplus_version,
            'path': settings.ENERGYPLUS_EXE if hasattr(settings, 'ENERGYPLUS_EXE') else "Not configured"
        }
    except Exception as e:
        system_info['energyplus'] = {
            'exists': False,
            'version': "Unknown",
            'error': str(e)
        }
    
    # Add platform information
    system_info['platform'] = {
        'system': platform.system(),
        'release': platform.release(),
        'python': platform.python_version()
    }
    
    return system_info
