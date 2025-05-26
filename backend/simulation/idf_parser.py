```python
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

class IdfParser:
    def __init__(self, content: str):
        self.content = content
        self.materials: Dict[str, Material] = {}
        self.constructions: Dict[str, Construction] = {}
        self.zones: Dict[str, Zone] = {}

    def parse(self) -> Dict:
        """Parse IDF content and extract components."""
        self._parse_materials()
        self._parse_constructions()
        self._parse_zones()
        
        return {
            "materials": [
                {
                    "id": name,
                    "name": name,
                    "type": "Material",
                    "properties": {
                        "thickness": mat.thickness,
                        "conductivity": mat.conductivity,
                        "density": mat.density,
                        "specificHeat": mat.specific_heat,
                        "roughness": mat.roughness,
                        "thermalAbsorptance": mat.thermal_absorptance,
                        "solarAbsorptance": mat.solar_absorptance,
                        "visibleAbsorptance": mat.visible_absorptance
                    }
                }
                for name, mat in self.materials.items()
            ],
            "constructions": [
                {
                    "id": name,
                    "name": name,
                    "type": const.element_type,
                    "properties": {
                        "layers": const.layers
                    }
                }
                for name, const in self.constructions.items()
            ],
            "zones": [
                {
                    "id": name,
                    "name": name,
                    "type": "Zone",
                    "properties": {
                        "area": zone.area,
                        "volume": zone.volume,
                        "ceilingHeight": zone.ceiling_height
                    }
                }
                for name, zone in self.zones.items()
            ]
        }

    def _parse_materials(self):
        """Extract material definitions from IDF content."""
        material_pattern = re.compile(
            r'Material,\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+)',
            re.IGNORECASE | re.MULTILINE
        )
        
        for match in material_pattern.finditer(self.content):
            name = match.group(1).strip()
            self.materials[name] = Material(
                name=name,
                roughness=match.group(2).strip(),
                thickness=float(match.group(3)),
                conductivity=float(match.group(4)),
                density=float(match.group(5)),
                specific_heat=float(match.group(6))
            )

    def _parse_constructions(self):
        """Extract construction definitions from IDF content."""
        construction_pattern = re.compile(
            r'Construction,\s*([^,]+)((?:,\s*[^,]+)*)',
            re.IGNORECASE | re.MULTILINE
        )
        
        for match in construction_pattern.finditer(self.content):
            name = match.group(1).strip()
            layers = [
                layer.strip() 
                for layer in match.group(2).split(',') 
                if layer.strip()
            ]
            
            # Determine element type based on name or first material
            element_type = "wall"  # default
            name_lower = name.lower()
            if "roof" in name_lower or "ceiling" in name_lower:
                element_type = "roof"
            elif "floor" in name_lower:
                element_type = "floor"
            elif "window" in name_lower or "glazing" in name_lower:
                element_type = "window"
            
            self.constructions[name] = Construction(
                name=name,
                layers=layers,
                element_type=element_type
            )

    def _parse_zones(self):
        """Extract zone definitions from IDF content."""
        zone_pattern = re.compile(
            r'Zone,\s*([^,]+)(?:,\s*[^,]*)*',
            re.IGNORECASE | re.MULTILINE
        )
        
        for match in zone_pattern.finditer(self.content):
            name = match.group(1).strip()
            self.zones[name] = Zone(name=name)
```