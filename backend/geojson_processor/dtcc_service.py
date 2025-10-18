"""
DTCC Service - Downloads building footprints and pointcloud data for a given area.

Uses the DTCC (Digital Twin Cities Centre) library to fetch building data.
"""

import logging
import os
from pathlib import Path
from typing import Optional

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
                          epsg: int = 3006) -> tuple[Path, Optional[Path]]:
        """
        Download building footprints and pointcloud for the specified bounds.
        
        Args:
            west: Western boundary (longitude or projected coordinate)
            south: Southern boundary (latitude or projected coordinate)
            east: Eastern boundary (longitude or projected coordinate)
            north: Northern boundary (latitude or projected coordinate)
            epsg: EPSG code for coordinate system (default: 3006 for SWEREF99 TM)
            
        Returns:
            Tuple of (geojson_path, terrain_stl_path)
            terrain_stl_path may be None if terrain export fails
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
            
            # Export terrain mesh to STL for 3D visualization
            terrain_stl_path = self.work_dir / 'terrain.stl'
            logger.info(f"Exporting terrain mesh to STL: {terrain_stl_path}")
            
            try:
                # Export terrain mesh using DTCC's terrain.mesh.save() method
                if hasattr(city, 'terrain') and city.terrain is not None:
                    if hasattr(city.terrain, 'mesh') and city.terrain.mesh is not None:
                        city.terrain.mesh.save(str(terrain_stl_path))
                        logger.info(f"Successfully exported terrain mesh to {terrain_stl_path}")
                    else:
                        logger.warning("No terrain mesh available in city.terrain.mesh")
                        terrain_stl_path = None
                else:
                    logger.warning("No terrain object available in city")
                    terrain_stl_path = None
            except Exception as e:
                logger.warning(f"Failed to export terrain mesh: {e}")
                import traceback
                logger.debug(traceback.format_exc())
                terrain_stl_path = None
            
            # Export to GeoJSON
            geojson_path = self.work_dir / 'city.geojson'
            logger.info(f"Exporting to GeoJSON: {geojson_path}")
            
            # Save building footprints to GeoJSON format
            # Use dtcc_core.io.save_footprints which automatically detects format from extension
            from dtcc_core.io import save_footprints
            save_footprints(city, str(geojson_path))
            
            logger.info(f"Successfully downloaded city data to {geojson_path}")
            return geojson_path, terrain_stl_path
            
        except ImportError as e:
            logger.error(f"DTCC library not available: {e}")
            raise ImportError("dtcc library is required. Install with: pip install dtcc")
        except Exception as e:
            logger.error(f"Error downloading city data: {e}")
            import traceback
            logger.debug(traceback.format_exc())
            
            # Provide more specific error messages based on error type
            error_msg = str(e)
            if "Connection" in error_msg or "timeout" in error_msg.lower():
                raise ConnectionError(
                    "Unable to connect to DTCC service. The service may be temporarily unavailable. "
                    "Please try again later or contact support if the issue persists."
                )
            elif "NoneType" in error_msg:
                raise ValueError(
                    "Failed to process building data. The DTCC service may be down or "
                    "there may be no data available for this area."
                )
            else:
                raise Exception(f"Error downloading building data: {error_msg}")
