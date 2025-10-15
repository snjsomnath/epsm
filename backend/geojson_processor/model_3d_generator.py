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
    
    # Surface type colors (aesthetic and logical)
    COLORS = {
        'ceiling': '#f5f5f5',      # Light gray (interior ceiling)
        'door': '#8B4513',         # Saddle brown (wood door)
        'floor': '#D2B48C',        # Tan (flooring material)
        'glassdoor': '#87CEEB',    # Sky blue (glass with tint)
        'wall': '#F5DEB3',         # Wheat/beige (typical wall color)
        'roof': '#8B4513',         # Saddle brown (roof material)
        'roofceiling': '#CD853F',  # Peru (roof/ceiling combo)
        'shade': '#A9A9A9',        # Dark gray (context buildings)
        'window': '#B0E0E6',       # Powder blue (glass/transparent)
        'undefined': '#FF69B4',    # Hot pink (to highlight errors)
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
            
            # Offset windows to prevent z-fighting
            surfaces_data = self._offset_windows(surfaces_data)
            
            # Count surfaces needing triangulation
            triangulation_count = sum(1 for s in surfaces_data if s.get('needs_triangulation', False))
            max_vertices = max(len(s['vertices']) for s in surfaces_data) if surfaces_data else 0
            
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
                    'uses_multipliers': len(multipliers) > 0,
                    'triangulation_needed': triangulation_count,
                    'max_vertices': max_vertices
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
            if triangulation_count > 0:
                logger.info(f"Note: {triangulation_count} surfaces with >4 vertices need triangulation (max: {max_vertices} vertices)")
            
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
        
        # First pass: parse all surfaces
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
        
        # Second pass: assign zones to windows based on parent surfaces
        surface_zone_map = {s['name']: s['zone'] for s in surfaces_data if s['type'] not in ['window', 'glassdoor']}
        
        for surface in surfaces_data:
            if surface['type'] in ['window', 'glassdoor'] and 'parent_surface' in surface:
                parent_name = surface['parent_surface']
                if parent_name in surface_zone_map:
                    original_zone = surface['zone']
                    surface['zone'] = surface_zone_map[parent_name]
                    logger.debug(f"Window '{surface['name']}' zone updated from '{original_zone}' to '{surface['zone']}' (from parent '{parent_name}')")
        
        # Third pass: Generate caps for shade/context buildings
        shade_surfaces = [s for s in surfaces_data if s['type'] == 'shade']
        if shade_surfaces:
            logger.info(f"Generating caps for {len(shade_surfaces)} shade surfaces...")
            cap_surfaces = self._generate_shade_caps(shade_surfaces)
            if cap_surfaces:
                surfaces_data.extend(cap_surfaces)
                logger.info(f"Added {len(cap_surfaces)} cap surfaces for context buildings")
        
        return surfaces_data
    
    def _generate_shade_caps(self, shade_surfaces: List[Dict]) -> List[Dict]:
        """
        Generate top and bottom cap surfaces for shade/context buildings.
        
        Shade surfaces are typically named like Building0_0, Building0_1, etc.
        where the number before underscore is the building ID and after is the wall index.
        This method groups surfaces by building and creates horizontal caps.
        
        Args:
            shade_surfaces: List of shade surface dictionaries
        
        Returns:
            List of cap surface dictionaries (top and bottom for each building)
        """
        import re
        
        # Group shade surfaces by building (extract building ID from name)
        buildings = {}
        for surface in shade_surfaces:
            name = surface['name']
            # Match pattern like "Building0_0" or "Building123_5"
            match = re.match(r'(Building\d+)_\d+', name)
            if match:
                building_id = match.group(1)
                if building_id not in buildings:
                    buildings[building_id] = []
                buildings[building_id].append(surface)
            else:
                # If name doesn't match pattern, use as-is (e.g., generic shading)
                if 'other' not in buildings:
                    buildings['other'] = []
                buildings['other'].append(surface)
        
        logger.info(f"Found {len(buildings)} context buildings to cap")
        
        cap_surfaces = []
        
        for building_id, surfaces in buildings.items():
            # Collect all Z-coordinates to find min/max height
            all_z = []
            
            for surface in surfaces:
                for vertex in surface['vertices']:
                    all_z.append(vertex[2])
            
            if len(all_z) < 4:
                continue
            
            min_z = min(all_z)
            max_z = max(all_z)
            height = max_z - min_z
            
            # Extract footprint by tracing edges at each height level
            bottom_polygon = self._trace_building_footprint(surfaces, min_z)
            top_polygon = self._trace_building_footprint(surfaces, max_z)
            
            # Create bottom cap (floor)
            if bottom_polygon and len(bottom_polygon) >= 3:
                bottom_cap = self._create_cap_polygon(
                    bottom_polygon, min_z, f"{building_id}_cap_bottom", reverse=True
                )
                if bottom_cap:
                    cap_surfaces.append(bottom_cap)
            
            # Create top cap (roof)
            if top_polygon and len(top_polygon) >= 3:
                top_cap = self._create_cap_polygon(
                    top_polygon, max_z, f"{building_id}_cap_top", reverse=False
                )
                if top_cap:
                    cap_surfaces.append(top_cap)
            
            logger.info(f"{building_id}: height={height:.2f}m, bottom_pts={len(bottom_polygon) if bottom_polygon else 0}, top_pts={len(top_polygon) if top_polygon else 0}")
        
        return cap_surfaces
    
    def _trace_building_footprint(self, wall_surfaces: List[Dict], z_height: float) -> Optional[List[tuple]]:
        """
        Trace the building footprint at a given height by following connected edges.
        
        This method extracts horizontal edges from vertical wall surfaces at the specified
        height and orders them to form a proper polygon outline (works for concave shapes).
        
        Args:
            wall_surfaces: List of wall surface dictionaries
            z_height: Z-coordinate to extract footprint at
        
        Returns:
            Ordered list of (x, y) points forming the footprint, or None if failed
        """
        tolerance = 0.1
        edges = []
        
        # Extract all edges at the specified height from wall surfaces
        # Wall surfaces typically have vertices in a pattern like: top1, bottom1, bottom2, top2
        # So we need to check ALL vertex pairs, not just consecutive ones
        for surface in wall_surfaces:
            vertices = surface['vertices']
            
            # Check all possible edges between vertices at the target height
            height_vertices = []
            for i, v in enumerate(vertices):
                if abs(v[2] - z_height) < tolerance:
                    height_vertices.append((i, v))
            
            # If we have 2 vertices at this height, they form an edge
            if len(height_vertices) == 2:
                v1 = height_vertices[0][1]
                v2 = height_vertices[1][1]
                edge = ((v1[0], v1[1]), (v2[0], v2[1]))
                edges.append(edge)
        
        logger.debug(f"Found {len(edges)} edges at height {z_height:.2f}")
        
        if len(edges) < 3:
            logger.warning(f"Not enough edges ({len(edges)}) to form polygon at height {z_height:.2f}")
            return None
        
        # Build polygon by connecting edges in order
        polygon = []
        remaining_edges = edges.copy()
        
        # Start with first edge
        current_edge = remaining_edges.pop(0)
        polygon.append(current_edge[0])
        polygon.append(current_edge[1])
        current_point = current_edge[1]
        
        # Connect edges by finding matching endpoints
        max_iterations = len(edges) * 2  # Safety limit
        iterations = 0
        
        while remaining_edges and iterations < max_iterations:
            iterations += 1
            found = False
            
            for i, edge in enumerate(remaining_edges):
                # Check if edge connects to current point (with small tolerance)
                if self._points_equal(edge[0], current_point, tolerance=0.01):
                    polygon.append(edge[1])
                    current_point = edge[1]
                    remaining_edges.pop(i)
                    found = True
                    break
                elif self._points_equal(edge[1], current_point, tolerance=0.01):
                    polygon.append(edge[0])
                    current_point = edge[0]
                    remaining_edges.pop(i)
                    found = True
                    break
            
            if not found:
                # Can't find connecting edge, might be complete
                logger.debug(f"Could not find connecting edge after {len(polygon)} points")
                break
        
        # Remove duplicate points (first and last should be same)
        if len(polygon) > 0 and self._points_equal(polygon[0], polygon[-1], tolerance=0.01):
            polygon = polygon[:-1]
        
        logger.debug(f"Traced polygon with {len(polygon)} points")
        
        return polygon if len(polygon) >= 3 else None
    
    def _points_equal(self, p1: tuple, p2: tuple, tolerance: float = 0.01) -> bool:
        """Check if two 2D points are equal within tolerance."""
        return abs(p1[0] - p2[0]) < tolerance and abs(p1[1] - p2[1]) < tolerance
    
    def _create_cap_polygon(
        self, 
        points_2d: List[tuple], 
        z_height: float, 
        name: str,
        reverse: bool = False
    ) -> Optional[Dict]:
        """
        Create a horizontal cap surface from ordered 2D footprint points.
        
        Args:
            points_2d: Ordered list of (x, y) tuples forming the footprint perimeter
            z_height: Z-coordinate for the cap
            name: Name for the surface
            reverse: If True, reverse vertex order (for bottom face pointing down)
        
        Returns:
            Surface dictionary or None if creation failed
        """
        if len(points_2d) < 3:
            return None
        
        # Points are already ordered from edge tracing, no need to sort
        ordered_points = list(points_2d)
        
        # Reverse winding order for bottom faces (normal pointing down)
        if reverse:
            ordered_points = ordered_points[::-1]
        
        # Create 3D vertices with the height
        vertices = [[x, y, z_height] for x, y in ordered_points]
        
        return {
            'name': name,
            'type': 'shade',
            'zone': 'exterior',
            'color': self.COLORS.get('shade', '#888888'),
            'vertices': vertices,
            'index': -1,  # Special index for generated surfaces
            'needs_triangulation': len(vertices) > 4
        }
    
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
        # Also reduce precision to 2 decimal places for smaller file size and better performance
        for surface in surfaces_data:
            normalized_vertices = []
            for vertex in surface['vertices']:
                normalized_vertices.append([
                    round(vertex[0] - center_x, 2),  # X stays X, reduced precision
                    round(vertex[2] - center_z, 2),  # Z becomes Y (up), reduced precision
                    round(vertex[1] - center_y, 2)   # Y becomes Z (depth), reduced precision
                ])
            surface['vertices'] = normalized_vertices
        
        logger.info("Coordinates normalized to origin, converted to Three.js coordinate system, and precision reduced to 2 decimals")
        return surfaces_data
    
    def _offset_windows(self, surfaces_data: List[Dict]) -> List[Dict]:
        """
        Offset windows slightly along their surface normal to prevent z-fighting with walls.
        
        Windows are coplanar with walls in EnergyPlus, which causes rendering artifacts
        (z-fighting) in 3D viewers. This method calculates the surface normal and offsets
        window vertices by a small amount (0.05 units) away from the wall.
        
        Args:
            surfaces_data: List of surface dictionaries with vertices
        
        Returns:
            Updated surfaces_data with offset window positions
        """
        window_count = 0
        offset_distance = 0.05  # Small offset to prevent z-fighting (5cm in meters)
        
        for surface in surfaces_data:
            # Only offset windows and glass doors
            if surface['type'] not in ['window', 'glassdoor']:
                continue
            
            vertices = surface['vertices']
            
            # Need at least 3 vertices to calculate normal
            if len(vertices) < 3:
                logger.warning(f"Window '{surface['name']}' has less than 3 vertices, skipping offset")
                continue
            
            # Calculate surface normal using cross product of two edges
            # Using first 3 vertices: v0, v1, v2
            v0 = vertices[0]
            v1 = vertices[1]
            v2 = vertices[2]
            
            # Edge vectors
            edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]]
            edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
            
            # Cross product to get normal
            normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0]
            ]
            
            # Normalize the normal vector
            magnitude = (normal[0]**2 + normal[1]**2 + normal[2]**2)**0.5
            if magnitude == 0:
                logger.warning(f"Window '{surface['name']}' has degenerate geometry, skipping offset")
                continue
            
            normal = [normal[0]/magnitude, normal[1]/magnitude, normal[2]/magnitude]
            
            # IMPORTANT: In EnergyPlus, fenestration surfaces have normals pointing inward
            # We need to reverse the normal to offset windows outward (away from building interior)
            normal = [-normal[0], -normal[1], -normal[2]]
            
            # Offset all vertices along the (reversed) normal
            offset_vertices = []
            for vertex in vertices:
                offset_vertices.append([
                    vertex[0] + normal[0] * offset_distance,
                    vertex[1] + normal[1] * offset_distance,
                    vertex[2] + normal[2] * offset_distance
                ])
            
            surface['vertices'] = offset_vertices
            window_count += 1
            
            logger.debug(f"Offset window '{surface['name']}' by {offset_distance} units along normal {normal}")
        
        if window_count > 0:
            logger.info(f"Offset {window_count} windows/glass doors to prevent z-fighting")
        
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
            
            # For windows, extract parent surface name
            parent_surface = None
            if 'FenestrationSurface' in item:
                parent_match = re.search(r'(.*?)\s*,?\s*!-\s*Building Surface Name', item, re.IGNORECASE)
                if parent_match:
                    parent_surface = parent_match.group(1).split(',')[-1].strip()
            
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
            
            # Flag surfaces that might need triangulation (> 4 vertices)
            needs_triangulation = len(vertices) > 4
            
            surface_data = {
                'name': surface_name,
                'type': surface_type,
                'zone': zone_name,
                'color': color,
                'vertices': vertices,
                'index': index,
                'needs_triangulation': needs_triangulation
            }
            
            # Add parent surface reference for windows
            if parent_surface:
                surface_data['parent_surface'] = parent_surface
            
            return surface_data
            
        except Exception as e:
            logger.error(f"Error parsing surface item {index}: {e}")
            return None
