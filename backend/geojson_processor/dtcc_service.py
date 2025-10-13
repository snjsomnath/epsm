"""
DTCC Service - Downloads building footprints and pointcloud data for a given area.

Uses the DTCC (Digital Twin Cities Centre) library to fetch building data.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class DTCCService:
    """Service for downloading building data using DTCC library."""
    
    def __init__(self, work_dir: str):
        """
        Initialize DTCC service.
        
        Args:
            work_dir: Working directory for storing downloaded data and output files
        """
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
    def download_city_data(self, west: float, south: float, east: float, north: float, 
                          epsg: int = 3006) -> Path:
        """
        Download building footprints and pointcloud for the specified bounds.
        
        Args:
            west: Western boundary (longitude or projected coordinate)
            south: Southern boundary (latitude or projected coordinate)
            east: Eastern boundary (longitude or projected coordinate)
            north: Northern boundary (latitude or projected coordinate)
            epsg: EPSG code for coordinate system (default: 3006 for SWEREF99 TM)
            
        Returns:
            Path to generated city.geojson file
        """
        try:
            from dtcc import City, Bounds
            
            logger.info(f"Downloading city data for bounds: W={west}, S={south}, E={east}, N={north} (EPSG:{epsg})")
            
            # Create bounds object
            bounds = Bounds(west, south, east, north)
            
            # Create city and set bounds
            city = City()
            city.bounds = bounds
            
            # Download footprints and pointcloud
            logger.info("Downloading building footprints...")
            city.download_footprints()
            
            logger.info("Downloading pointcloud data...")
            city.download_pointcloud()
            
            # Build terrain mesh
            logger.info("Building terrain mesh...")
            city.build_terrain(
                cell_size=2.0,
                build_mesh=True,
                max_triangle_size=5.0,
                smoothing=3,
            )
            
            # Build LOD1 buildings (simple box models)
            logger.info("Building LOD1 buildings...")
            city.build_lod1_buildings()
            
            # Export to GeoJSON
            geojson_path = self.work_dir / 'city.geojson'
            logger.info(f"Exporting to GeoJSON: {geojson_path}")
            
            # Save city to GeoJSON format
            city.to_geojson(str(geojson_path))
            
            logger.info(f"Successfully downloaded city data to {geojson_path}")
            return geojson_path
            
        except ImportError as e:
            logger.error(f"DTCC library not available: {e}")
            raise ImportError("dtcc library is required. Install with: pip install dtcc")
        except Exception as e:
            logger.error(f"Error downloading city data: {e}")
            raise
