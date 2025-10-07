"""
EPSM Version Information

This module provides version information for the EPSM backend.
The version is read from the VERSION file in the project root.
"""

import os
from pathlib import Path

# Get the project root directory (parent of backend directory)
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
VERSION_FILE = PROJECT_ROOT / 'VERSION'


def get_version():
    """Read version from VERSION file."""
    try:
        if VERSION_FILE.exists():
            with open(VERSION_FILE, 'r') as f:
                return f.read().strip()
        else:
            return '0.0.0-dev'
    except Exception:
        return '0.0.0-dev'


__version__ = get_version()
VERSION = __version__

# Additional version info
VERSION_INFO = {
    'version': __version__,
    'major': int(__version__.split('.')[0]) if '.' in __version__ else 0,
    'minor': int(__version__.split('.')[1]) if __version__.count('.') >= 1 else 0,
    'patch': int(__version__.split('.')[2].split('-')[0]) if __version__.count('.') >= 2 else 0,
}

# Application metadata
APP_NAME = 'Energy Performance Simulation Manager'
APP_ACRONYM = 'EPSM'
APP_DESCRIPTION = 'A containerized web application for managing building energy simulations using EnergyPlus'
APP_AUTHOR = 'Sanjay Somanath'
APP_AUTHOR_EMAIL = 'sanjay.somanath@chalmers.se'
APP_INSTITUTION = 'Chalmers University of Technology'
APP_LICENSE = 'MIT'
APP_URL = 'https://github.com/snjsomnath/epsm'
