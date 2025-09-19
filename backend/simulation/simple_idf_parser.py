import re
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class Material:
    name: str
    thickness: float
    conductivity: float
    density: float
    specific_heat: float
    roughness: str = "MediumRough"
    thermal_absorptance: float = 0.9
    solar_absorptance: float = 0.7
    visible_absorptance: float = 0.7

@dataclass
class Construction:
    name: str
    layers: List[str]
    element_type: str = "wall"

@dataclass
class Zone:
    name: str
    area: Optional[float] = None
    volume: Optional[float] = None
    ceiling_height: Optional[float] = None

class SimpleIdfParser:
    """Simplified IDF parser that doesn't require eppy or local EnergyPlus installation"""
    
    def __init__(self, content: str):
        self.content = content
        self.materials: Dict[str, Material] = {}
        self.constructions: Dict[str, Construction] = {}
        self.zones: Dict[str, Zone] = {}
        self._parse_content()

    def _parse_content(self):
        """Parse IDF content using regex patterns"""
        lines = self.content.split('\n')
        current_object = []
        object_type = None
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('!'):
                continue
                
            # Check if this is the start of a new object
            if ',' in line and not current_object:
                # Extract object type (everything before the first comma)
                object_type = line.split(',')[0].strip()
                current_object = [line]
            elif current_object:
                current_object.append(line)
                # Check if this line ends the object (ends with semicolon)
                if line.rstrip().endswith(';'):
                    if object_type:  # Ensure object_type is not None
                        self._parse_object(object_type, current_object)
                    current_object = []
                    object_type = None

    def _parse_object(self, object_type: str, lines: List[str]):
        """Parse a specific IDF object"""
        if object_type.upper() == 'MATERIAL':
            self._parse_material(lines)
        elif object_type.upper() == 'CONSTRUCTION':
            self._parse_construction(lines)
        elif object_type.upper() == 'ZONE':
            self._parse_zone(lines)

    def _parse_material(self, lines: List[str]):
        """Parse a Material object"""
        try:
            # Join all lines and parse fields
            full_text = ' '.join(lines)
            # Remove comments and split by commas
            parts = []
            for part in full_text.split(','):
                # Remove comments (everything after !)
                clean_part = part.split('!')[0].strip()
                if clean_part and clean_part != ';':
                    parts.append(clean_part.rstrip(';'))
            
            if len(parts) >= 6:  # Minimum required fields
                name = parts[1].strip()
                roughness = parts[2].strip() if len(parts) > 2 else "MediumRough"
                thickness = float(parts[3]) if len(parts) > 3 else 0.1
                conductivity = float(parts[4]) if len(parts) > 4 else 0.1
                density = float(parts[5]) if len(parts) > 5 else 1000.0
                specific_heat = float(parts[6]) if len(parts) > 6 else 1000.0
                thermal_absorptance = float(parts[7]) if len(parts) > 7 else 0.9
                solar_absorptance = float(parts[8]) if len(parts) > 8 else 0.7
                visible_absorptance = float(parts[9]) if len(parts) > 9 else 0.7
                
                material = Material(
                    name=name,
                    thickness=thickness,
                    conductivity=conductivity,
                    density=density,
                    specific_heat=specific_heat,
                    roughness=roughness,
                    thermal_absorptance=thermal_absorptance,
                    solar_absorptance=solar_absorptance,
                    visible_absorptance=visible_absorptance
                )
                self.materials[name] = material
        except (ValueError, IndexError) as e:
            print(f"Error parsing material: {e}")

    def _parse_construction(self, lines: List[str]):
        """Parse a Construction object"""
        try:
            full_text = ' '.join(lines)
            parts = []
            for part in full_text.split(','):
                clean_part = part.split('!')[0].strip()
                if clean_part and clean_part != ';':
                    parts.append(clean_part.rstrip(';'))
            
            if len(parts) >= 2:
                name = parts[1].strip()
                layers = [parts[i].strip() for i in range(2, len(parts)) if parts[i].strip()]
                
                construction = Construction(
                    name=name,
                    layers=layers,
                    element_type="wall"  # Default type
                )
                self.constructions[name] = construction
        except (ValueError, IndexError) as e:
            print(f"Error parsing construction: {e}")

    def _parse_zone(self, lines: List[str]):
        """Parse a Zone object"""
        try:
            full_text = ' '.join(lines)
            parts = []
            for part in full_text.split(','):
                clean_part = part.split('!')[0].strip()
                if clean_part and clean_part != ';':
                    parts.append(clean_part.rstrip(';'))
            
            if len(parts) >= 2:
                name = parts[1].strip()
                
                # Try to extract ceiling height and volume if available
                ceiling_height = None
                volume = None
                if len(parts) > 8:
                    try:
                        ceiling_height = float(parts[8]) if parts[8].strip().lower() != 'autocalculate' else None
                    except (ValueError, IndexError):
                        pass
                if len(parts) > 9:
                    try:
                        volume = float(parts[9]) if parts[9].strip().lower() != 'autocalculate' else None
                    except (ValueError, IndexError):
                        pass
                
                zone = Zone(
                    name=name,
                    ceiling_height=ceiling_height,
                    volume=volume
                )
                self.zones[name] = zone
        except (ValueError, IndexError) as e:
            print(f"Error parsing zone: {e}")

    def parse(self) -> Dict:
        """Parse the IDF content and return structured data"""
        materials_list = []
        for material in self.materials.values():
            materials_list.append({
                'name': material.name,
                'thickness': material.thickness,
                'conductivity': material.conductivity,
                'density': material.density,
                'specific_heat': material.specific_heat,
                'roughness': material.roughness,
                'thermal_absorptance': material.thermal_absorptance,
                'solar_absorptance': material.solar_absorptance,
                'visible_absorptance': material.visible_absorptance
            })
        
        constructions_list = []
        for construction in self.constructions.values():
            constructions_list.append({
                'name': construction.name,
                'layers': construction.layers,
                'element_type': construction.element_type
            })
        
        zones_list = []
        for zone in self.zones.values():
            zones_list.append({
                'name': zone.name,
                'area': zone.area,
                'volume': zone.volume,
                'ceiling_height': zone.ceiling_height
            })
        
        return {
            'materials': materials_list,
            'constructions': constructions_list,
            'zones': zones_list,
            'summary': self.get_summary()
        }

    def get_materials(self) -> List[Material]:
        """Get all parsed materials"""
        return list(self.materials.values())

    def get_constructions(self) -> List[Construction]:
        """Get all parsed constructions"""
        return list(self.constructions.values())

    def get_zones(self) -> List[Zone]:
        """Get all parsed zones"""
        return list(self.zones.values())

    def get_summary(self) -> Dict:
        """Get a summary of parsed content"""
        return {
            'materials_count': len(self.materials),
            'constructions_count': len(self.constructions),
            'zones_count': len(self.zones),
            'materials': [m.name for m in self.materials.values()],
            'constructions': [c.name for c in self.constructions.values()],
            'zones': [z.name for z in self.zones.values()]
        }

# For backward compatibility
IdfParser = SimpleIdfParser