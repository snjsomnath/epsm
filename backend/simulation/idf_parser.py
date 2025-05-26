from eppy.modeleditor import IDF
from eppy.runner.run_functions import install_paths, paths
from typing import Dict, List, Optional
from dataclasses import dataclass
import os

# Configure eppy paths
install_paths(
    eplus_path=os.getenv('ENERGYPLUS_PATH', '/usr/local/EnergyPlus-23-2-0'),
    idd_path=None  # Will use default IDD from EnergyPlus installation
)

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
        
        # Create a temporary file for eppy
        self.temp_path = "temp.idf"
        with open(self.temp_path, "w") as f:
            f.write(content)
        
        # Initialize IDF object
        self.idf = IDF(self.temp_path)

    def __del__(self):
        # Cleanup temporary file
        if os.path.exists(self.temp_path):
            os.remove(self.temp_path)

    def parse(self) -> Dict:
        """Parse IDF content using eppy and extract components."""
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
        """Extract material definitions using eppy."""
        # Parse regular materials
        for mat in self.idf.idfobjects["MATERIAL"]:
            name = mat.Name
            self.materials[name] = Material(
                name=name,
                roughness=mat.Roughness,
                thickness=float(mat.Thickness),
                conductivity=float(mat.Conductivity),
                density=float(mat.Density),
                specific_heat=float(mat.Specific_Heat),
                thermal_absorptance=float(getattr(mat, "Thermal_Absorptance", 0.9)),
                solar_absorptance=float(getattr(mat, "Solar_Absorptance", 0.7)),
                visible_absorptance=float(getattr(mat, "Visible_Absorptance", 0.7))
            )
        
        # Parse no mass materials
        for mat in self.idf.idfobjects["MATERIAL:NOMASS"]:
            name = mat.Name
            # Convert R-value to approximate properties
            r_value = float(mat.Thermal_Resistance)
            thickness = 0.0254  # 1 inch default thickness
            conductivity = thickness / r_value
            
            self.materials[name] = Material(
                name=name,
                roughness="MediumRough",
                thickness=thickness,
                conductivity=conductivity,
                density=1.0,  # Nominal values for no mass materials
                specific_heat=1.0,
                thermal_absorptance=float(getattr(mat, "Thermal_Absorptance", 0.9)),
                solar_absorptance=float(getattr(mat, "Solar_Absorptance", 0.7)),
                visible_absorptance=float(getattr(mat, "Visible_Absorptance", 0.7))
            )

    def _parse_constructions(self):
        """Extract construction definitions using eppy."""
        for const in self.idf.idfobjects["CONSTRUCTION"]:
            name = const.Name
            layers = []
            
            # Get all layer fields
            for i in range(1, len(const.fieldnames)):
                layer = getattr(const, f"Layer_{i}", None)
                if layer:
                    layers.append(layer)
            
            # Determine element type based on name or usage
            element_type = self._determine_construction_type(name, layers)
            
            self.constructions[name] = Construction(
                name=name,
                layers=layers,
                element_type=element_type
            )

    def _parse_zones(self):
        """Extract zone definitions using eppy."""
        for zone in self.idf.idfobjects["ZONE"]:
            name = zone.Name
            
            # Calculate zone properties if available
            area = None
            volume = None
            ceiling_height = None
            
            if hasattr(zone, "Floor_Area") and zone.Floor_Area:
                area = float(zone.Floor_Area)
            if hasattr(zone, "Volume") and zone.Volume:
                volume = float(zone.Volume)
            if area and volume:
                ceiling_height = volume / area
            
            self.zones[name] = Zone(
                name=name,
                area=area,
                volume=volume,
                ceiling_height=ceiling_height
            )

    def _determine_construction_type(self, name: str, layers: List[str]) -> str:
        """Determine construction type based on name and layer composition."""
        name_lower = name.lower()
        
        # Check name first
        if any(x in name_lower for x in ["roof", "ceiling"]):
            return "roof"
        if "floor" in name_lower:
            return "floor"
        if any(x in name_lower for x in ["window", "glazing"]):
            return "window"
        
        # Check layer composition
        window_materials = ["WINDOWMATERIAL", "GLAZING"]
        if any(any(wm in layer.upper() for wm in window_materials) for layer in layers):
            return "window"
        
        # Default to wall
        return "wall"