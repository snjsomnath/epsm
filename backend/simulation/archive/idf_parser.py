import os
from pathlib import Path
import tempfile
import logging

logger = logging.getLogger(__name__)

try:
    from eppy import modeleditor
    from eppy.modeleditor import IDF
    EPPY_AVAILABLE = True
except ImportError:
    EPPY_AVAILABLE = False
    logger.warning("Eppy not available, using simplified parser")

class EnergyPlusIDFParser:
    def __init__(self):
        self.idd_file_path = None
        self.setup_idd()
    
    def setup_idd(self):
        """Setup the IDD file for eppy"""
        if not EPPY_AVAILABLE:
            return
            
        # Look for IDD file in the backend directory
        backend_dir = Path(__file__).parent.parent
        idd_path = backend_dir / "Energy+.idd"
        
        if idd_path.exists():
            self.idd_file_path = str(idd_path)
            try:
                # Set the IDD file for eppy
                IDF.setiddname(self.idd_file_path)
                logger.info(f"IDD file set to: {self.idd_file_path}")
            except Exception as e:
                logger.error(f"Failed to set IDD file: {e}")
                self.idd_file_path = None
        else:
            logger.warning(f"IDD file not found at {idd_path}")
    
    def parse(self, idf_content):
        """Parse IDF content and extract relevant information"""
        if not EPPY_AVAILABLE or not self.idd_file_path:
            return self._simple_parse(idf_content)
        
        return self._eppy_parse(idf_content)
    
    def _eppy_parse(self, idf_content):
        """Parse using eppy for full IDF analysis"""
        try:
            # Create temporary file for the IDF content
            with tempfile.NamedTemporaryFile(mode='w', suffix='.idf', delete=False) as temp_file:
                temp_file.write(idf_content)
                temp_file_path = temp_file.name
            
            try:
                # Load the IDF file using eppy
                idf = IDF(temp_file_path)
                
                # Extract building information
                buildings = idf.idfobjects['BUILDING']
                building_info = {}
                if buildings:
                    building = buildings[0]
                    building_info = {
                        'name': getattr(building, 'Name', 'Unknown'),
                        'north_axis': getattr(building, 'North_Axis', 0),
                        'terrain': getattr(building, 'Terrain', 'Unknown'),
                        'loads_convergence_tolerance': getattr(building, 'Loads_Convergence_Tolerance_Value', 0.04),
                        'temperature_convergence_tolerance': getattr(building, 'Temperature_Convergence_Tolerance_Value', 0.4)
                    }
                
                # Extract zones
                zones = []
                zone_objects = idf.idfobjects['ZONE']
                for zone in zone_objects:
                    zones.append({
                        'name': getattr(zone, 'Name', 'Unknown'),
                        'direction_of_relative_north': getattr(zone, 'Direction_of_Relative_North', 0),
                        'x_origin': getattr(zone, 'X_Origin', 0),
                        'y_origin': getattr(zone, 'Y_Origin', 0),
                        'z_origin': getattr(zone, 'Z_Origin', 0),
                        'type': getattr(zone, 'Type', 1),
                        'multiplier': getattr(zone, 'Multiplier', 1)
                    })
                
                # Extract materials
                materials = []
                
                # Regular materials
                material_objects = idf.idfobjects.get('MATERIAL', [])
                for material in material_objects:
                    materials.append({
                        'name': getattr(material, 'Name', 'Unknown'),
                        'type': 'Material',
                        'roughness': getattr(material, 'Roughness', 'Unknown'),
                        'thickness': getattr(material, 'Thickness', 0),
                        'conductivity': getattr(material, 'Conductivity', 0),
                        'density': getattr(material, 'Density', 0),
                        'specific_heat': getattr(material, 'Specific_Heat', 0),
                        'thermal_absorptance': getattr(material, 'Thermal_Absorptance', 0.9),
                        'solar_absorptance': getattr(material, 'Solar_Absorptance', 0.7),
                        'visible_absorptance': getattr(material, 'Visible_Absorptance', 0.7)
                    })
                
                # No-mass materials
                nomass_objects = idf.idfobjects.get('MATERIAL:NOMASS', [])
                for material in nomass_objects:
                    materials.append({
                        'name': getattr(material, 'Name', 'Unknown'),
                        'type': 'Material:NoMass',
                        'roughness': getattr(material, 'Roughness', 'Unknown'),
                        'thermal_resistance': getattr(material, 'Thermal_Resistance', 0),
                        'thermal_absorptance': getattr(material, 'Thermal_Absorptance', 0.9),
                        'solar_absorptance': getattr(material, 'Solar_Absorptance', 0.7),
                        'visible_absorptance': getattr(material, 'Visible_Absorptance', 0.7)
                    })
                
                # Air gap materials
                airgap_objects = idf.idfobjects.get('MATERIAL:AIRGAP', [])
                for material in airgap_objects:
                    materials.append({
                        'name': getattr(material, 'Name', 'Unknown'),
                        'type': 'Material:AirGap',
                        'thermal_resistance': getattr(material, 'Thermal_Resistance', 0)
                    })
                
                # Extract constructions
                constructions = []
                construction_objects = idf.idfobjects.get('CONSTRUCTION', [])
                for construction in construction_objects:
                    layers = []
                    # Get all layer fields (Outside_Layer, Layer_2, Layer_3, etc.)
                    for i, field in enumerate(construction.fieldnames):
                        if field.startswith('Layer') or field == 'Outside_Layer':
                            layer_value = getattr(construction, field, None)
                            if layer_value:
                                layers.append(layer_value)
                    
                    constructions.append({
                        'name': getattr(construction, 'Name', 'Unknown'),
                        'layers': layers
                    })
                
                # Extract surfaces
                surfaces = []
                surface_objects = idf.idfobjects.get('BUILDINGSURFACE:DETAILED', [])
                for surface in surface_objects:
                    surfaces.append({
                        'name': getattr(surface, 'Name', 'Unknown'),
                        'surface_type': getattr(surface, 'Surface_Type', 'Unknown'),
                        'construction_name': getattr(surface, 'Construction_Name', 'Unknown'),
                        'zone_name': getattr(surface, 'Zone_Name', 'Unknown'),
                        'outside_boundary_condition': getattr(surface, 'Outside_Boundary_Condition', 'Unknown'),
                        'sun_exposure': getattr(surface, 'Sun_Exposure', 'SunExposed'),
                        'wind_exposure': getattr(surface, 'Wind_Exposure', 'WindExposed')
                    })
                
                # Extract version
                version_info = {}
                version_objects = idf.idfobjects.get('VERSION', [])
                if version_objects:
                    version_info = {
                        'version_identifier': getattr(version_objects[0], 'Version_Identifier', 'Unknown')
                    }
                
                return {
                    'success': True,
                    'parser_type': 'eppy',
                    'building': building_info,
                    'zones': zones,
                    'materials': materials,
                    'constructions': constructions,
                    'surfaces': surfaces,
                    'version': version_info,
                    'summary': {
                        'total_zones': len(zones),
                        'total_materials': len(materials),
                        'total_constructions': len(constructions),
                        'total_surfaces': len(surfaces)
                    }
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            logger.error(f"Error parsing IDF with eppy: {e}")
            # Fall back to simple parser
            return self._simple_parse(idf_content)
    
    def _simple_parse(self, idf_content):
        """Fallback simple parser when eppy is not available"""
        lines = idf_content.split('\n')
        
        # Simple parsing logic
        materials = []
        zones = []
        constructions = []
        surfaces = []
        building_info = {}
        version_info = {}
        
        current_object = None
        current_fields = []
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('!'):
                continue
            
            if line.upper().startswith('MATERIAL,'):
                current_object = 'MATERIAL'
                current_fields = [line.replace('MATERIAL,', '').strip()]
            elif line.upper().startswith('ZONE,'):
                current_object = 'ZONE'
                current_fields = [line.replace('ZONE,', '').strip()]
            elif line.upper().startswith('BUILDING,'):
                current_object = 'BUILDING'
                current_fields = [line.replace('BUILDING,', '').strip()]
            elif line.upper().startswith('VERSION,'):
                current_object = 'VERSION'
                current_fields = [line.replace('VERSION,', '').strip()]
            elif line.endswith(';'):
                # End of object
                if current_object and current_fields:
                    if line != ';':
                        current_fields.append(line.replace(';', '').strip())
                    
                    if current_object == 'MATERIAL' and current_fields:
                        # Heuristic: IDF MATERIAL fields are ordered as
                        # Name, Roughness, Thickness, Conductivity, Density, Specific Heat,
                        # Thermal Absorptance, Solar Absorptance, Visible Absorptance
                        vals = [v for v in current_fields]
                        name = vals[0] if len(vals) > 0 else 'Unknown'
                        roughness = vals[1] if len(vals) > 1 else None
                        def _to_float(v):
                            try:
                                return float(str(v).strip())
                            except Exception:
                                return None

                        thickness = _to_float(vals[2]) if len(vals) > 2 else None
                        conductivity = _to_float(vals[3]) if len(vals) > 3 else None
                        density = _to_float(vals[4]) if len(vals) > 4 else None
                        specific_heat = _to_float(vals[5]) if len(vals) > 5 else None
                        thermal_absorptance = _to_float(vals[6]) if len(vals) > 6 else None
                        solar_absorptance = _to_float(vals[7]) if len(vals) > 7 else None
                        visible_absorptance = _to_float(vals[8]) if len(vals) > 8 else None

                        materials.append({
                            'name': name,
                            'type': 'Material',
                            'roughness': roughness,
                            'thickness': thickness,
                            'conductivity': conductivity,
                            'density': density,
                            'specific_heat': specific_heat,
                            'thermal_absorptance': thermal_absorptance,
                            'solar_absorptance': solar_absorptance,
                            'visible_absorptance': visible_absorptance,
                        })
                    elif current_object == 'ZONE' and current_fields:
                        zones.append({
                            'name': current_fields[0] if current_fields else 'Unknown',
                            'fields': current_fields
                        })
                    elif current_object == 'BUILDING' and current_fields:
                        building_info = {
                            'name': current_fields[0] if current_fields else 'Unknown',
                            'fields': current_fields
                        }
                    elif current_object == 'VERSION' and current_fields:
                        version_info = {
                            'version_identifier': current_fields[0] if current_fields else 'Unknown'
                        }
                
                current_object = None
                current_fields = []
            else:
                if current_object:
                    current_fields.append(line.replace(',', '').strip())
        
        return {
            'success': True,
            'parser_type': 'simple',
            'building': building_info,
            'zones': zones,
            'materials': materials,
            'constructions': constructions,
            'surfaces': surfaces,
            'version': version_info,
            'summary': {
                'total_zones': len(zones),
                'total_materials': len(materials),
                'total_constructions': len(constructions),
                'total_surfaces': len(surfaces)
            }
        }