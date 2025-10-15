"""
Views for GeoJSON Processor API
"""

import logging
import os
import shutil
import tempfile
import uuid
from pathlib import Path

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from pyproj import Transformer

from .dtcc_service import DTCCService
from .geojson_to_idf import GeoJSONToIDFConverter
from .model_3d_generator import Model3DGenerator

logger = logging.getLogger(__name__)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])  # Change to IsAuthenticated in production
def process_geojson(request):
    """
    Process a geographic area to generate IDF files.
    
    Expects JSON payload:
    {
        "bounds": {
            "north": float,
            "south": float,
            "east": float,
            "west": float
        },
        "simulation_bounds": {  // Optional - if provided, only buildings in this area are simulated
            "north": float,
            "south": float,
            "east": float,
            "west": float
        },
        "filter_height_min": float (optional, default: 3),
        "filter_height_max": float (optional, default: 100),
        "filter_area_min": float (optional, default: 100),
        "use_multiplier": bool (optional, default: false)
    }
    
    Returns:
    {
        "success": true,
        "message": "IDF files generated successfully",
        "idf_path": str,
        "geojson_path": str,
        "work_dir": str
    }
    """
    try:
        logger.info("Received process-geojson request")
        
        # Parse request data - use request.data for DRF
        data = request.data
        bounds = data.get('bounds')
        simulation_bounds = data.get('simulation_bounds', None)  # Optional simulation area
        
        if not bounds:
            return JsonResponse({'error': 'Missing bounds in request'}, status=400)
        
        north = bounds.get('north')
        south = bounds.get('south')
        east = bounds.get('east')
        west = bounds.get('west')
        
        if None in [north, south, east, west]:
            return JsonResponse({'error': 'Invalid bounds: missing coordinate'}, status=400)
        
        # Optional parameters
        filter_height_min = data.get('filter_height_min', 3)
        filter_height_max = data.get('filter_height_max', 100)
        filter_area_min = data.get('filter_area_min', 100)
        use_multiplier = data.get('use_multiplier', False)
        
        logger.info(f"Processing download area: N={north}, S={south}, E={east}, W={west}")
        if simulation_bounds:
            logger.info(f"Simulation area specified: N={simulation_bounds.get('north')}, S={simulation_bounds.get('south')}, E={simulation_bounds.get('east')}, W={simulation_bounds.get('west')}")
        else:
            logger.info("No simulation area specified - all buildings will be simulated")
        
        # Create work directory
        work_id = str(uuid.uuid4())
        work_dir = Path(settings.MEDIA_ROOT) / 'geojson_processing' / work_id
        work_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Work directory: {work_dir}")
        
        # Step 1: Convert bounds from WGS84 (EPSG:4326) to SWEREF99 TM (EPSG:3006)
        logger.info("Converting bounds from EPSG:4326 to EPSG:3006")
        transformer = Transformer.from_crs("EPSG:4326", "EPSG:3006", always_xy=True)
        
        # Transform coordinates (transformer expects lon, lat order)
        west_3006, south_3006 = transformer.transform(west, south)
        east_3006, north_3006 = transformer.transform(east, north)
        
        logger.info(f"Transformed bounds: W={west_3006:.2f}, S={south_3006:.2f}, E={east_3006:.2f}, N={north_3006:.2f}")
        
        # Step 2: Download city data using DTCC
        logger.info("Downloading city data with DTCC...")
        dtcc_service = DTCCService(str(work_dir))
        
        try:
            geojson_path = dtcc_service.download_city_data(
                west=west_3006,
                south=south_3006,
                east=east_3006,
                north=north_3006,
                epsg=3006
            )
        except Exception as e:
            logger.error(f"DTCC download failed: {e}")
            return JsonResponse({
                'error': f'Failed to download city data: {str(e)}',
                'details': 'DTCC service may be unavailable or the area may not have data'
            }, status=500)
        
        # Step 3: Convert GeoJSON to IDF
        logger.info("Converting GeoJSON to IDF...")
        converter = GeoJSONToIDFConverter(str(work_dir))
        
        # Convert simulation_bounds to EPSG:3006 if provided
        simulation_bounds_3006 = None
        if simulation_bounds:
            transformer = Transformer.from_crs('EPSG:4326', 'EPSG:3006', always_xy=True)
            sim_west_3006, sim_south_3006 = transformer.transform(
                simulation_bounds.get('west'), 
                simulation_bounds.get('south')
            )
            sim_east_3006, sim_north_3006 = transformer.transform(
                simulation_bounds.get('east'), 
                simulation_bounds.get('north')
            )
            simulation_bounds_3006 = {
                'north': sim_north_3006,
                'south': sim_south_3006,
                'east': sim_east_3006,
                'west': sim_west_3006
            }
            logger.info(f"Simulation bounds in EPSG:3006: {simulation_bounds_3006}")
        
        try:
            idf_path, gbxml_path = converter.process(
                geojson_path,
                filter_height_min=filter_height_min,
                filter_height_max=filter_height_max,
                filter_area_min=filter_area_min,
                use_multiplier=use_multiplier,
                simulation_bounds=simulation_bounds_3006  # Pass simulation bounds
            )
        except Exception as e:
            logger.error(f"IDF conversion failed: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Failed to convert GeoJSON to IDF: {str(e)}',
                'details': 'Check server logs for detailed traceback'
            }, status=500)
        
        # Step 4: Generate 3D model for preview from IDF file
        logger.info("=" * 60)
        logger.info("STEP 4: Generating 3D model for preview...")
        logger.info("=" * 60)
        model_3d_path = None
        try:
            # Use the IDF file that was just created
            if idf_path and idf_path.exists():
                logger.info(f"IDF file exists at: {idf_path}")
                logger.info(f"IDF file size: {idf_path.stat().st_size} bytes")
                
                model_generator = Model3DGenerator(str(work_dir))
                logger.info("Model3DGenerator initialized")
                
                model_3d_path = model_generator.generate_from_idf(
                    str(idf_path)
                )
                
                if model_3d_path:
                    logger.info(f"✅ Generated 3D model at: {model_3d_path}")
                    model_path_obj = Path(model_3d_path)
                    if model_path_obj.exists():
                        logger.info(f"✅ 3D model file exists, size: {model_path_obj.stat().st_size} bytes")
                    else:
                        logger.error(f"❌ 3D model file NOT found at {model_3d_path}")
                else:
                    logger.warning("⚠️ 3D model generation returned None")
            else:
                logger.warning(f"❌ IDF file not found at {idf_path}")
        except Exception as e:
            logger.error(f"❌ Failed to generate 3D model: {e}")
            import traceback
            traceback.print_exc()
        
        # Return results
        relative_work_dir = Path('geojson_processing') / work_id
        relative_idf_path = relative_work_dir / 'city.idf'
        relative_geojson_path = relative_work_dir / 'city_enriched.geojson'
        relative_model_path = relative_work_dir / 'model_3d.json' if model_3d_path else None
        
        logger.info(f"Successfully generated IDF at {idf_path}")
        
        response_data = {
            'success': True,
            'message': 'IDF files generated successfully',
            'idf_path': str(relative_idf_path),
            'geojson_path': str(relative_geojson_path),
            'work_dir': str(relative_work_dir),
            'idf_url': f'/media/{relative_idf_path}',
            'geojson_url': f'/media/{relative_geojson_path}'
        }
        
        # Add 3D model URL if available
        if relative_model_path:
            response_data['model_url'] = f'/media/{relative_model_path}'
            logger.info(f"✅ Returning model_url: {response_data['model_url']}")
        else:
            logger.warning("⚠️ No 3D model path available - model_url not included in response")
        
        logger.info("=" * 60)
        logger.info("FINAL RESPONSE DATA:")
        logger.info(f"  - success: {response_data.get('success')}")
        logger.info(f"  - idf_path: {response_data.get('idf_path')}")
        logger.info(f"  - model_url: {response_data.get('model_url', 'NOT SET')}")
        logger.info(f"  - geojson_path: {response_data.get('geojson_path')}")
        logger.info("=" * 60)
        
        return JsonResponse(response_data)
    
    except Exception as e:
        logger.error(f"Unexpected error in process_geojson: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f'Server error: {str(e)}'
        }, status=500)


@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Check if the geojson processor service is healthy."""
    try:
        # Check if DTCC is available
        try:
            from dtcc import City, Bounds
            dtcc_available = True
        except ImportError:
            dtcc_available = False
        
        # Check if Ladybug tools are available
        try:
            from dragonfly.model import Model
            from honeybee_energy.lib.programtypes import ProgramType
            ladybug_available = True
        except ImportError:
            ladybug_available = False
        
        return JsonResponse({
            'status': 'healthy',
            'dtcc_available': dtcc_available,
            'ladybug_tools_available': ladybug_available
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def validate_areas(request):
    """
    Validate download and simulation areas using proper geospatial operations.
    
    Expects JSON payload:
    {
        "download_area": {
            "type": "rectangle" | "polygon",
            "coordinates": [[lat, lon], ...],
            "bounds": {"north": float, "south": float, "east": float, "west": float}
        },
        "simulation_area": {  // Optional
            "type": "rectangle" | "polygon",
            "coordinates": [[lat, lon], ...],
            "bounds": {"north": float, "south": float, "east": float, "west": float}
        }
    }
    
    Returns:
    {
        "valid": bool,
        "errors": [str, ...],
        "warnings": [str, ...],
        "details": {
            "download_area_km2": float,
            "simulation_area_km2": float,
            "containment_check": bool
        }
    }
    """
    try:
        from shapely.geometry import Polygon
        from shapely.ops import transform
        from pyproj import Transformer
        import math
        
        data = request.data
        download_area = data.get('download_area')
        simulation_area = data.get('simulation_area')
        
        errors = []
        warnings = []
        details = {}
        
        # Constants
        MAX_DOWNLOAD_AREA_KM2 = 5.0
        MIN_SIMULATION_AREA_M2 = 100.0
        
        # Validate download area
        if not download_area:
            return JsonResponse({
                'valid': False,
                'errors': ['Download area is required'],
                'warnings': [],
                'details': {}
            })
        
        # Create Shapely polygon from coordinates (lat, lon -> lon, lat for Shapely)
        download_coords = download_area.get('coordinates', [])
        if len(download_coords) < 3:
            errors.append('Download area must have at least 3 points')
        else:
            # Convert [lat, lon] to [lon, lat] for Shapely
            download_coords_xy = [(lon, lat) for lat, lon in download_coords]
            download_polygon_4326 = Polygon(download_coords_xy)
            
            # Transform to EPSG:3006 (SWEREF99 TM) for accurate area calculation
            transformer_to_3006 = Transformer.from_crs("EPSG:4326", "EPSG:3006", always_xy=True)
            download_polygon_3006 = transform(transformer_to_3006.transform, download_polygon_4326)
            
            # Calculate area in m²
            download_area_m2 = download_polygon_3006.area
            download_area_km2 = download_area_m2 / 1_000_000
            details['download_area_km2'] = round(download_area_km2, 6)
            
            # Check max area limit
            if download_area_km2 > MAX_DOWNLOAD_AREA_KM2:
                errors.append(
                    f'Download area is too large: {download_area_km2:.3f} km² '
                    f'(max: {MAX_DOWNLOAD_AREA_KM2} km²). Please draw a smaller area.'
                )
        
        # Validate simulation area if provided
        if simulation_area:
            simulation_coords = simulation_area.get('coordinates', [])
            if len(simulation_coords) < 3:
                errors.append('Simulation area must have at least 3 points')
            else:
                # Convert [lat, lon] to [lon, lat] for Shapely
                simulation_coords_xy = [(lon, lat) for lat, lon in simulation_coords]
                simulation_polygon_4326 = Polygon(simulation_coords_xy)
                
                # Transform to EPSG:3006
                simulation_polygon_3006 = transform(transformer_to_3006.transform, simulation_polygon_4326)
                
                # Calculate area in m²
                simulation_area_m2 = simulation_polygon_3006.area
                simulation_area_km2 = simulation_area_m2 / 1_000_000
                details['simulation_area_km2'] = round(simulation_area_km2, 6)
                details['simulation_area_m2'] = round(simulation_area_m2, 2)
                
                # Check min area limit
                if simulation_area_m2 < MIN_SIMULATION_AREA_M2:
                    errors.append(
                        f'Simulation area is too small: {simulation_area_m2:.2f} m² '
                        f'(min: {MIN_SIMULATION_AREA_M2} m²). Please draw a larger area.'
                    )
                
                # Check containment: simulation must be within download area
                if download_coords and len(download_coords) >= 3:
                    # Use the projected polygons for accurate containment check
                    is_contained = download_polygon_3006.contains(simulation_polygon_3006)
                    details['containment_check'] = is_contained
                    
                    if not is_contained:
                        # Calculate overlap percentage for better error message
                        intersection = download_polygon_3006.intersection(simulation_polygon_3006)
                        overlap_percent = (intersection.area / simulation_polygon_3006.area) * 100
                        
                        errors.append(
                            f'Simulation area (green) must be completely inside the download area (orange). '
                            f'Currently only {overlap_percent:.1f}% is inside. '
                            f'Please redraw or edit the simulation area to fit within the download area.'
                        )
                    else:
                        details['overlap_percent'] = 100.0
        
        # Determine overall validity
        valid = len(errors) == 0
        
        logger.info(f"Area validation: valid={valid}, errors={errors}, details={details}")
        
        return JsonResponse({
            'valid': valid,
            'errors': errors,
            'warnings': warnings,
            'details': details
        })
        
    except Exception as e:
        logger.error(f"Error validating areas: {str(e)}", exc_info=True)
        return JsonResponse({
            'valid': False,
            'errors': [f'Validation error: {str(e)}'],
            'warnings': [],
            'details': {}
        }, status=500)
