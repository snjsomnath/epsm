# idf_parser.py
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Set
from uuid import uuid4
import os, re, tempfile

from eppy.modeleditor import IDF
from eppy.runner.run_functions import install_paths

# ---------- IDD/EnergyPlus paths ----------
energyplus_env = os.getenv("ENERGYPLUS_PATH")
fallback_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
energyplus_path = energyplus_env if energyplus_env else fallback_dir
install_paths(energyplus_path, None)

_IDD_SET = False
def _set_idd_once():
    global _IDD_SET
    if _IDD_SET:
        return
    idd_path = os.path.join(energyplus_path, "Energy+.idd")
    if not os.path.exists(idd_path):
        repo_idd = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "Energy+.idd"))
        if os.path.exists(repo_idd):
            idd_path = repo_idd
    if not os.path.exists(idd_path):
        raise FileNotFoundError("Energy+.idd not found. Set ENERGYPLUS_PATH or place Energy+.idd in backend/")
    IDF.setiddname(idd_path)
    _IDD_SET = True

# ---------- dataclasses ----------
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

# ---------- helpers ----------
def _fnames(obj) -> List[str]:
    try:
        return list(getattr(obj, "fieldnames", []))
    except Exception:
        return []

def _get(obj, name, default=None):
    try:
        return getattr(obj, name)
    except Exception:
        return default

def _set(obj, name, value):
    try:
        setattr(obj, name, value)
    except Exception:
        pass

class _NameRegistry:
    def __init__(self, existing: Set[str]):
        self.used = set(n for n in existing if n)

    def reserve(self, name: str) -> str:
        if not name:
            name = f"epsm_{uuid4().hex[:8]}"
        if name not in self.used:
            self.used.add(name); return name
        base = name if name.startswith("epsm_") else f"epsm_{name}"
        i = 1; new = f"{base}_dup{i}"
        while new in self.used:
            i += 1; new = f"{base}_dup{i}"
        self.used.add(new); return new

# ---------- main ----------
class IdfParser:
    """Unified IDF parser/editor (materials, constructions, zones + safe construction insertion)."""

    def __init__(self, content: str, idd_dir: Optional[str] = None):
        # allow explicit idd_dir override
        if idd_dir:
            global _IDD_SET
            if not _IDD_SET:
                cand = os.path.join(idd_dir, "Energy+.idd")
                if os.path.exists(cand):
                    IDF.setiddname(cand); _IDD_SET = True
        _set_idd_once()

        self.content = content
        self.materials: Dict[str, Material] = {}
        self.constructions: Dict[str, Construction] = {}
        self.zones: Dict[str, Zone] = {}

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".idf", mode="w", encoding="utf-8")
        tmp.write(content); tmp.close()
        self.temp_path = tmp.name
        self.idf = IDF(self.temp_path)

    def __del__(self):
        try:
            if hasattr(self, "temp_path") and os.path.exists(self.temp_path):
                os.remove(self.temp_path)
        except Exception:
            pass

    # ---------- PUBLIC: parse ----------
    def parse(self) -> Dict:
        """Parse IDF content and return dict with materials, constructions, zones."""
        self._parse_materials()
        self._parse_constructions()
        self._parse_zones()

        # prune unused constructions then re-parse mats/consts for a clean snapshot
        self._remove_unused_constructions()
        self._parse_materials(); self._parse_constructions()

        return {
            "materials": [
                {
                    "id": n, "name": n, "type": "Material",
                    "properties": {
                        "thickness": m.thickness, "conductivity": m.conductivity,
                        "density": m.density, "specificHeat": m.specific_heat,
                        "roughness": m.roughness,
                        "thermalAbsorptance": m.thermal_absorptance,
                        "solarAbsorptance": m.solar_absorptance,
                        "visibleAbsorptance": m.visible_absorptance,
                    }
                } for n, m in self.materials.items()
            ],
            "constructions": [
                {
                    "id": n, "name": n, "type": c.element_type,
                    "properties": { "layers": c.layers }
                } for n, c in self.constructions.items()
            ],
            "zones": [
                {
                    "id": n, "name": n, "type": "Zone",
                    "properties": {
                        "area": z.area, "volume": z.volume, "ceilingHeight": z.ceiling_height
                    }
                } for n, z in self.zones.items()
            ]
        }

    # ---------- PUBLIC: editing ----------
    def insert_construction_set(self, construction_set: dict) -> dict:
        """
        Build/ensure requested constructions and assign them safely (exterior-only).
        construction_set = {
            "wall":  {"name": "...", "layers": [...]},
            "roof":  {"name": "...", "layers": [...]},
            "floor": {"name": "...", "layers": [...]},
            "window":{"name": "...", "layers":[...]}  # OR "simple_glazing": {"u":1.6,"shgc":0.4,"tvis":0.6}
        }
        Returns change report.
        """
        report = {
            "materials_created": [],
            "constructions_created": [],
            "assignments": {"walls":0,"roofs":0,"floors":0,"windows":0},
            "remapped_references": 0,
            "pruned_constructions": 0,
            "warnings": []
        }
        self._validate_construction_set(construction_set)

        # (1) ensure opaque materials exist
        report["materials_created"].extend(self._ensure_opaque_materials(construction_set))

        # (2) ensure window stack or simple glazing
        try:
            self._ensure_window_stack_or_simple_glazing(construction_set)
        except ValueError as e:
            report["warnings"].append(str(e))
            if "window" in construction_set:
                raise

        # (3) deterministic construction creation
        existing = { _get(c,"Name") for c in self.idf.idfobjects.get("CONSTRUCTION", []) if _get(c,"Name") }
        reg = _NameRegistry(existing)

        req_to_final = {}
        for ctype in ("wall","roof","floor","window"):
            cdata = construction_set.get(ctype)
            if not cdata: continue
            req_name = str(cdata.get("name") or ctype)

            if ctype == "window":
                base = re.sub(r"[^0-9a-zA-Z_-]","_", req_name)[:40]
                final_name = reg.reserve(f"epsm_window_{base}")
            else:
                final_name = reg.reserve(req_name if req_name.startswith("epsm_") else f"epsm_{req_name}")

            layers = list(cdata.get("layers", []) or [])
            final_name = self._ensure_construction(final_name, layers)
            cdata["name"] = final_name
            req_to_final[req_name] = final_name
            report["constructions_created"].append({"requested": req_name, "final": final_name, "layers": layers})

        # (4) safe assignment (exterior/ground only)
        report["assignments"] = self._assign_surfaces_exterior_only(construction_set)

        # (5) de-dup + ref remap
        report["remapped_references"] = self._ensure_unique_construction_names()

        # (6) prune unused
        report["pruned_constructions"] = self._remove_unused_constructions()

        return report

    def to_string(self) -> str:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".idf", mode="w", encoding="utf-8") as tmp:
            self.idf.saveas(tmp.name); tmp.close()
            with open(tmp.name, "r", encoding="utf-8") as f:
                s = f.read()
        try: os.remove(tmp.name)
        except Exception: pass
        return s

    # ---------- parsing internals ----------
    def _parse_materials(self):
        self.materials.clear()
        try:
            mat_objs = list(self.idf.idfobjects.get("MATERIAL", [])) + list(self.idf.idfobjects.get("MATERIAL:NOMASS", []))
        except Exception:
            mat_objs = []
        for mat in mat_objs:
            try:
                name = _get(mat, "Name")
                if not name: continue
                def _num(attr):
                    try:
                        v = _get(mat, attr)
                        return float(v) if v not in (None,"") else None
                    except Exception:
                        return None
                thickness = _num("Thickness") or 0.0
                conductivity = _num("Conductivity") or 0.0
                density = _num("Density") or 0.0
                specific = _num("Specific_Heat") or 0.0
                rough = _get(mat, "Roughness", "MediumRough")
                thabs = _get(mat, "Thermal_Absorptance", 0.9)
                soabs = _get(mat, "Solar_Absorptance", 0.7)
                viabs = _get(mat, "Visible_Absorptance", 0.7)
                self.materials[name] = Material(
                    name=name, thickness=thickness, conductivity=conductivity,
                    density=density, specific_heat=specific, roughness=rough,
                    thermal_absorptance=thabs, solar_absorptance=soabs, visible_absorptance=viabs
                )
            except Exception:
                nm = _get(mat, "Name", "<unknown>")
                print(f"Warning: failed to parse material {nm}")

    def _parse_constructions(self):
        self.constructions.clear()
        for const in self.idf.idfobjects.get("CONSTRUCTION", []):
            name = _get(const, "Name")
            if not name: continue
            layers: List[str] = []
            # prefer Layer_1..N
            i = 1
            while True:
                attr = f"Layer_{i}"
                if hasattr(const, attr):
                    val = _get(const, attr)
                    if val: layers.append(val)
                    i += 1
                else:
                    break
            # fallback scan of fieldnames, just in case
            if not layers:
                for fname in _fnames(const)[1:]:
                    if "LAYER" in fname.upper():
                        val = _get(const, fname)
                        if val: layers.append(val)
            etype = self._determine_construction_type(name, layers)
            self.constructions[name] = Construction(name=name, layers=layers, element_type=etype)

    def _parse_zones(self):
        self.zones.clear()
        for z in self.idf.idfobjects.get("ZONE", []):
            name = _get(z, "Name")
            if not name: continue
            area = None; volume = None; height = None
            if hasattr(z, "Floor_Area") and _get(z, "Floor_Area"): area = float(_get(z, "Floor_Area"))
            if hasattr(z, "Volume") and _get(z, "Volume"): volume = float(_get(z, "Volume"))
            if area and volume: height = volume/area if area else None
            self.zones[name] = Zone(name=name, area=area, volume=volume, ceiling_height=height)

    def _determine_construction_type(self, name: str, layers: List[str]) -> str:
        nl = (name or "").lower()
        if any(x in nl for x in ("roof", "ceiling")): return "roof"
        if "floor" in nl: return "floor"
        if any(x in nl for x in ("window", "glazing")): return "window"
        # check layer composition for glazing tokens
        win_tokens = ("WINDOWMATERIAL", "GLAZING")
        if any(any(tok in (layer or "").upper() for tok in win_tokens) for layer in layers): return "window"
        return "wall"

    # ---------- construction ensuring/assignment ----------
    def _validate_construction_set(self, cs: dict):
        if not isinstance(cs, dict):
            raise TypeError("construction_set must be a dict")
        allowed = {"wall","roof","floor","window"}
        for k, v in cs.items():
            if k not in allowed:
                raise ValueError(f"Invalid construction type '{k}'. Allowed: {sorted(allowed)}")
            if not isinstance(v, dict):
                raise TypeError(f"construction_set['{k}'] must be a dict")
            if "name" not in v: v["name"] = k
            if "layers" in v and v["layers"] is not None and not isinstance(v["layers"], list):
                raise TypeError(f"construction_set['{k}']['layers'] must be a list or omitted")

    def _ensure_opaque_materials(self, cs: dict) -> List[str]:
        created = []
        existing = { _get(m,"Name") for m in self.idf.idfobjects.get("MATERIAL", []) if _get(m,"Name") }
        for ctype in ("wall","roof","floor"):
            cdata = cs.get(ctype)
            if not cdata: continue
            for mat in (cdata.get("layers", []) or []):
                if not mat or mat in existing: continue
                try:
                    self.idf.newidfobject(
                        "MATERIAL", Name=mat, Roughness="MediumRough",
                        Thickness=0.2, Conductivity=0.5, Density=800.0, Specific_Heat=900.0,
                        Thermal_Absorptance=0.9, Solar_Absorptance=0.7, Visible_Absorptance=0.7
                    )
                    created.append(mat); existing.add(mat)
                except Exception:
                    pass
        return created

    def _window_material_exists(self, name: str) -> bool:
        for t in (
            "WINDOWMATERIAL:SIMPLEGLAZINGSYSTEM","WINDOWMATERIAL:GLAZING","WINDOWMATERIAL:GAS",
            "WINDOWMATERIAL:GASMixture","WINDOWMATERIAL:SHADE","WINDOWMATERIAL:BLIND","WINDOWMATERIAL:SCREEN"
        ):
            for obj in self.idf.idfobjects.get(t, []):
                if _get(obj, "Name") == name: return True
        return False

    def _ensure_simple_glazing(self, name: str, u: float, shgc: float, tvis: float):
        if self._window_material_exists(name): return
        try:
            self.idf.newidfobject(
                "WINDOWMATERIAL:SIMPLEGLAZINGSYSTEM",
                Name=name, UFactor=float(u), Solar_Heat_Gain_Coefficient=float(shgc), Visible_Transmittance=float(tvis)
            )
        except Exception: pass

    def _ensure_window_stack_or_simple_glazing(self, cs: dict):
        w = cs.get("window")
        if not w: return
        if "simple_glazing" in w and w["simple_glazing"]:
            sg = w["simple_glazing"] or {}
            nm = w.get("name") or "window"
            self._ensure_simple_glazing(nm, sg.get("u",1.6), sg.get("shgc",0.4), sg.get("tvis",0.6))
            w["layers"] = [nm]
            return
        missing = []
        for lname in (w.get("layers", []) or []):
            if lname and not self._window_material_exists(lname):
                missing.append(lname)
        if missing:
            raise ValueError(f"Window layers missing as WINDOWMATERIAL objects: {missing}. Provide 'simple_glazing' or pre-create them.")

    def _ensure_construction(self, name: str, layers: List[str]) -> str:
        for c in list(self.idf.idfobjects.get("CONSTRUCTION", [])):
            if _get(c,"Name") == name:
                try: self.idf.removeidfobject(c)
                except Exception: pass
        kwargs = {"Name": name}
        for i, l in enumerate(layers, start=1):
            kwargs[f"Layer_{i}"] = l
        try: self.idf.newidfobject("CONSTRUCTION", **kwargs)
        except Exception: pass
        return name

    def _assign_surfaces_exterior_only(self, cs: dict) -> Dict[str,int]:
        counts = {"walls":0,"roofs":0,"floors":0,"windows":0}
        def obc(s): return (_get(s, "Outside_Boundary_Condition", "") or "").strip().lower()

        for s in self.idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
            st = (_get(s, "Surface_Type", "") or "").upper()

            if st.startswith("WALL") and obc(s) == "outdoors" and "wall" in cs:
                _set(s, "Construction_Name", cs["wall"]["name"]); counts["walls"] += 1; continue

            if st in ("ROOF","ROOFCEILING") and obc(s) == "outdoors" and "roof" in cs:
                _set(s, "Construction_Name", cs["roof"]["name"]); counts["roofs"] += 1; continue

            if st == "FLOOR" and obc(s) in ("ground","groundfcfactormethod","outdoors") and "floor" in cs:
                _set(s, "Construction_Name", cs["floor"]["name"]); counts["floors"] += 1; continue

        if "window" in cs:
            wname = cs["window"]["name"]
            for f in self.idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
                if hasattr(f, "Construction_Name") or "Construction_Name" in _fnames(f):
                    _set(f, "Construction_Name", wname); counts["windows"] += 1
                elif hasattr(f, "Window_Construction_Name") or "Window_Construction_Name" in _fnames(f):
                    _set(f, "Window_Construction_Name", wname); counts["windows"] += 1
        return counts

    # ---------- cleanup & de-dup ----------
    def _remove_unused_constructions(self) -> int:
        used = set()
        for s in self.idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
            nm = _get(s, "Construction_Name"); 
            if nm: used.add(nm)
        for f in self.idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
            for fld in ("Construction_Name","Window_Construction_Name"):
                nm = _get(f, fld); 
                if nm: used.add(nm)
        removed = 0
        for c in list(self.idf.idfobjects.get("CONSTRUCTION", [])):
            nm = _get(c, "Name")
            if nm and nm not in used:
                try: self.idf.removeidfobject(c); removed += 1
                except Exception: pass
        return removed

    def _ensure_unique_construction_names(self) -> int:
        # group by name
        groups: Dict[str, List] = {}
        for c in self.idf.idfobjects.get("CONSTRUCTION", []):
            nm = _get(c,"Name")
            if nm: groups.setdefault(nm, []).append(c)

        current = { _get(c,"Name") for c in self.idf.idfobjects.get("CONSTRUCTION", []) if _get(c,"Name") }
        reg = _NameRegistry(current)
        remapped = 0

        # rename duplicates (keep first)
        for nm, lst in groups.items():
            if len(lst) <= 1: continue
            keep = lst[0]
            for obj in lst[1:]:
                new_nm = reg.reserve(nm if nm.startswith("epsm_") else f"epsm_{nm}")
                _set(obj, "Name", new_nm)

        # remap refs that point to missing names
        current_names = { _get(c,"Name") for c in self.idf.idfobjects.get("CONSTRUCTION", []) if _get(c,"Name") }
        def remap(obj, fld):
            nonlocal remapped
            val = _get(obj, fld)
            if val and val not in current_names:
                best = self._best_match(val, current_names)
                if best:
                    _set(obj, fld, best); remapped += 1

        for s in self.idf.idfobjects.get("BUILDINGSURFACE:DETAILED", []):
            remap(s, "Construction_Name")
        for f in self.idf.idfobjects.get("FENESTRATIONSURFACE:DETAILED", []):
            for fld in ("Construction_Name","Window_Construction_Name"):
                remap(f, fld)
        return remapped

    def _best_match(self, ref: str, pool: Set[str]) -> Optional[str]:
        if not ref or not pool: return None
        def norm(x: str) -> str:
            x = x.lower()
            x = re.sub(r"(_dup\d+|_var_[0-9a-f]+)$","", x)
            if x.startswith("epsm_"): x = x[5:]
            x = re.sub(r"\s*\(copy\)$","", x)
            return x.strip()
        nref = norm(ref)
        for p in pool:
            if norm(p) == nref: return p
        rtoks = set(re.split(r"[^0-9a-zA-Z]+", nref)) - {""}
        best = None; best_s = 0
        for p in pool:
            toks = set(re.split(r"[^0-9a-zA-Z]+", norm(p))) - {""}
            s = len(rtoks & toks)
            if s > best_s: best_s = s; best = p
        return best if best_s > 0 else None

# ---------- legacy-compatible parametric helper ----------
def generate_parametric_idfs(base_idf_content: str, construction_sets: List[dict]) -> List[Tuple[str, dict]]:
    """
    Given a base IDF content string and a list of construction sets,
    generate a list of IDF content strings, each with a different construction set assigned.
    Returns a list of (idf_content, construction_set) tuples. (Backward compatible)
    """
    out: List[Tuple[str, dict]] = []
    for cs in construction_sets:
        editor = IdfParser(base_idf_content)
        editor.insert_construction_set(cs)
        out.append((editor.to_string(), cs))
    return out
