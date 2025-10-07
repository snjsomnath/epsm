"""
Settings package for EPSM
Import from the parent-level settings.py file by default
"""

import os
import sys
from pathlib import Path

# Determine which settings to load based on environment
# By default, load from the settings.py file in the parent directory

# Get the parent directory (config/)
parent_dir = Path(__file__).resolve().parent.parent

# Add to sys.path if not already there
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

# Import settings.py from parent directory by manipulating the import
# We need to temporarily remove the settings package from sys.modules
# to allow importing settings.py as a module

import importlib.util
settings_file = parent_dir / 'settings.py'

if settings_file.exists():
    spec = importlib.util.spec_from_file_location("_temp_settings", settings_file)
    settings_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(settings_module)
    
    # Copy all attributes from settings_module to this module
    for attr in dir(settings_module):
        if not attr.startswith('_'):
            globals()[attr] = getattr(settings_module, attr)
else:
    raise ImportError(f"Cannot find settings.py at {settings_file}")
