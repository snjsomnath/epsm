# L-Shaped Floor Triangulation Fix

**Date:** October 14, 2025
**Issue:** L-shaped and other non-convex floor surfaces were rendering incorrectly in the 3D viewer, with missing vertices/sections.

## Problem Analysis

### Root Cause
The 3D viewer was using **fan triangulation** to convert polygon surfaces into triangles for rendering:

```typescript
// OLD CODE - Fan triangulation (only works for convex polygons)
for (let i = 1; i < surface.vertices.length - 1; i++) {
  indices.push(0, i, i + 1);
}
```

This approach:
- ✅ Works perfectly for **convex polygons** (triangles, rectangles)
- ❌ **Fails for non-convex polygons** (L-shapes, U-shapes, complex geometries)
- Creates incorrect triangles that overlap or miss parts of the surface

### Data Investigation

Analysis of the IDF files showed:
- **Most surfaces:** 4 vertices (rectangular - 7,796 surfaces)
- **Complex surfaces:** 5-48 vertices (1,068 surfaces)
  - 7-vertex floors: 96 instances (L-shaped floors)
  - 48-vertex surfaces: 12 instances (very complex geometry)

The vertex parsing was working correctly - all vertices were being extracted. The problem was purely in the triangulation step.

## Solution Implemented

### 1. Backend Enhancement

**File:** `backend/geojson_processor/model_3d_generator.py`

Added metadata to flag surfaces needing triangulation:

```python
# Flag surfaces that might need triangulation (> 4 vertices)
needs_triangulation = len(vertices) > 4

return {
    'name': surface_name,
    'type': surface_type,
    'zone': zone_name,
    'color': color,
    'vertices': vertices,
    'index': index,
    'needs_triangulation': needs_triangulation  # New field
}
```

Also added summary statistics:

```python
'metadata': {
    ...
    'triangulation_needed': triangulation_count,
    'max_vertices': max_vertices
}
```

### 2. Frontend Triangulation Fix

**File:** `frontend/src/components/selectarea/ModelViewer3D.tsx`

Installed earcut library for proper polygon triangulation:
```bash
npm install earcut @types/earcut
```

Replaced fan triangulation with **proper polygon triangulation**:

```typescript
if (surface.vertices.length === 3) {
  // Triangle - no triangulation needed
  indices.push(0, 1, 2);
} else if (surface.vertices.length === 4) {
  // Quad - simple triangulation (two triangles)
  indices.push(0, 1, 2, 0, 2, 3);
} else {
  // Complex polygon - use earcut for proper triangulation
  
  // 1. Calculate surface normal
  const normal = calculateNormal(surface.vertices);
  
  // 2. Project to 2D (earcut works in 2D)
  const flatVertices = projectTo2D(surface.vertices, normal);
  
  // 3. Triangulate using earcut
  const triangleIndices = earcut(flatVertices);
  indices.push(...triangleIndices);
}
```

### How Earcut Works

Earcut is a robust 2D polygon triangulation library:

1. **Input:** Flat array of 2D coordinates `[x1, y1, x2, y2, ...]`
2. **Process:** Uses ear clipping algorithm to decompose polygon into triangles
3. **Output:** Array of vertex indices forming triangles `[i1, i2, i3, i4, i5, i6, ...]`

Since surfaces are 3D, we:
1. Calculate the surface normal vector
2. Determine the best projection plane (XY, XZ, or YZ)
3. Project vertices to 2D
4. Triangulate in 2D
5. Use indices to create 3D triangles

## Testing

Created test scripts to verify the fix:

### Test 1: Vertex Count Analysis
```bash
python3 backend/test_floor_vertices.py
```

Results:
- Found 802 floor surfaces
- Vertex distribution: 4 to 48 vertices
- Confirmed 96 floors with 7 vertices (L-shaped)

### Test 2: Parser Verification
```bash
python3 backend/test_3d_parse_floors.py
```

Results:
- All 37,637 surfaces parsed correctly
- All vertices extracted properly
- Example 7-vertex floor parsed with all coordinates intact

## Window Z-Fighting Fix (Bonus)

Also fixed z-fighting issue where windows were coplanar with walls:

```python
def _offset_windows(self, surfaces_data):
    """Offset windows slightly along surface normal to prevent z-fighting."""
    offset_distance = 0.05  # 5cm offset
    
    for surface in surfaces_data:
        if surface['type'] in ['window', 'glassdoor']:
            # Calculate surface normal using cross product
            normal = calculate_normal(surface['vertices'])
            
            # IMPORTANT: Reverse normal for windows
            # EnergyPlus fenestration surfaces have normals pointing inward
            # We reverse to offset windows outward (away from building interior)
            normal = -normal
            
            # Offset all vertices along the (reversed) normal
            for vertex in surface['vertices']:
                vertex += normal * offset_distance
```

**Direction Fix:** Initial implementation offset windows inward (wrong direction). Fixed by reversing the normal vector to push windows outward from the building.

## Files Modified

### Backend
- `backend/geojson_processor/model_3d_generator.py`
  - Added `_offset_windows()` method for window z-fighting fix
  - Added `needs_triangulation` flag to surface data
  - Added triangulation statistics to metadata

### Frontend
- `frontend/src/components/selectarea/ModelViewer3D.tsx`
  - Imported earcut library
  - Replaced fan triangulation with proper earcut-based triangulation
  - Added 2D projection logic for complex polygons

### Package Dependencies
- `frontend/package.json`
  - Added `earcut` and `@types/earcut`

## Impact

### Before Fix
- ❌ L-shaped floors rendered with missing sections
- ❌ Complex geometries (>4 vertices) displayed incorrectly
- ❌ Windows had z-fighting artifacts with walls

### After Fix
- ✅ All floor shapes render correctly (convex and non-convex)
- ✅ Complex geometries up to 48 vertices triangulated properly
- ✅ Windows offset slightly from walls (no z-fighting)
- ✅ Proper handling of all surface types

## Technical Details

### Earcut Algorithm
- **Type:** Ear clipping triangulation
- **Complexity:** O(n²) worst case, O(n log n) typical
- **Robustness:** Handles holes, self-intersections, and degenerate cases
- **Output:** Optimal triangle count (n-2 triangles for n vertices)

### Projection Strategy
```typescript
// Determine projection plane based on surface normal
if (absZ >= absX && absZ >= absY) {
  // Project onto XY plane (floor/ceiling)
  flatVertices = [x1, y1, x2, y2, ...]
} else if (absY >= absX && absY >= absZ) {
  // Project onto XZ plane (horizontal walls)
  flatVertices = [x1, z1, x2, z2, ...]
} else {
  // Project onto YZ plane (vertical walls)
  flatVertices = [y1, z1, y2, z2, ...]
}
```

## Verification Checklist

- [x] Parse IDF files with complex floor geometries
- [x] Verify all vertices are extracted correctly
- [x] Confirm triangulation works for 3, 4, and >4 vertex surfaces
- [x] Test L-shaped floors (7 vertices)
- [x] Test very complex surfaces (48 vertices)
- [x] Verify windows are offset correctly
- [x] Check 3D visualization in frontend
- [x] Ensure no TypeScript errors
- [x] Verify earcut library installed

## Future Enhancements

1. **Performance Optimization**
   - Cache triangulation results for identical geometries
   - Use instancing for repeated floor patterns

2. **Visualization Improvements**
   - Color-code surfaces by vertex count
   - Add debug mode to show triangulation edges
   - Display normal vectors for verification

3. **Robustness**
   - Handle degenerate polygons (colinear vertices)
   - Detect and fix self-intersecting polygons
   - Add validation for winding order

## References

- **Earcut Library:** https://github.com/mapbox/earcut
- **Ear Clipping Algorithm:** https://en.wikipedia.org/wiki/Polygon_triangulation#Ear_clipping_method
- **EnergyPlus IDF Format:** https://bigladdersoftware.com/epx/docs/
- **Three.js BufferGeometry:** https://threejs.org/docs/#api/en/core/BufferGeometry
