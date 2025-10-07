"""
Base settings - imports from main settings.py
This allows sharing common settings between development and production
"""
import sys
import os
from pathlib import Path

# Import all settings from the original settings.py
# We'll keep settings.py as the base configuration
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from settings import *
