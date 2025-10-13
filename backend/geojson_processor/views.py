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
        
        logger.info(f"Processing area: N={north}, S={south}, E={east}, W={west}")
        
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
        
        try:
            idf_path, gbxml_path = converter.process(
                geojson_path,
                filter_height_min=filter_height_min,
                filter_height_max=filter_height_max,
                filter_area_min=filter_area_min,
                use_multiplier=use_multiplier
            )
        except Exception as e:
            logger.error(f"IDF conversion failed: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'error': f'Failed to convert GeoJSON to IDF: {str(e)}',
                'details': 'Check server logs for detailed traceback'
            }, status=500)
        
        # Return results
        relative_work_dir = Path('geojson_processing') / work_id
        relative_idf_path = relative_work_dir / 'city.idf'
        relative_geojson_path = relative_work_dir / 'city_enriched.geojson'
        
        logger.info(f"Successfully generated IDF at {idf_path}")
        
        return JsonResponse({
            'success': True,
            'message': 'IDF files generated successfully',
            'idf_path': str(relative_idf_path),
            'geojson_path': str(relative_geojson_path),
            'work_dir': str(relative_work_dir),
            'idf_url': f'/media/{relative_idf_path}',
            'geojson_url': f'/media/{relative_geojson_path}'
        })
    
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
