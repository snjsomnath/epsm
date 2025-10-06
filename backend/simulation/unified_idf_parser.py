"""
Unified IDF Parser for EnergyPlus
=================================

This module consolidates the two historical parsers in the codebase into **one**
robust implementation that supports both read-only inspection and full editing.

Goals
-----
- Provide a single import point to **parse**, **inspect**, and **edit** IDF
  files (via *eppy* under the hood when available).
- Maintain backwards compatibility with existing callers:
  - `views.py` used `EnergyPlusIDFParser` → now an alias of this class in
    read-only mode.
  - Parametric generators used `IdfParser` / `IdfLite` → unified here with
    deterministic behavior and compatibility helpers.
- Keep the public function `generate_parametric_idfs` **unchanged** so callers
  do not break.

Key Features
------------
- Graceful **fallback** when `eppy` or `Energy+.idd` is not present: returns a
  lightweight summary using text parsing (read-only).
- Thorough extraction of **Materials**, **Constructions**, and **Zones**.
- Construction set insertion that:
  - Ensures referenced materials (opaque vs glazing) exist.
  - Creates `WINDOWMATERIAL:SIMPLEGLAZINGSYSTEM` for simple glazing layers.
  - Ensures unique construction names and remaps surface references.
- Deterministic IDF output (`to_string`) suitable for downstream runs.

Usage
-----
```python
from unified_idf_parser import UnifiedIDFParser, generate_parametric_idfs

# Read-only parsing for summaries (works even without eppy)
parser = UnifiedIDFParser(content_string, read_only=True)
summary = parser.parse()

# Full edit (requires eppy and a valid Energy+.idd)
editor = UnifiedIDFParser(content_string, read_only=False)
editor.insert_construction_set({
    "wall": {"name": "epsm_Wall", "layers": ["Insulation Fiberglass", "Gypsum Board"]},
    "window": {"name": "epsm_Window", "layers": ["Clear 3mm", "Low-E 6mm"]},
})
new_idf = editor.to_string()

# Parametric generation (signature preserved)
parametric_idfs = generate_parametric_idfs(base_idf_content, [ {...}, {...} ])
# -> list of (idf_content, construction_set) tuples
```

Back-compatibility
------------------
- `EnergyPlusIDFParser` is preserved as a thin subclass that defaults to
  read-only mode.
- `IdfParser` is preserved as a thin subclass that defaults to full-edit mode.

"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import os
import re
import tempfile

# --------------------------- Optional eppy import ----------------------------
try:
    from eppy.modeleditor import IDF  # type: ignore
    from eppy.runner.run_functions import install_paths  # type: ignore
    _EPPY_AVAILABLE = True
except Exception:
    IDF = None  # type: ignore
    install_paths = None  # type: ignore
    _EPPY_AVAILABLE = False


# ------------------------------- Data models --------------------------------
@dataclass
class Material:
    name: str
    thickness: Optional[float] = None
    conductivity: Optional[float] = None
    density: Optional[float] = None
    specific_heat: Optional[float] = None
    roughness: str = "MediumRough"
    thermal_absorptance: Optional[float] = 0.9
    solar_absorptance: Optional[float] = 0.7
    visible_absorptance: Optional[float] = 0.7


@dataclass
class Construction:
    name: str
    layers: List[str]
    element_type: str = "wall"  # one of: wall/roof/floor/window


@dataclass
class Zone:
    name: str
    area: Optional[float] = None
    volume: Optional[float] = None
    ceiling_height: Optional[float] = None


# ------------------------------- Utilities ----------------------------------

def _get_energyplus_path() -> str:
    """Resolve EnergyPlus path (where Energy+.idd resides).

    Order of precedence:
    1) ENV `ENERGYPLUS_PATH`
    2) `backend/` directory (repo layout) next to this file
    """
    env_path = os.getenv("ENERGYPLUS_PATH")
    if env_path and os.path.isdir(env_path):
        return env_path
    # fall back to repository backend (Energy+.idd colocated)
    here = os.path.dirname(os.path.abspath(__file__))
    fallback = os.path.normpath(os.path.join(here, ".."))
    return fallback


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None or x == "":
            return None
        return float(x)
    except Exception:
        return None


def _calculate_polygon_area(vertices: List[tuple]) -> float:
    """Calculate the area of a 3D polygon using the Newell method.
    
    This method works correctly regardless of the polygon's orientation in 3D space
    and is not affected by the absolute position of the vertices.
    
    Parameters
    ----------
    vertices : List[tuple]
        List of (x, y, z) coordinate tuples representing polygon vertices.
        
    Returns
    -------
    float
        The area of the polygon in square units.
    """
    if len(vertices) < 3:
        return 0.0
    
    import math
    
    # Use Newell's method to calculate the area vector
    # The magnitude of this vector is twice the polygon area
    n = len(vertices)
    area_vec = [0.0, 0.0, 0.0]
    
    for i in range(n):
        v1 = vertices[i]
        v2 = vertices[(i + 1) % n]
        
        # Cross product components for consecutive edges
        area_vec[0] += (v1[1] - v2[1]) * (v1[2] + v2[2])  # x component
        area_vec[1] += (v1[2] - v2[2]) * (v1[0] + v2[0])  # y component  
        area_vec[2] += (v1[0] - v2[0]) * (v1[1] + v2[1])  # z component
    
    # The area is half the magnitude of the area vector
    area = 0.5 * math.sqrt(area_vec[0]**2 + area_vec[1]**2 + area_vec[2]**2)
    
    return area


# ---------------------------- Unified Parser --------------------------------
class UnifiedIDFParser:
    """A single robust parser that supports *both* read-only inspection and
    full editing of IDF files.

    Parameters
    ----------
    content : str
        Raw IDF text content.
    read_only : bool, default True
        If True, the parser can operate without eppy/IDD and provides a summary
        view only. If False, it requires eppy + a valid Energy+.idd and enables
        editing utilities (construction set insertion, saving, etc.).
    idd_dir : Optional[str]
        Directory that contains `Energy+.idd`. If not provided, we resolve via
        `_get_energyplus_path()`.
    """
    def __init__(self, content: str, *, read_only: bool = True, idd_dir: Optional[str] = None):
        self.content = content or ""
        self.read_only = read_only
        self.materials: Dict[str, Material] = {}
        self.constructions: Dict[str, Construction] = {}
        self.zones: Dict[str, Zone] = {}
        self._idd_dir = idd_dir or _get_energyplus_path()

        self._idf = None  # type: ignore
        self._temp_path = None  # type: ignore
        self._eppy_ready = False

        # Attempt to initialize eppy context when in edit mode (or when available)
        self._init_eppy_if_possible()

    # --- Method stubs (real implementations are attached at module scope) ---
    # These exist to keep static analysis happy; the functions defined later
    # in this module are bound to the class via setattr at the bottom.
    def _init_eppy_if_possible(self) -> None:  # pragma: no cover - stub
        pass

    def _require_eppy(self) -> None:  # pragma: no cover - stub
        pass

    def _parse_lightweight(self) -> None:  # pragma: no cover - stub
        pass

    def _parse_materials_eppy(self) -> None:  # pragma: no cover - stub
        pass

    def _parse_constructions_eppy(self) -> None:  # pragma: no cover - stub
        pass

    def _parse_zones_eppy(self) -> None:  # pragma: no cover - stub
        pass

    def _calculate_element_quantities(self) -> Dict[str, float]:  # pragma: no cover - stub
        return {}

    def _calculate_construction_surfaces(self) -> Dict[str, Dict[str, Any]]:  # pragma: no cover - stub
        return {}

    def _ensure_opaque_material(self, name: str) -> None:  # pragma: no cover - stub
        pass

    def _window_material_exists(self, name: str) -> bool:  # pragma: no cover - stub
        return False

    def _ensure_simple_glazing(self, name: str) -> None:  # pragma: no cover - stub
        pass

    def _ensure_window_material_exists_or_simple(self, name: str) -> None:  # pragma: no cover - stub
        pass

    def _sanitize_construction_name(self, name: str, ctype: str, layers: List[str]) -> str:  # pragma: no cover - stub
        return name

    def _ensure_construction_exact(self, name: str, layers: List[str]) -> None:  # pragma: no cover - stub
        pass

    def _assign_constructions_to_surfaces(self, construction_set: Dict[str, Any]) -> None:  # pragma: no cover - stub
        pass

    def _ensure_unique_construction_names(self) -> None:  # pragma: no cover - stub
        pass

    def _determine_construction_type(self, name: str, layers: List[str]) -> str:  # pragma: no cover - stub
        return "wall"

    # ----------------------------- Public API --------------------------------
    def parse(self) -> Dict[str, Any]:
        """Parse materials, constructions, and zones.

        Returns a dict with lists for `materials`, `constructions`, and `zones`,
        plus `element_quantities` dict with wall/roof/floor/window areas.
        In read-only fallback mode (no eppy), a best-effort simple parse is
        returned using regex heuristics.
        """
        if self._eppy_ready:
            self._parse_materials_eppy()
            self._parse_constructions_eppy()
            self._parse_zones_eppy()
            element_quantities = self._calculate_element_quantities()
            construction_surfaces = self._calculate_construction_surfaces()
        else:
            # Fallback lightweight parsing
            self._parse_lightweight()
            element_quantities = {}
            construction_surfaces = {}

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
                        "visibleAbsorptance": mat.visible_absorptance,
                    },
                }
                for name, mat in self.materials.items()
            ],
            "constructions": [
                {
                    "id": name,
                    "name": name,
                    "type": const.element_type,
                    "properties": {
                        "layers": const.layers,
                        "surfaceCount": construction_surfaces.get(name, {}).get('count', 0),
                        "totalArea": construction_surfaces.get(name, {}).get('area', 0.0)
                    },
                }
                for name, const in self.constructions.items()
            ],
            "zones": [
                {
                    "id": name,
                    "name": name,
                    "type": "Zone",
                    "properties": {
                        "area": z.area,
                        "volume": z.volume,
                        "ceilingHeight": z.ceiling_height,
                    },
                }
                for name, z in self.zones.items()
            ],
            "element_quantities": element_quantities,
        }

    # Editing helpers (require eppy)
    def insert_construction_set(self, construction_set: Dict[str, Dict[str, Any]]) -> None:
        """Insert or replace a construction set (wall/window/floor/roof).

        - Ensures opaque MATERIALS exist for opaque constructions.
        - Ensures glazing WINDOWMATERIAL objects exist (or creates SIMPLEGLAZING).
        - Creates/updates CONSTRUCTION objects with deterministic names.
        - Assigns constructions to surfaces based on surface type.
        - Ensures unique construction names and remaps references.
        """
        self._require_eppy()

        # 1) Make sure we have the current state
        if not self.materials:
            self._parse_materials_eppy()
        if not self.constructions:
            self._parse_constructions_eppy()

        # 2) Create opaque materials on demand
        opaque_types = {"wall", "roof", "floor"}
        for ctype in opaque_types:
            cdef = construction_set.get(ctype)
            if not cdef:
                continue
            for mat_name in cdef.get("layers", []) or []:
                if not mat_name:
                    continue
                self._ensure_opaque_material(mat_name)

        # 3) Handle window layers/materials
        wdef = construction_set.get("window")
        if wdef:
            win_layers = wdef.get("layers", []) or []
            if not win_layers:
                # create a simple glazing system if only a name was passed
                glz_name = wdef.get("name") or "epsm_glazing"
                self._ensure_simple_glazing(glz_name)
                win_layers = [glz_name]
            else:
                # ensure all declared window materials exist (error-free)
                for lname in win_layers:
                    if lname:
                        self._ensure_window_material_exists_or_simple(lname)
            # update the window def with resolved layers
            wdef["layers"] = win_layers

        # 4) Ensure constructions exist exactly as requested
        for ctype in ("wall", "window", "floor", "roof"):
            cdef = construction_set.get(ctype)
            if not cdef:
                continue
            cname = self._sanitize_construction_name(cdef.get("name") or ctype, ctype, cdef.get("layers", []))
            layers = cdef.get("layers", []) or []
            self._ensure_construction_exact(cname, layers)
            cdef["name"] = cname

        # 5) Assign to surfaces
        self._assign_constructions_to_surfaces(construction_set)

        # 6) Ensure uniqueness & remap stray references
        self._ensure_unique_construction_names()

    def to_string(self) -> str:
        """Serialize the current IDF to string (requires eppy)."""
        self._require_eppy()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".idf", mode="w", encoding="utf-8") as tmp:
            self._idf.saveas(tmp.name)
            tmp.close()
            with open(tmp.name, "r", encoding="utf-8") as f:
                s = f.read()
        try:
            os.remove(tmp.name)
        except Exception:
            pass
        return s

    # -------------------------- Parametric helper ----------------------------
    @staticmethod
    def _verify_and_repair(idf_text: str, idd_dir: Optional[str]) -> str:
        """Open-and-save pass to normalize names and remap references.
        Non-fatal on failure – returns the original text if repair fails.
        """
        try:
            verifier = UnifiedIDFParser(idf_text, read_only=False, idd_dir=idd_dir)
            verifier._ensure_unique_construction_names()
            return verifier.to_string()
        except Exception:
            return idf_text


# Public function – keep the **same signature** used by callers

def generate_parametric_idfs(base_idf_content: str, construction_sets: List[Dict[str, Any]]) -> List[Tuple[str, Dict[str, Any]]]:
    """Generate parametric variants from a base IDF and a list of construction sets.

    This function preserves the historical interface: it returns a list of
    `(idf_content, construction_set)` tuples.
    """
    results: List[Tuple[str, Dict[str, Any]]] = []
    idd_dir = _get_energyplus_path()

    for cset in construction_sets:
        try:
            editor = UnifiedIDFParser(base_idf_content, read_only=False, idd_dir=idd_dir)
            editor.insert_construction_set(cset)
            idf_text = editor.to_string()
        except Exception:
            # Fallback: if editing failed (e.g., no eppy), pass through original
            idf_text = base_idf_content
        # Verification/repair pass for surface references & duplicates
        idf_text = UnifiedIDFParser._verify_and_repair(idf_text, idd_dir)
        results.append((idf_text, cset))

    return results


# -------------------------- Internal eppy helpers ---------------------------
    # (attached as methods to UnifiedIDFParser)

    # --- Initialization ---
def _init_eppy_if_possible(self) -> None:
    if not _EPPY_AVAILABLE:
        self._eppy_ready = False
        return
    # write content to a temp file so eppy can open it
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".idf", mode="w", encoding="utf-8")
    tmp.write(self.content)
    tmp.close()
    self._temp_path = tmp.name

    # install paths and set IDD
    try:
        if install_paths is not None:
            install_paths(self._idd_dir, None)
        idd_path = os.path.join(self._idd_dir, "Energy+.idd")
        if os.path.exists(idd_path):
            IDF.setiddname(idd_path)  # type: ignore[attr-defined]
        else:
            # If Energy+.idd is not present, bail out to fallback mode
            self._eppy_ready = False
            return
        self._idf = IDF(self._temp_path)  # type: ignore[operator]
        self._eppy_ready = True
    except Exception:
        self._eppy_ready = False

def _require_eppy(self) -> None:
    if not self._eppy_ready or self._idf is None:
        raise RuntimeError("Editing requires eppy and a valid Energy+.idd. Parser is in read-only mode.")

def _parse_lightweight(self) -> None:
    self.materials.clear()
    self.constructions.clear()
    self.zones.clear()

    # naive extraction by block headers
    mat_blocks = re.findall(r"(?is)\b(Material|Material:NoMass)\s*,\s*([^;]+);", self.content)
    for _type, body in mat_blocks:
        # First token of the body tends to be the Name
        name_match = re.match(r"\s*([^,\n\r]+)", body)
        name = name_match.group(1).strip() if name_match else "Unknown"
        self.materials[name] = Material(name=name)

    cons_blocks = re.findall(r"(?is)\bConstruction\s*,\s*([^;]+);", self.content)
    for body in cons_blocks:
        parts = [p.strip() for p in body.split(",") if p.strip()]
        if not parts:
            continue
        name = parts[0]
        layers = parts[1:]
        et = self._determine_construction_type(name, layers)
        self.constructions[name] = Construction(name=name, layers=layers, element_type=et)

    for m in re.finditer(r"(?im)^\s*Zone\s*,\s*([^,]+)", self.content):
        name = m.group(1).strip()
        self.zones[name] = Zone(name=name)

def _parse_materials_eppy(self) -> None:
    self.materials.clear()
    try:
        mat_objs = []
        mat_objs.extend(list(self._idf.idfobjects.get("MATERIAL", [])))
        mat_objs.extend(list(self._idf.idfobjects.get("MATERIAL:NOMASS", [])))
    except Exception:
        mat_objs = []

    for mat in mat_objs:
        try:
            name = getattr(mat, "Name", None)
            if not name:
                continue
            self.materials[name] = Material(
                name=name,
                thickness=_safe_float(getattr(mat, "Thickness", None)),
                conductivity=_safe_float(getattr(mat, "Conductivity", None)),
                density=_safe_float(getattr(mat, "Density", None)),
                specific_heat=_safe_float(getattr(mat, "Specific_Heat", None)),
                roughness=getattr(mat, "Roughness", "MediumRough"),
                thermal_absorptance=_safe_float(getattr(mat, "Thermal_Absorptance", None)),
                solar_absorptance=_safe_float(getattr(mat, "Solar_Absorptance", None)),
                visible_absorptance=_safe_float(getattr(mat, "Visible_Absorptance", None)),
            )
        except Exception:
            continue

def _parse_constructions_eppy(self) -> None:
    self.constructions.clear()
    for const in self._idf.idfobjects.get("CONSTRUCTION", []):
        try:
            name = getattr(const, "Name", None)
            if not name:
                continue
            # Collect layers while preserving the declared field order when
            # possible. Some CONSTRUCTION objects use 'Outside_Layer' and
            # 'Layer_2', etc. We prefer using `fieldnames` when available so
            # the returned layer ordering matches the IDF source.
            layers: List[str] = []
            # First attempt: iterate declared fieldnames (preserves order)
            fieldnames = []
            try:
                fieldnames = getattr(const, "fieldnames", []) or []
            except Exception:
                fieldnames = []

            if fieldnames:
                for fld in fieldnames:
                    if not isinstance(fld, str):
                        continue
                    # Accept 'Outside_Layer' or any 'Layer*' fields
                    if fld == "Outside_Layer" or fld.lower().startswith("layer"):
                        try:
                            val = getattr(const, fld, None)
                            if val:
                                layers.append(val)
                        except Exception:
                            continue
            else:
                # Fallback: attempt the numeric Layer_1..n attrs as before
                i = 1
                while True:
                    attr = f"Layer_{i}"
                    if hasattr(const, attr):
                        try:
                            val = getattr(const, attr)
                        except Exception:
                            val = None
                        if val:
                            layers.append(val)
                        i += 1
                    else:
                        break

            et = self._determine_construction_type(name, layers)
            self.constructions[name] = Construction(name=name, layers=layers, element_type=et)
        except Exception:
            continue

def _parse_zones_eppy(self) -> None:
    self.zones.clear()
    
    # First pass: collect zone data
    zone_data = {}  # {zone_name: {'area': float|None, 'volume': float|None}}
    for zone in self._idf.idfobjects.get("ZONE", []):
        try:
            name = getattr(zone, "Name", None)
            if not name:
                continue
            area = _safe_float(getattr(zone, "Floor_Area", None))
            volume = _safe_float(getattr(zone, "Volume", None))
            zone_data[name] = {'area': area, 'volume': volume}
        except Exception:
            continue
    
    # Second pass: calculate floor areas from surfaces (only for zones missing area)
    # Build a dict of zone -> list of floor surfaces for efficiency
    zones_needing_area = {name for name, data in zone_data.items() if data['area'] is None}
    
    if zones_needing_area:
        # Initialize accumulator for zones that need area calculation
        calculated_areas = {name: 0.0 for name in zones_needing_area}
        
        for surface in self._idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
            try:
                zone_name = getattr(surface, "Zone_Name", None)
                surface_type = getattr(surface, "Surface_Type", "")
                
                # Skip if not a floor or zone doesn't need area calculation
                if zone_name not in zones_needing_area or surface_type.upper() != "FLOOR":
                    continue
                
                # Extract vertices efficiently
                vertices = []
                for i in range(1, 100):  # Max 100 vertices (more than enough)
                    x = _safe_float(getattr(surface, f"Vertex_{i}_Xcoordinate", None))
                    y = _safe_float(getattr(surface, f"Vertex_{i}_Ycoordinate", None))
                    z = _safe_float(getattr(surface, f"Vertex_{i}_Zcoordinate", None))
                    
                    # Break if any coordinate is missing (None) or invalid
                    if x is None or y is None or z is None:
                        break
                    
                    vertices.append((x, y, z))
                
                # Calculate and accumulate area
                if len(vertices) >= 3:
                    calculated_area = _calculate_polygon_area(vertices)
                    calculated_areas[zone_name] += calculated_area
            except Exception:
                continue
        
        # Update zone_data with calculated areas
        for zone_name, calc_area in calculated_areas.items():
            if calc_area > 0:
                zone_data[zone_name]['area'] = calc_area
    
    # Third pass: create Zone objects
    for name, data in zone_data.items():
        try:
            area = data['area']
            volume = data['volume']
            ceiling_height = (volume / area) if (area and volume) else None
            self.zones[name] = Zone(name=name, area=area, volume=volume, ceiling_height=ceiling_height)
        except Exception:
            continue

def _calculate_element_quantities(self) -> Dict[str, float]:
    """Calculate total areas for wall, roof, floor, and window elements.
    
    Returns a dict with keys: 'wall_area', 'roof_area', 'floor_area', 'window_area'
    All values in square meters (m²).
    """
    quantities = {
        'wall_area': 0.0,
        'roof_area': 0.0,
        'floor_area': 0.0,
        'window_area': 0.0
    }
    
    if not self._eppy_ready or self._idf is None:
        return quantities
    
    # Map surface types to quantity keys
    surface_type_map = {
        'WALL': 'wall_area',
        'ROOF': 'roof_area',
        'ROOFCEILING': 'roof_area',
        'CEILING': 'roof_area',
        'FLOOR': 'floor_area'
    }
    
    # Calculate areas for opaque surfaces
    for surface in self._idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
        try:
            surface_type = getattr(surface, "Surface_Type", "").upper()
            
            # Extract vertices
            vertices = []
            for i in range(1, 100):
                x = _safe_float(getattr(surface, f"Vertex_{i}_Xcoordinate", None))
                y = _safe_float(getattr(surface, f"Vertex_{i}_Ycoordinate", None))
                z = _safe_float(getattr(surface, f"Vertex_{i}_Zcoordinate", None))
                
                if x is None or y is None or z is None:
                    break
                
                vertices.append((x, y, z))
            
            # Calculate area
            if len(vertices) >= 3:
                area = _calculate_polygon_area(vertices)
                
                # Add to appropriate quantity
                if surface_type in surface_type_map:
                    quantities[surface_type_map[surface_type]] += area
        except Exception:
            continue
    
    # Calculate window/fenestration areas
    for fenestration in self._idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
        try:
            # Extract vertices
            vertices = []
            for i in range(1, 100):
                x = _safe_float(getattr(fenestration, f"Vertex_{i}_Xcoordinate", None))
                y = _safe_float(getattr(fenestration, f"Vertex_{i}_Ycoordinate", None))
                z = _safe_float(getattr(fenestration, f"Vertex_{i}_Zcoordinate", None))
                
                if x is None or y is None or z is None:
                    break
                
                vertices.append((x, y, z))
            
            # Calculate area
            if len(vertices) >= 3:
                area = _calculate_polygon_area(vertices)
                quantities['window_area'] += area
        except Exception:
            continue
    
    return quantities

def _calculate_construction_surfaces(self) -> Dict[str, Dict[str, Any]]:
    """Calculate surface count and total area for each construction.
    
    Returns a dict mapping construction names to {count: int, area: float}
    """
    construction_data = {}  # type: Dict[str, Dict[str, Any]]
    
    if not self._eppy_ready or self._idf is None:
        return construction_data
    
    # Process opaque surfaces
    for surface in self._idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
        try:
            construction_name = getattr(surface, "Construction_Name", None)
            if not construction_name:
                continue
            
            # Extract vertices
            vertices = []
            for i in range(1, 100):
                x = _safe_float(getattr(surface, f"Vertex_{i}_Xcoordinate", None))
                y = _safe_float(getattr(surface, f"Vertex_{i}_Ycoordinate", None))
                z = _safe_float(getattr(surface, f"Vertex_{i}_Zcoordinate", None))
                
                if x is None or y is None or z is None:
                    break
                
                vertices.append((x, y, z))
            
            # Calculate area
            if len(vertices) >= 3:
                area = _calculate_polygon_area(vertices)
                
                if construction_name not in construction_data:
                    construction_data[construction_name] = {'count': 0, 'area': 0.0}
                
                construction_data[construction_name]['count'] += 1
                construction_data[construction_name]['area'] += area
        except Exception:
            continue
    
    # Process fenestration surfaces (windows)
    for fenestration in self._idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
        try:
            # Try multiple field names for construction
            construction_name = None
            for field in ("Construction_Name", "Window_Construction_Name", "Construction"):
                construction_name = getattr(fenestration, field, None)
                if construction_name:
                    break
            
            if not construction_name:
                continue
            
            # Extract vertices
            vertices = []
            for i in range(1, 100):
                x = _safe_float(getattr(fenestration, f"Vertex_{i}_Xcoordinate", None))
                y = _safe_float(getattr(fenestration, f"Vertex_{i}_Ycoordinate", None))
                z = _safe_float(getattr(fenestration, f"Vertex_{i}_Zcoordinate", None))
                
                if x is None or y is None or z is None:
                    break
                
                vertices.append((x, y, z))
            
            # Calculate area
            if len(vertices) >= 3:
                area = _calculate_polygon_area(vertices)
                
                if construction_name not in construction_data:
                    construction_data[construction_name] = {'count': 0, 'area': 0.0}
                
                construction_data[construction_name]['count'] += 1
                construction_data[construction_name]['area'] += area
        except Exception:
            continue
    
    return construction_data

def _ensure_opaque_material(self, name: str) -> None:
    mats = self._idf.idfobjects.get("MATERIAL", [])
    for m in mats:
        if getattr(m, "Name", None) == name:
            return
    try:
        self._idf.newidfobject(
            "MATERIAL",
            Name=name,
            Roughness="MediumRough",
            Thickness=0.2,
            Conductivity=0.5,
            Density=800.0,
            Specific_Heat=900.0,
            Thermal_Absorptance=0.9,
            Solar_Absorptance=0.7,
            Visible_Absorptance=0.7,
        )
    except Exception:
        pass

def _window_material_exists(self, name: str) -> bool:
    for t in (
        "WINDOWMATERIAL:SIMPLEGLAZINGSYSTEM",
        "WINDOWMATERIAL:GLAZING",
        "WINDOWMATERIAL:GAS",
        "WINDOWMATERIAL:GLAZINGGROUP:THERMOCHROMIC",
        "WINDOWMATERIAL:SHADE",
        "WINDOWMATERIAL:BLIND",
        "WINDOWMATERIAL:SCREEN",
    ):
        for obj in self._idf.idfobjects.get(t, []):
            if getattr(obj, "Name", None) == name:
                return True
    return False

def _ensure_simple_glazing(self, name: str, u: float = 1.6, shgc: float = 0.4, tvis: float = 0.6) -> None:
    if not name:
        return
    if self._window_material_exists(name):
        return
    try:
        self._idf.newidfobject(
            "WINDOWMATERIAL:SIMPLEGLAZINGSYSTEM",
            Name=name,
            UFactor=u,
            Solar_Heat_Gain_Coefficient=shgc,
            Visible_Transmittance=tvis,
        )
    except Exception:
        pass

def _ensure_window_material_exists_or_simple(self, name: str) -> None:
    if not self._window_material_exists(name):
        # If a specific window material name is referenced but absent,
        # backstop with a simple glazing of that name to keep the model runnable.
        self._ensure_simple_glazing(name)

def _sanitize_construction_name(self, proposed: str, ctype: str, layers: List[str]) -> str:
    base = proposed or ctype
    base = base if base.startswith("epsm_") else f"epsm_{base}"
    safe_base = re.sub(r"[^0-9a-zA-Z_-]", "_", base)[:50]
    # add a short signature from layers to reduce collisions
    sig = "_".join(re.sub(r"[^0-9a-zA-Z]+", "", l) for l in layers)[:40]
    name = f"{safe_base}_{sig}" if sig else safe_base
    return name

def _ensure_construction_exact(self, name: str, layers: List[str]) -> None:
    # remove any existing construction with same name for determinism
    for c in list(self._idf.idfobjects.get("CONSTRUCTION", [])):
        if getattr(c, "Name", None) == name:
            try:
                self._idf.removeidfobject(c)
            except Exception:
                pass
    kwargs = {"Name": name}
    # Prefer to map into an example CONSTRUCTION's fieldnames so we populate
    # IDF-specific fields like 'Outside_Layer' when present. Fall back to
    # Layer_1..N if no example is available.
    example = None
    try:
        for c in self._idf.idfobjects.get("CONSTRUCTION", []):
            example = c
            break
    except Exception:
        example = None

    if example is not None:
        try:
            example_fieldnames = getattr(example, "fieldnames", []) or []
        except Exception:
            example_fieldnames = []
        for i, layer in enumerate(layers):
            target_index = i + 1
            if target_index < len(example_fieldnames):
                field = example_fieldnames[target_index]
                kwargs[field] = layer
            else:
                kwargs[f"Layer_{target_index}"] = layer
    else:
        for i, layer in enumerate(layers, start=1):
            kwargs[f"Layer_{i}"] = layer

    try:
        self._idf.newidfobject("CONSTRUCTION", **kwargs)
        # attempt to locate the newly created object and repair layers if
        # necessary (ensure first/top layer field is non-empty)
        created = None
        try:
            for c in self._idf.idfobjects.get("CONSTRUCTION", []):
                if getattr(c, "Name", None) == name:
                    created = c
                    break
        except Exception:
            created = None
        if created is not None:
            try:
                _repair_construction_layers(created)
            except Exception:
                # Non-fatal: best-effort repair
                pass
    except Exception:
        pass

def _repair_construction_layers(const_obj: Any) -> None:
    """Ensure the first declared layer field on a CONSTRUCTION object is
    populated. If the first layer field is empty but later layer fields have
    values, shift them up so the required 'outside' layer is not blank.

    This operates on an eppy IDF object directly. It is best-effort and will
    silently continue on exceptions.
    """
    try:
        # Prefer declared fieldnames when present
        fieldnames = getattr(const_obj, "fieldnames", []) or []
    except Exception:
        fieldnames = []

    # Find layer-like field names in declared order
    layer_fields: List[str] = []
    for fn in fieldnames:
        try:
            if isinstance(fn, str) and "LAYER" in fn.upper():
                layer_fields.append(fn)
        except Exception:
            continue

    # Fallback to numeric Layer_1..N if no fieldnames available
    if not layer_fields:
        i = 1
        while True:
            attr = f"Layer_{i}"
            if hasattr(const_obj, attr):
                layer_fields.append(attr)
                i += 1
            else:
                break

    if not layer_fields:
        return

    # Collect current non-empty values in order
    vals: List[str] = []
    for fld in layer_fields:
        try:
            v = getattr(const_obj, fld, None)
        except Exception:
            v = None
        if v:
            vals.append(v)

    if not vals:
        return

    # If the first declared field is populated, nothing to do
    try:
        first_val = getattr(const_obj, layer_fields[0], None)
    except Exception:
        first_val = None
    if first_val:
        return

    # Shift values up: set the first field to first val, subsequent fields to
    # the remaining vals, clear any leftover fields beyond the vals length.
    try:
        for idx, fld in enumerate(layer_fields):
            try:
                if idx < len(vals):
                    setattr(const_obj, fld, vals[idx])
                else:
                    # clear extra fields
                    try:
                        setattr(const_obj, fld, "")
                    except Exception:
                        pass
            except Exception:
                continue
    except Exception:
        return

def _assign_constructions_to_surfaces(self, cset: Dict[str, Dict[str, Any]]) -> None:
    surf_map = {
        "WALL": "wall",
        "WALL:EXTERIOR": "wall",
        "WALL:INTERIOR": "wall",
        "ROOF": "roof",
        "ROOFCEILING": "roof",
        "CEILING": "roof",
        "FLOOR": "floor",
    }
    for s in self._idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
        st = (getattr(s, "Surface_Type", "") or "").upper()
        et = surf_map.get(st)
        if et and et in cset:
            try:
                s.Construction_Name = cset[et]["name"]
            except Exception:
                pass
    if "window" in cset:
        wname = cset["window"].get("name")
        for f in self._idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
            for fld in ("Construction_Name", "Window_Construction_Name", "Construction"):
                try:
                    if hasattr(f, fld):
                        setattr(f, fld, wname)
                        break
                except Exception:
                    continue

def _ensure_unique_construction_names(self) -> None:
    consts = list(self._idf.idfobjects.get("CONSTRUCTION", []))
    by_name: Dict[str, List[Any]] = {}
    for c in consts:
        nm = getattr(c, "Name", None)
        if nm:
            by_name.setdefault(nm, []).append(c)
    used = set(by_name.keys())

    def _normalize(n: Optional[str]) -> str:
        # Normalize a construction name to a canonical base form. Accept
        # Optional[str] since IDF objects may have missing names; return an
        # empty string for falsy inputs.
        if not n:
            return ""
        n2 = re.sub(r"(_dup\d+|_var_[0-9a-fA-F]+)$", "", n)
        n2 = re.sub(r"\s*\(copy\)$", "", n2, flags=re.IGNORECASE)
        if n2.startswith("epsm_"):
            n2 = n2[len("epsm_"):]
        return n2

    # Rename duplicates deterministically
    for name, objs in list(by_name.items()):
        if len(objs) <= 1:
            continue
        keep = objs[0]
        base = name if name.startswith("epsm_") else f"epsm_{name}"
        idx = 1
        for obj in objs[1:]:
            new_name = f"{base}_dup{idx}"
            while new_name in used:
                idx += 1
                new_name = f"{base}_dup{idx}"
            try:
                obj.Name = new_name
            except Exception:
                continue
            used.add(new_name)
            idx += 1

    # Build normalized lookup of existing construction names
    # Coerce to str to make downstream consumers type-stable
    current_names = [str(getattr(o, "Name")) for o in self._idf.idfobjects.get("CONSTRUCTION", []) if getattr(o, "Name", None)]
    normalized_map: Dict[str, List[str]] = {}
    for actual in current_names:
        key = _normalize(actual)
        normalized_map.setdefault(key, []).append(actual)

    def _best_match(ref: str) -> Optional[str]:
        if not ref:
            return None
        key = _normalize(ref)
        if key in normalized_map and normalized_map[key]:
            return normalized_map[key][0]
        # token overlap fallback
        def words(s: str) -> set:
            s2 = s
            if s2.startswith("epsm_"):
                s2 = s2[len("epsm_"):]
            toks = re.split(r"[^0-9a-zA-Z]+", s2.lower())
            return {t for t in toks if t}
        rw = words(ref)
        best = None
        best_score = 0
        for cand in current_names:
            score = len(rw & words(cand))
            if score > best_score:
                best_score = score
                best = cand
        return best

    # Remap surfaces & fenestrations
    for surf in self._idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
        try:
            cur = getattr(surf, "Construction_Name", None)
            if cur and cur not in current_names:
                cand = _best_match(cur)
                if cand:
                    try:
                        surf.Construction_Name = cand
                    except Exception:
                        pass
        except Exception:
            pass
    for fen in self._idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
        for fld in ("Construction_Name", "Window_Construction_Name", "Construction"):
            try:
                if hasattr(fen, fld):
                    val = getattr(fen, fld)
                    if val and val not in current_names:
                        cand = _best_match(val)
                        if cand:
                            try:
                                setattr(fen, fld, cand)
                            except Exception:
                                pass
                    break
            except Exception:
                continue

def _determine_construction_type(self, name: str, layers: List[str]) -> str:
    n = (name or "").lower()
    if any(k in n for k in ("roof", "ceiling")):
        return "roof"
    if "floor" in n:
        return "floor"
    if any(k in n for k in ("window", "glazing")):
        return "window"
    # layer-based signal for windows
    if any("GLAZING" in (l or "").upper() or "WINDOWMATERIAL" in (l or "").upper() for l in layers):
        return "window"
    return "wall"


# ----------------------- GWP and Cost Calculation ------------------------
def calculate_gwp_and_cost_from_construction_set(
    element_quantities: Dict[str, float],
    construction_set: Dict[str, Any]
) -> Dict[str, float]:
    """Calculate total GWP (kg CO2e) and cost (SEK) from element quantities and construction set.
    
    This function fetches construction data from the database and multiplies
    area × gwp_per_m2 and area × cost_per_m2 for each element type.
    
    Args:
        element_quantities: Dict with keys wall_area, roof_area, floor_area, window_area (m²)
        construction_set: Dict with construction data (from parametric generation or database)
        
    Returns:
        Dict with keys 'gwp_total' (kg CO2e) and 'cost_total' (SEK)
    """
    from database.models import Construction
    
    total_gwp = 0.0
    total_cost = 0.0
    
    # Map element types to quantity keys
    element_map = {
        'wall': 'wall_area',
        'roof': 'roof_area',
        'floor': 'floor_area',
        'window': 'window_area'
    }
    
    for element_type, area_key in element_map.items():
        area = element_quantities.get(area_key, 0.0)
        if area <= 0:
            continue
            
        # Get construction data from the construction_set
        construction_data = construction_set.get(element_type)
        if not construction_data:
            continue
        
        # Try to get construction ID or name
        construction_id = construction_data.get('id')
        construction_name = construction_data.get('name')
        
        if not construction_id and not construction_name:
            continue
        
        try:
            # Fetch construction from database (must use materials_db)
            if construction_id:
                construction = Construction.objects.using('materials_db').filter(id=construction_id).first()
            else:
                construction = Construction.objects.using('materials_db').filter(name=construction_name).first()
            
            if construction:
                gwp_per_m2 = getattr(construction, 'gwp_kgco2e_per_m2', 0.0) or 0.0
                cost_per_m2 = getattr(construction, 'cost_sek_per_m2', 0.0) or 0.0
                
                total_gwp += area * gwp_per_m2
                total_cost += area * cost_per_m2
                print(f"  {element_type}: area={area:.2f} m², GWP={gwp_per_m2:.2f} kg/m², Cost={cost_per_m2:.2f} SEK/m² → Total GWP={area * gwp_per_m2:.2f}, Total Cost={area * cost_per_m2:.2f}")
            else:
                print(f"Warning: Construction not found in database - element_type={element_type}, id={construction_id}, name={construction_name}")
        except Exception as e:
            # Non-fatal: log and continue
            print(f"Warning: Failed to fetch construction data for {element_type}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return {
        'gwp_total': round(total_gwp, 2),
        'cost_total': round(total_cost, 2)
    }


# Attach the helper functions to UnifiedIDFParser so they act as methods.
for _fn in (
    "_init_eppy_if_possible",
    "_require_eppy",
    "_parse_lightweight",
    "_parse_materials_eppy",
    "_parse_constructions_eppy",
    "_parse_zones_eppy",
    "_calculate_element_quantities",
    "_calculate_construction_surfaces",
    "_ensure_opaque_material",
    "_window_material_exists",
    "_ensure_simple_glazing",
    "_ensure_window_material_exists_or_simple",
    "_sanitize_construction_name",
    "_ensure_construction_exact",
    "_assign_constructions_to_surfaces",
    "_ensure_unique_construction_names",
    "_determine_construction_type",
):
    setattr(UnifiedIDFParser, _fn, globals()[_fn])

# Backwards-compatibility: expose the underlying eppy IDF object as `parser.idf`
# for callers that expect direct access. Return None in read-only mode.
setattr(UnifiedIDFParser, 'idf', property(lambda self: getattr(self, '_idf', None)))


# ------------------------- Backward-compat shims ----------------------------
class EnergyPlusIDFParser(UnifiedIDFParser):
    """Backwards-compatible name used by `views.py`.
    Defaults to read-only mode so it remains lightweight in the API layer.
    """
    def __init__(self, content: str, **kwargs: Any):
        super().__init__(content, read_only=True, **kwargs)


class IdfParser(UnifiedIDFParser):
    """Backwards-compatible name used by services.
    Defaults to full-edit mode for parametric generation flows.
    """
    def __init__(self, content: str, **kwargs: Any):
        super().__init__(content, read_only=False, **kwargs)
