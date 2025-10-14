"""
3D Model Generator from IDF File

This module parses EnergyPlus IDF files and generates 3D visualization files
for preview in the frontend before running simulations.

Inspired by: https://github.com/ladybug-tools/spider-2020/blob/master/spider-idf-viewer
"""

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class Model3DGenerator:
    """Generate 3D model files for visualization by parsing IDF files."""
    
    # Surface type colors (matching Spider IDF viewer)
    COLORS = {
        'ceiling': '#ff8080',
        'door': '#f00000',
        'floor': '#40b4ff',
        'glassdoor': '#8888ff',
        'wall': '#ffb400',
        'roof': '#800000',
        'roofceiling': '#aa4444',
        'shade': '#888888',
        'window': '#444444',
        'undefined': '#00ff00',
    }
    
    def __init__(self, work_dir: str):
        """
        Initialize the 3D model generator.
        
        Args:
            work_dir: Working directory for output files
        """
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(parents=True, exist_ok=True)
        
        self.surfaces = []
        self.surface_types = []
        self.surface_zones = []
    
    def generate_from_idf(
        self, 
        idf_path: str,
        output_path: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate 3D visualization from IDF file.
        
        Args:
            idf_path: Path to IDF file
            output_path: Optional custom output path
        
        Returns:
            Path to generated 3D model file or None if failed
        """
        try:
            logger.info(f"Parsing IDF file: {idf_path}")
            
            # Read IDF content
            with open(idf_path, 'r', encoding='utf-8') as f:
                idf_content = f.read()
            
            # Parse surfaces
            surfaces_data = self._parse_surfaces(idf_content)
            
            if not surfaces_data:
                logger.warning("No surfaces found in IDF file")
                return None
            
            # Parse zone multipliers for instancing
            multipliers = self._parse_zone_multipliers(idf_content)
            
            # Normalize coordinates to origin
            surfaces_data = self._normalize_coordinates(surfaces_data)
            
            # Create model data
            model_data = {
                'version': '1.0',
                'type': 'idf',
                'surfaces': surfaces_data,
                'multipliers': multipliers,  # Add multiplier data for instancing
                'metadata': {
                    'surface_count': len(surfaces_data),
                    'surface_types': list(set(self.surface_types)),
                    'zones': list(set(self.surface_zones)),
                    'source': 'energyplus_idf',
                    'generated_at': str(datetime.now()),
                    'colors': self.COLORS,
                    'uses_multipliers': len(multipliers) > 0
                }
            }
            
            # Save to file
            default_path = self.work_dir / 'model_3d.json'
            output_file = Path(output_path) if output_path else default_path
            
            with open(output_file, 'w') as f:
                json.dump(model_data, f, indent=2)
            
            logger.info(f"Generated 3D model with {len(surfaces_data)} surfaces")
            logger.info(f"Surface types: {set(self.surface_types)}")
            logger.info(f"Zones: {len(set(self.surface_zones))}")
            
            return str(output_file)
            
        except Exception as e:
            logger.error(f"Failed to generate 3D model from IDF: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _parse_surfaces(self, idf_content: str) -> List[Dict]:
        """
        Parse surfaces from IDF content.
        
        Args:
            idf_content: IDF file content as string
        
        Returns:
            List of surface dictionaries with geometry and metadata
        """
        surfaces_data = []
        
        # Split IDF into objects (each object ends with semicolon)
        items = re.split(r';', idf_content)
        
        # Filter items that contain surface keywords and "number of vertices" (case-insensitive)
        surface_keywords = ['BuildingSurface:Detailed', 'FenestrationSurface:Detailed', 'Shading:']
        surface_items = [
            item for item in items 
            if 'number of vertices' in item.lower() and 
            any(keyword in item for keyword in surface_keywords)
        ]
        
        logger.info(f"Found {len(surface_items)} surface objects in IDF")
        
        for index, item in enumerate(surface_items):
            try:
                surface = self._parse_surface_item(item, index)
                if surface:
                    surfaces_data.append(surface)
                    self.surface_types.append(surface['type'])
                    self.surface_zones.append(surface['zone'])
                    
                    # Log window parsing for debugging
                    if surface['type'] == 'window':
                        logger.info(f"Parsed window '{surface['name']}' with {len(surface['vertices'])} vertices")
            except Exception as e:
                logger.warning(f"Failed to parse surface {index}: {e}")
                import traceback
                logger.debug(traceback.format_exc())
                continue
        
        return surfaces_data
    
    def _normalize_coordinates(self, surfaces_data: List[Dict]) -> List[Dict]:
        """
        Normalize coordinates to center the model at origin and convert coordinate system.
        
        Large UTM coordinates cause precision issues in Three.js,
        so we translate all vertices to be centered around (0, 0, 0).
        
        Also converts from EnergyPlus coordinate system to Three.js:
        - EnergyPlus: X (East), Y (North), Z (Up)
        - Three.js: X (Right), Y (Up), Z (Forward)
        - Conversion: [X, Y, Z] → [X, Z, Y]
        
        Args:
            surfaces_data: List of surface dictionaries with vertices
        
        Returns:
            Updated surfaces_data with normalized and converted coordinates
        """
        if not surfaces_data:
            return surfaces_data
        
        # Find bounding box of all vertices
        min_x = min_y = min_z = float('inf')
        max_x = max_y = max_z = float('-inf')
        
        for surface in surfaces_data:
            for vertex in surface['vertices']:
                x, y, z = vertex
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                min_z = min(min_z, z)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                max_z = max(max_z, z)
        
        # Calculate center point
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        center_z = (min_z + max_z) / 2
        
        logger.info(f"Bounding box (EnergyPlus): X[{min_x:.2f}, {max_x:.2f}] Y[{min_y:.2f}, {max_y:.2f}] Z[{min_z:.2f}, {max_z:.2f}]")
        logger.info(f"Center point: ({center_x:.2f}, {center_y:.2f}, {center_z:.2f})")
        
        # Translate to center and convert coordinate system
        # EnergyPlus [X, Y, Z] → Three.js [X, Z, Y]
        for surface in surfaces_data:
            normalized_vertices = []
            for vertex in surface['vertices']:
                normalized_vertices.append([
                    vertex[0] - center_x,  # X stays X
                    vertex[2] - center_z,  # Z becomes Y (up)
                    vertex[1] - center_y   # Y becomes Z (depth)
                ])
            surface['vertices'] = normalized_vertices
        
        logger.info("Coordinates normalized to origin and converted to Three.js coordinate system")
        return surfaces_data
    
    def _parse_zone_multipliers(self, idf_content: str) -> Dict[str, int]:
        """
        Parse zone multipliers from IDF content.
        
        When use_multiplier=True in Honeybee, zones can have multipliers
        that indicate identical floors. This allows us to instance geometry
        in the 3D viewer for better performance.
        
        Args:
            idf_content: IDF file content as string
        
        Returns:
            Dictionary mapping zone names to their multipliers
        """
        multipliers = {}
        
        # Split IDF into objects
        items = re.split(r';', idf_content)
        
        # Find ZONE objects and extract multipliers
        zone_pattern = re.compile(r'ZONE\s*,', re.IGNORECASE)
        
        for item in items:
            if zone_pattern.search(item):
                try:
                    # Extract zone name (first field after ZONE,)
                    name_match = re.search(r'ZONE\s*,\s*(.*?)\s*,', item, re.IGNORECASE)
                    if not name_match:
                        continue
                    
                    zone_name = name_match.group(1).strip()
                    
                    # Extract multiplier field (look for "Multiplier" comment)
                    multiplier_match = re.search(r'(\d+(?:\.\d+)?)\s*,?\s*!-\s*Multiplier', item, re.IGNORECASE)
                    
                    if multiplier_match:
                        multiplier = int(float(multiplier_match.group(1)))
                        if multiplier > 1:
                            multipliers[zone_name] = multiplier
                            logger.info(f"Found zone '{zone_name}' with multiplier {multiplier}")
                    
                except Exception as e:
                    logger.warning(f"Failed to parse multiplier for zone: {e}")
                    continue
        
        if multipliers:
            logger.info(f"Found {len(multipliers)} zones with multipliers: {multipliers}")
        else:
            logger.info("No zone multipliers found (model not using floor multipliers)")
        
        return multipliers
    
    def _parse_surface_item(self, item: str, index: int) -> Optional[Dict]:
        """
        Parse a single surface item from IDF.
        
        Args:
            item: IDF surface object as string
            index: Surface index
        
        Returns:
            Surface dictionary or None if parsing failed
        """
        try:
            # Extract surface type
            surface_type_match = re.search(r'(.*?)\s*,?\s*!-\s*Surface Type', item, re.IGNORECASE)
            if surface_type_match:
                surface_type = surface_type_match.group(1).split(',')[-1].strip().lower()
            else:
                surface_type = 'shade'
            
            # Extract zone name
            zone_match = re.search(r'(.*?)\s*,?\s*!-\s*Zone Name', item, re.IGNORECASE)
            if zone_match:
                zone_name = zone_match.group(1).split(',')[-1].strip()
            else:
                zone_name = 'exterior'
            
            # Extract surface name
            name_match = re.search(r'BuildingSurface:Detailed,\s*(.*?)\s*,', item, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r'FenestrationSurface:Detailed,\s*(.*?)\s*,', item, re.IGNORECASE)
            if not name_match:
                name_match = re.search(r'Shading:.*?,\s*(.*?)\s*,', item, re.IGNORECASE)
            
            surface_name = name_match.group(1).strip() if name_match else f'Surface_{index}'
            
            # Extract vertices
            # The "Number of Vertices" field in IDF can be blank (just a comma)
            # We need to handle both cases:
            # 1. When there's a number: "4, !- Number of Vertices"
            # 2. When it's blank: ", !- Number of Vertices"
            
            # Look for the "Number of Vertices" comment, then capture everything after (including newlines)
            # The pattern should match the comma and comment, then capture all vertices until semicolon
            vertices_section_match = re.search(
                r'!-\s*number of vertices\s*\n?(.*?)(?:;|\Z)', 
                item, 
                re.DOTALL | re.IGNORECASE
            )
            
            if not vertices_section_match:
                logger.warning(f"Surface {surface_name}: No 'Number of Vertices' comment found")
                return None
            
            vertices_section = vertices_section_match.group(1)  # Everything after the comment
            
            # Remove inline comments (anything with !- )
            vertices_section_cleaned = re.sub(r'!-[^,\n]*', '', vertices_section)
            vertices_section_cleaned = vertices_section_cleaned.replace(';', '')
            
            # Split by comma and convert to floats, filtering out empty strings
            coords_str = [x.strip() for x in vertices_section_cleaned.split(',') if x.strip()]
            
            # Log for debugging
            logger.debug(f"Surface {surface_name}: Found {len(coords_str)} coordinate values")
            
            try:
                coords = [float(x) for x in coords_str]
            except ValueError as e:
                logger.error(f"Surface {surface_name}: Failed to convert coordinates to float: {e}")
                return None
            
            # Group into [x, y, z] triplets
            vertices = []
            for i in range(0, len(coords), 3):
                if i + 2 < len(coords):  # Ensure we have all 3 coordinates
                    vertices.append([coords[i], coords[i+1], coords[i+2]])
                else:
                    logger.warning(f"Surface {surface_name}: Incomplete vertex at position {i} (only {len(coords) - i} values remaining)")
            
            if len(vertices) < 3:
                logger.warning(f"Surface {surface_name}: Has only {len(vertices)} vertices, need at least 3")
                return None
            
            logger.debug(f"Surface {surface_name}: Successfully parsed {len(vertices)} vertices")
            
            # Get color for this surface type
            color = self.COLORS.get(surface_type, self.COLORS['undefined'])
            
            # Validate window geometry
            if surface_type == 'window' and len(vertices) != 4:
                logger.warning(f"Window '{surface_name}' has {len(vertices)} vertices (expected 4)")
            
            return {
                'name': surface_name,
                'type': surface_type,
                'zone': zone_name,
                'color': color,
                'vertices': vertices,
                'index': index
            }
            
        except Exception as e:
            logger.error(f"Error parsing surface item {index}: {e}")
            return None
