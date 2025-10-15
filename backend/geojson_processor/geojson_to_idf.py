"""
GeoJSON to IDF Converter Service

This module converts GeoJSON building footprints to EnergyPlus IDF files
using the Ladybug Tools ecosystem (Ladybug, Dragonfly, Honeybee).

Attribution:
This work incorporates code from the Ladybug Tools project (https://github.com/ladybug-tools),
which is licensed under the GNU General Public License (GPL) Version 3.
Any derivative works must also be released under an open source GPL license.

Copyright (C) 2023 Sanjay Somanath
Copyright (C) Ladybug Tools
Licensed under the GPL License
"""

import json
import logging
import os
import shutil
from math import ceil
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Constants
DEFAULT_CLIMATE_ZONE = 'ClimateZone6'
DEFAULT_CONSTRUCTION_TYPE = 'Mass'  # 'SteelFramed', 'WoodFramed', 'Mass', 'Metal Building'
DEFAULT_YEAR = 2000
PROJECT_NAME = 'City'
FLOOR_TO_FLOOR_HEIGHT = 2.8
WINDOW_TO_WALL_RATIO = 0.4
WINDOW_HEIGHT = 1.6
WINDOW_SILL_HEIGHT = 0.7
WINDOW_TO_WINDOW_HORIZONTAL_SPACING = 4
ADD_DEFAULT_IDEAL_AIR = True

# Building type mapping (Swedish building categories to DOE building types)
BUILDING_PROGRAM_DICT = {
    "Bostad; Småhus friliggande": "HighriseApartment",
    "Bostad; Småhus kedjehus": "MidriseApartment",
    "Bostad; Småhus radhus": "MidriseApartment",
    "Bostad; Flerfamiljshus": "HighriseApartment",
    "Bostad; Småhus med flera lägenheter": "MidriseApartment",
    "Bostad; Ospecificerad": "HighriseApartment",
    "Industri; Annan tillverkningsindustri": "Warehouse",
    "Industri; Gasturbinanläggning": "LargeDataCenterHighITE",
    "Industri; Industrihotell": "LargeHotel",
    "Industri; Kemisk industri": "Laboratory",
    "Industri; Kondenskraftverk": "Warehouse",
    "Industri; Kärnkraftverk": "LargeDataCenterHighITE",
    "Industri; Livsmedelsindustri": "SuperMarket",
    "Industri; Metall- eller maskinindustri": "Warehouse",
    "Industri; Textilindustri": "Warehouse",
    "Industri; Trävaruindustri": "Warehouse",
    "Industri; Vattenkraftverk": "Warehouse",
    "Industri; Vindkraftverk": "Warehouse",
    "Industri; Värmeverk": "Warehouse",
    "Industri; Övrig industribyggnad": "Warehouse",
    "Industri; Ospecificerad": "Warehouse",
    "Samhällsfunktion; Badhus": "Outpatient",
    "Samhällsfunktion; Brandstation": "SmallOffice",
    "Samhällsfunktion; Busstation": "SmallOffice",
    "Samhällsfunktion; Distributionsbyggnad": "Warehouse",
    "Samhällsfunktion; Djursjukhus": "Outpatient",
    "Samhällsfunktion; Försvarsbyggnad": "Courthouse",
    "Samhällsfunktion; Vårdcentral": "Outpatient",
    "Samhällsfunktion; Hälsocentral": "Outpatient",
    "Samhällsfunktion; Högskola": "SecondarySchool",
    "Samhällsfunktion; Ishall": "SmallOffice",
    "Samhällsfunktion; Järnvägsstation": "SmallOffice",
    "Samhällsfunktion; Kommunhus": "Courthouse",
    "Samhällsfunktion; Kriminalvårdsanstalt": "Courthouse",
    "Samhällsfunktion; Kulturbyggnad": "SmallOffice",
    "Samhällsfunktion; Polisstation": "SmallOffice",
    "Samhällsfunktion; Reningsverk": "SmallDataCenterHighITE",
    "Samhällsfunktion; Ridhus": "SmallOffice",
    "Samhällsfunktion; Samfund": "SmallOffice",
    "Samhällsfunktion; Sjukhus": "Hospital",
    "Samhällsfunktion; Skola": "PrimarySchool",
    "Samhällsfunktion; Sporthall": "SmallOffice",
    "Samhällsfunktion; Universitet": "SecondarySchool",
    "Samhällsfunktion; Vattenverk": "SmallDataCenterHighITE",
    "Samhällsfunktion; Multiarena": "SmallOffice",
    "Samhällsfunktion; Ospecificerad": "SmallOffice",
    "Verksamhet; Ospecificerad": "SmallOffice",
    "Ekonomibyggnad; Ospecificerad": "Warehouse",
    "Komplementbyggnad; Ospecificerad": "SmallOffice",
    "Övrig byggnad; Ospecificerad": "SmallOffice"
}

DEFAULT_PROGRAM_TYPE = "HighriseApartment"


class GeoJSONToIDFConverter:
    """Convert GeoJSON building footprints to EnergyPlus IDF format."""
    
    def __init__(self, work_dir: str):
        """
        Initialize converter.
        
        Args:
            work_dir: Working directory for input/output files
        """
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
    
    def filter_buildings(
        self,
        geojson_path: Path,
        filter_height_less_than: float = 3,
        filter_height_greater_than: float = 100,
        filter_area_less_than: float = 100
    ) -> Path:
        """
        Filter out buildings that don't meet criteria.
        
        Args:
            geojson_path: Path to input GeoJSON file
            filter_height_less_than: Minimum height in meters
            filter_height_greater_than: Maximum height in meters
            filter_area_less_than: Minimum area in square meters
            
        Returns:
            Path to filtered GeoJSON file
        """
        try:
            import geopandas as gpd
            
            logger.info(f"Filtering buildings from {geojson_path}")
            logger.info(f"Filters: height {filter_height_less_than}m - {filter_height_greater_than}m, area >= {filter_area_less_than}m²")
            
            # Load GeoDataFrame
            gdf = gpd.read_file(geojson_path)
            features_before = len(gdf)
            
            # Filter by height
            if 'height' in gdf.columns:
                gdf = gdf[(gdf['height'] > filter_height_less_than) & (gdf['height'] < filter_height_greater_than)]
            
            # Convert to EPSG 3006 to calculate area in square meters
            gdf = gdf.to_crs(crs='3006')
            gdf["area_sqm"] = gdf.geometry.area
            
            # Filter by area
            gdf = gdf[gdf['area_sqm'] >= filter_area_less_than]
            
            # Convert back to EPSG 4326
            gdf = gdf.to_crs(crs='4326')
            gdf = gdf.drop(columns=['area_sqm'])
            
            # Save filtered GeoJSON
            filtered_path = self.work_dir / 'city_filtered.geojson'
            gdf.to_file(filtered_path, driver='GeoJSON')
            
            features_after = len(gdf)
            logger.info(f"Filtered {features_before - features_after} buildings, {features_after} remaining")
            
            return filtered_path
            
        except ImportError as e:
            logger.error(f"geopandas not available: {e}")
            raise ImportError("geopandas is required. Install with: pip install geopandas")
        except Exception as e:
            logger.error(f"Error filtering buildings: {e}")
            raise
    
    def enrich_geojson(self, geojson_path: Path, simulation_bounds: Optional[Dict] = None) -> Path:
        """
        Add building properties required for Dragonfly model.
        
        Args:
            geojson_path: Path to input GeoJSON file
            simulation_bounds: Optional dict with keys 'north', 'south', 'east', 'west' in EPSG:3006
                             If provided, buildings inside these bounds are marked as 'Building',
                             others are marked as 'Existing' (context shading only)
            
        Returns:
            Path to enriched GeoJSON file
        """
        try:
            import geopandas as gpd
            from shapely.geometry import box
            
            logger.info(f"Enriching GeoJSON: {geojson_path}")
            if simulation_bounds:
                logger.info(f"Simulation bounds provided: {simulation_bounds}")
                logger.info("Buildings inside simulation bounds will be simulated, others will be context shading")
            else:
                logger.info("No simulation bounds - all buildings will be simulated")
            
            with open(geojson_path, 'r', encoding='utf-8') as f:
                city_geojson = json.load(f)
            
            # Get bounding box
            city_gdf = gpd.read_file(geojson_path)
            city_bounds = city_gdf.bounds
            lon_min, lat_min = city_bounds.minx.min(), city_bounds.miny.min()
            
            # Create simulation bounds polygon if provided (in EPSG:3006)
            simulation_polygon = None
            if simulation_bounds:
                # GeoJSON from DTCC is in CRS84 (WGS84), need to transform to EPSG:3006 for comparison
                gdf_3006 = city_gdf.to_crs('EPSG:3006')
                simulation_polygon = box(
                    simulation_bounds['west'],
                    simulation_bounds['south'],
                    simulation_bounds['east'],
                    simulation_bounds['north']
                )
                logger.info(f"Created simulation polygon: {simulation_polygon.bounds}")
            
            # Add project metadata
            city_geojson['project'] = {
                'id': PROJECT_NAME,
                'name': PROJECT_NAME,
                'latitude': lat_min,
                'longitude': lon_min
            }
            
            # Add building properties
            for i, building in enumerate(city_geojson.get('features', [])):
                properties = building.get('properties', {})
                height = properties.get('height', 10)
                number_of_stories = ceil(height / FLOOR_TO_FLOOR_HEIGHT)
                
                properties['id'] = f"Building{i}"
                properties['name'] = f"Building{i}"
                properties['type'] = 'Building'
                properties['maximum_roof_height'] = height
                properties['number_of_stories'] = number_of_stories
                properties['window_to_wall_ratio'] = WINDOW_TO_WALL_RATIO
                
                # Ensure ground_height exists (default to 0)
                if 'ground_height' not in properties:
                    properties['ground_height'] = 0
                
                # Determine if building should be simulated or just context shading
                if simulation_polygon:
                    # Check if building centroid is inside simulation bounds
                    # Get building geometry in EPSG:3006 for comparison
                    building_geom_3006 = gdf_3006.iloc[i].geometry
                    centroid = building_geom_3006.centroid
                    
                    if simulation_polygon.contains(centroid):
                        properties['building_status'] = 'Building'  # Simulate
                        logger.debug(f"Building {i} inside simulation area - will be simulated")
                    else:
                        properties['building_status'] = 'Existing'  # Context shading only
                        logger.debug(f"Building {i} outside simulation area - context shading only")
                else:
                    # No simulation bounds - all buildings are simulated
                    properties['building_status'] = 'Building'
                
                building['properties'] = properties
            
            # Save enriched GeoJSON
            enriched_path = self.work_dir / 'city_enriched.geojson'
            with open(enriched_path, 'w', encoding='utf-8') as f:
                json.dump(city_geojson, f, ensure_ascii=False, indent=4)
            
            # Log statistics
            building_count = sum(1 for f in city_geojson.get('features', []) 
                               if f.get('properties', {}).get('building_status') == 'Building')
            context_count = sum(1 for f in city_geojson.get('features', []) 
                              if f.get('properties', {}).get('building_status') == 'Existing')
            logger.info(f"✅ Enriched GeoJSON: {building_count} buildings to simulate, {context_count} context shades")
            logger.info(f"Saved to {enriched_path}")
            
            return enriched_path
            
        except Exception as e:
            logger.error(f"Error enriching GeoJSON: {e}")
            raise
    
    def get_construction_identifier(self, construction_type: str, climate_zone: str, year: int) -> str:
        """
        Get construction set identifier for Honeybee energy standards.
        
        Args:
            construction_type: Type of construction (Mass, SteelFramed, WoodFramed, etc.)
            climate_zone: Climate zone (ClimateZone1-7)
            year: Building year
            
        Returns:
            Construction identifier string
        """
        try:
            from honeybee_energy.lib._loadprogramtypes import _program_types_standards_registry as STANDARDS_REGISTRY
            
            # Convert year to closest standard year
            conversion = {
                'pre_1980': 1979,
                '1980_2004': 1980
            }
            
            years = []
            for yr in STANDARDS_REGISTRY.keys():
                if yr in conversion:
                    years.append(conversion[yr])
                else:
                    try:
                        years.append(int(yr))
                    except ValueError:
                        pass
            
            # Find closest year
            if years:
                differences = [abs(year - y) for y in years]
                closest_idx = differences.index(min(differences))
                closest_year_key = list(STANDARDS_REGISTRY.keys())[closest_idx]
            else:
                closest_year_key = str(year)
            
            return f"{closest_year_key}::{climate_zone}::{construction_type}"
            
        except ImportError:
            logger.warning("honeybee_energy_standards not available, using default construction")
            return f"{year}::{climate_zone}::{construction_type}"
    
    def convert_to_idf(
        self,
        geojson_path: Path,
        use_multiplier: bool = False
    ) -> Tuple[Path, Optional[Path]]:
        """
        Convert enriched GeoJSON to IDF and GBXML formats.
        
        Args:
            geojson_path: Path to enriched GeoJSON file
            use_multiplier: Whether to use floor multipliers
            
        Returns:
            Tuple of (idf_path, gbxml_path)
        """
        try:
            from ladybug_geometry.geometry2d.pointvector import Point2D
            from ladybug_geometry.geometry3d.pointvector import Vector3D
            from dragonfly.model import Model
            from dragonfly.windowparameter import RepeatingWindowRatio
            from honeybee_energy.lib.programtypes import ProgramType
            from honeybee_energy.lib.constructionsets import construction_set_by_identifier
            from honeybee_energy.simulation.parameter import SimulationParameter
            from honeybee_energy.writer import energyplus_idf_version
            
            logger.info(f"Converting GeoJSON to IDF: {geojson_path}")
            
            # Load GeoJSON data
            with open(geojson_path, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
            
            # Calculate bounding box centroid in EPSG:4326 (WGS84 lat/lon)
            logger.info("Calculating bounding box centroid...")
            all_coords = []
            for feature in geojson_data['features']:
                if feature['geometry']['type'] == 'Polygon':
                    for ring in feature['geometry']['coordinates']:
                        all_coords.extend(ring)
                elif feature['geometry']['type'] == 'MultiPolygon':
                    for polygon in feature['geometry']['coordinates']:
                        for ring in polygon:
                            all_coords.extend(ring)
            
            if not all_coords:
                raise ValueError("No coordinates found in GeoJSON")
            
            # Calculate centroid (lon, lat in EPSG:4326)
            lons = [c[0] for c in all_coords]
            lats = [c[1] for c in all_coords]
            centroid_lon = (min(lons) + max(lons)) / 2
            centroid_lat = (min(lats) + max(lats)) / 2
            
            logger.info(f"Centroid: lon={centroid_lon:.6f}, lat={centroid_lat:.6f}")
            
            # Create Location object for the centroid
            from ladybug_geometry.geometry2d.pointvector import Point2D
            from ladybug.location import Location
            
            # Create a Location object at the centroid (for sun position, climate data, etc.)
            location_obj = Location(
                city='Sweden',
                latitude=centroid_lat,
                longitude=centroid_lon,
                time_zone=1,  # UTC+1 for Sweden
                elevation=0
            )
            
            # Create Dragonfly model from GeoJSON
            # GeoJSON is in EPSG:4326 (WGS84 lat/lon) - DTCC outputs CRS84 which is WGS84
            # location: Geographic location (lat/lon) for climate/sun calculations
            # point: Position in 3D scene (meters) - use (0,0) to center at origin
            logger.info("Creating Dragonfly model...")
            model, location = Model.from_geojson(
                str(geojson_path),
                location=location_obj,
                point=Point2D(0, 0),  # Place at origin (0,0) in 3D scene
                all_polygons_to_buildings=False,
                existing_to_context=True,
                units='Meters',
                tolerance=None,
                angle_tolerance=1.0
            )
            
            # Adjust building properties
            logger.info("Adjusting building properties...")
            model = self._adjust_building_properties(model, geojson_data)
            
            # Save Dragonfly JSON
            dfjson_path = self.work_dir / 'city.dfjson'
            model.to_dfjson('city', str(self.work_dir), 2, None)
            logger.info(f"Saved Dragonfly model to {dfjson_path}")

            # Validate Dragonfly model
            logger.info("Validating Dragonfly model...")
            validation_result = self.validate_dragonfly_model(model)
            logger.info(f"Validation result: {validation_result}")
            
            # Convert to Honeybee model
            logger.info("Converting to Honeybee model...")
            logger.info("Parameters: object_per_model='District', exclude_plenums=True, solve_ceiling_adjacencies=False")
            hb_models = model.to_honeybee(
                object_per_model='District',
                shade_distance=None,
                use_multiplier=use_multiplier,
                exclude_plenums=True,  # Exclude plenum zones (API changed from add_plenum)
                cap=True,
                solve_ceiling_adjacencies=True,
                tolerance=None,
                enforce_adj=False
            )
            hb_model = hb_models[0]
            logger.info("✅ Honeybee model conversion completed successfully")
            logger.info(f"✅ Generated Honeybee model with {len(hb_model.rooms)} rooms")
            
            # Convert to IDF
            logger.info("Generating IDF file...")
            idf_path = self.work_dir / 'city.idf'
            sim_par = SimulationParameter()
            sim_par.output.add_zone_energy_use()
            sim_par.output.add_hvac_energy_use()
            
            ver_str = energyplus_idf_version()
            logger.info(f"Version string: {ver_str is not None}")
            
            sim_par_str = sim_par.to_idf()
            logger.info(f"Simulation parameter string: {sim_par_str is not None}")
            
            model_str = hb_model.to.idf(
                hb_model,
                schedule_directory=None,
                use_ideal_air_equivalent=True
            )
            logger.info(f"Model string: {model_str is not None}")
            
            # Filter out None values before joining
            idf_parts = [s for s in [ver_str, sim_par_str, model_str] if s is not None]
            idf_content = '\n\n'.join(idf_parts)
            
            with open(idf_path, 'w') as f:
                f.write(idf_content)
            
            logger.info(f"Successfully generated IDF file: {idf_path}")
            
            # For now, skip GBXML generation (can be added later if needed)
            gbxml_path = None
            
            return idf_path, gbxml_path
            
        except ImportError as e:
            logger.error(f"Required libraries not available: {e}")
            raise ImportError("Ladybug/Dragonfly/Honeybee libraries required. Install with requirements.txt")
        except Exception as e:
            logger.error(f"Error converting to IDF: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def _adjust_building_properties(self, model, geojson_data: dict):
        """
        Adjust building properties in the Dragonfly model.
        
        Args:
            model: Dragonfly model
            geojson_data: Original GeoJSON data with properties
            
        Returns:
            Adjusted model
        """
        try:
            from ladybug_geometry.geometry3d.pointvector import Vector3D
            from dragonfly.windowparameter import RepeatingWindowRatio
            from honeybee_energy.lib.programtypes import ProgramType
            from honeybee_energy.lib.constructionsets import construction_set_by_identifier
            
            # Separate buildings and context
            building_objects = [
                bldg for bldg in geojson_data.get('features', [])
                if bldg.get('properties', {}).get('building_status') == 'Building'
            ]
            context_objects = [
                bldg for bldg in geojson_data.get('features', [])
                if bldg.get('properties', {}).get('building_status') == 'Existing'
            ]
            
            # Get construction identifier
            construction_identifier = self.get_construction_identifier(
                DEFAULT_CONSTRUCTION_TYPE,
                DEFAULT_CLIMATE_ZONE,
                DEFAULT_YEAR
            )
            
            # Adjust buildings
            for i, building in enumerate(model.buildings):
                if i >= len(building_objects):
                    break
                    
                props = building_objects[i].get('properties', {})
                ground_height = props.get('ground_height', 0)
                building_type = props.get('ANDAMAL_1T', None)
                
                # Move building to ground height
                m_vec = Vector3D(0, 0, ground_height)
                building.move(m_vec)
                
                # Set construction set and program type for each room
                try:
                    construction_set = construction_set_by_identifier(construction_identifier)
                except:
                    construction_set = None
                    logger.warning(f"Could not load construction set: {construction_identifier}")
                
                for storey in building:
                    for room in storey.room_2ds:
                        if construction_set:
                            room.properties.energy.construction_set = construction_set
                        
                        # Set program type
                        building_program = BUILDING_PROGRAM_DICT.get(building_type, DEFAULT_PROGRAM_TYPE)
                        try:
                            program = ProgramType(building_program)
                            room.properties.energy.program_type = program
                        except:
                            logger.warning(f"Could not load program type: {building_program}")
                        
                        # Add ideal air system
                        if ADD_DEFAULT_IDEAL_AIR:
                            room.properties.energy.add_default_ideal_air()
                    
                    # Set window parameters
                    storey.set_outdoor_window_parameters(
                        RepeatingWindowRatio(
                            WINDOW_TO_WALL_RATIO,
                            WINDOW_HEIGHT,
                            WINDOW_SILL_HEIGHT,
                            WINDOW_TO_WINDOW_HORIZONTAL_SPACING
                        )
                    )
            
            # Adjust context shades
            for i, context in enumerate(model.context_shades):
                if i >= len(context_objects):
                    break
                    
                props = context_objects[i].get('properties', {})
                ground_height = props.get('ground_height', 0)
                m_vec = Vector3D(0, 0, ground_height)
                context.move(m_vec)
            
            return model
            
        except Exception as e:
            logger.error(f"Error adjusting building properties: {e}")
            raise
    
    def validate_dragonfly_model(
        self,
        model,
        check_function: str = 'check_all',
        check_args: Optional[List] = None,
        json_output: bool = False
    ) -> str:
        """
        Validate a Dragonfly Model and generate a validation report.
        
        Args:
            model: A Dragonfly Model object to validate. This can also be the file path
                   to a DFJSON or a JSON string representation of a Dragonfly Model.
            check_function: Name of a check function on the Model (e.g., 'check_all',
                           'check_rooms_solid'). Default: 'check_all'
            check_args: Optional list of arguments to pass to the check function.
            json_output: If True, return JSON formatted report instead of plain text.
        
        Returns:
            Validation report as a string (plain text or JSON)
        """
        try:
            from dragonfly.model import Model
            import dragonfly.config as df_folders
            
            # Process the input model if it's not already a Model object
            report = ''
            if isinstance(model, str):
                try:
                    if model.startswith('{'):
                        model = Model.from_dict(json.loads(model))
                    elif os.path.isfile(model):
                        model = Model.from_file(model)
                    else:
                        report = 'Input Model for validation is not a Model object, ' \
                            'file path to a Model or a Model DFJSON string.'
                except Exception as e:
                    report = str(e)
            elif not isinstance(model, Model):
                report = 'Input Model for validation is not a Model object, ' \
                    'file path to a Model or a Model DFJSON string.'

            if report == '':  # Get the function to call to do checks
                if '.' in check_function:  # nested attribute
                    attributes = check_function.split('.')
                    check_func = model
                    for attribute in attributes:
                        if check_func is None:
                            continue
                        check_func = getattr(check_func, attribute, None)
                else:
                    check_func = getattr(model, check_function, None)
                
                if check_func is None:
                    raise ValueError(f'Dragonfly Model class has no method {check_function}')
                
                # Process the arguments and options
                args = [] if check_args is None else list(check_args)
                kwargs = {'raise_exception': False}

            # Create the report
            if not json_output:  # Plain text report
                # Add version information
                try:
                    c_ver = df_folders.dragonfly_core_version_str
                    s_ver = df_folders.dragonfly_schema_version_str
                except AttributeError:
                    c_ver = 'unknown'
                    s_ver = 'unknown'
                
                ver_msg = f'Validating Model using dragonfly-core=={c_ver} and ' \
                    f'dragonfly-schema=={s_ver}'
                
                # Run the check function
                if report == '':
                    kwargs['detailed'] = False
                    report = check_func(*args, **kwargs)
                
                # Format the results
                if report == '':
                    full_msg = ver_msg + '\n✅ Congratulations! Your Model is valid!'
                else:
                    full_msg = ver_msg + \
                        '\n❌ Your Model is invalid for the following reasons:\n' + report
                return full_msg
            else:  # JSON report
                # Add version information
                try:
                    c_ver = df_folders.dragonfly_core_version_str
                    s_ver = df_folders.dragonfly_schema_version_str
                except AttributeError:
                    c_ver = 'unknown'
                    s_ver = 'unknown'
                
                out_dict = {
                    'type': 'ValidationReport',
                    'app_name': 'Dragonfly',
                    'app_version': c_ver,
                    'schema_version': s_ver,
                    'fatal_error': report
                }
                
                if report == '':
                    kwargs['detailed'] = True
                    errors = check_func(*args, **kwargs)
                    out_dict['errors'] = errors
                    out_dict['valid'] = len(errors) == 0
                else:
                    out_dict['errors'] = []
                    out_dict['valid'] = False
                
                return json.dumps(out_dict, indent=4)
                
        except Exception as e:
            error_msg = f"Error during model validation: {str(e)}"
            logger.error(error_msg)
            if json_output:
                return json.dumps({
                    'type': 'ValidationReport',
                    'app_name': 'Dragonfly',
                    'valid': False,
                    'fatal_error': error_msg,
                    'errors': []
                }, indent=4)
            else:
                return f"❌ Validation failed: {error_msg}"
    
    def process(
        self,
        geojson_path: Path,
        filter_height_min: float = 3,
        filter_height_max: float = 100,
        filter_area_min: float = 100,
        use_multiplier: bool = False,
        simulation_bounds: Optional[Dict] = None
    ) -> Tuple[Path, Optional[Path]]:
        """
        Complete pipeline: filter → enrich → convert to IDF.
        
        Args:
            geojson_path: Path to input GeoJSON file
            filter_height_min: Minimum building height
            filter_height_max: Maximum building height
            filter_area_min: Minimum building area
            use_multiplier: Use floor multipliers in model
            simulation_bounds: Optional dict with keys 'north', 'south', 'east', 'west' in EPSG:3006
                             Buildings inside are simulated, others are context shading
            
        Returns:
            Tuple of (idf_path, gbxml_path)
        """
        logger.info("Starting GeoJSON to IDF conversion pipeline")
        
        # Step 1: Filter buildings
        filtered_path = self.filter_buildings(
            geojson_path,
            filter_height_min,
            filter_height_max,
            filter_area_min
        )
        
        # Step 2: Enrich with metadata and mark simulation vs context buildings
        enriched_path = self.enrich_geojson(filtered_path, simulation_bounds)
        
        # Step 3: Convert to IDF
        idf_path, gbxml_path = self.convert_to_idf(enriched_path, use_multiplier)
        
        logger.info("GeoJSON to IDF conversion complete")
        return idf_path, gbxml_path
