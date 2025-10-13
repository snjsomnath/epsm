# Integration Guide: GeoJSON Processor → Baseline

## Current Status

The GeoJSON processor generates IDF files from map selections, but doesn't automatically create baseline entries or navigate to the baseline page.

## What's Already Done

1. ✅ API endpoint (`/api/process-geojson/`) generates IDF files
2. ✅ Frontend SelectAreaPage calls the API
3. ✅ Processing dialog shows progress
4. ✅ Files stored in `media/geojson_processing/`

## What's Missing

1. ❌ Automatic navigation to baseline page
2. ❌ Pre-loading generated IDF into baseline form
3. ❌ Association with user account
4. ❌ Adding to baseline history

## Implementation Steps

### Option 1: Redirect with File Path (Recommended)

**In `SelectAreaPage.tsx`, update success handler:**

```typescript
if (data.success) {
  setProcessingStatus('IDF files generated successfully!');
  setProcessComplete(true);
  
  // Wait 2 seconds, then navigate to baseline with file info
  setTimeout(() => {
    // Use React Router to navigate
    navigate('/baseline', {
      state: {
        generatedIdf: {
          path: data.idf_path,
          url: data.idf_url,
          source: 'dtcc',
          bounds: drawnArea.bounds
        }
      }
    });
  }, 2000);
}
```

**In `BaselinePage.tsx`, handle incoming file:**

```typescript
import { useLocation } from 'react-router-dom';

const BaselinePage = () => {
  const location = useLocation();
  const generatedIdf = location.state?.generatedIdf;
  
  useEffect(() => {
    if (generatedIdf) {
      // Fetch the generated IDF file
      fetchGeneratedIdf(generatedIdf.url);
    }
  }, [generatedIdf]);
  
  const fetchGeneratedIdf = async (url: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], 'city.idf', { type: 'application/octet-stream' });
    
    // Set as uploaded file
    setUploadedFiles([file]);
    
    // Parse the IDF
    const { data, error } = await parseIdfFiles([file]);
    if (!error) {
      setParsedData(data);
    }
    
    // Show notification
    alert('IDF file from map selection loaded!');
  };
};
```

### Option 2: Auto-Create Baseline Entry

**Modify backend to auto-create simulation:**

```python
# In geojson_processor/views.py, after IDF generation:

from simulation.models import Simulation, SimulationFile

# Create simulation record
simulation = Simulation.objects.create(
    user=request.user if request.user.is_authenticated else None,
    name=f"DTCC Area {work_id[:8]}",
    description=f"Generated from map selection: N={north}, S={south}, E={east}, W={west}",
    status='pending'
)

# Create simulation file record
SimulationFile.objects.create(
    simulation=simulation,
    file_path=str(relative_idf_path),
    file_name='city.idf',
    file_type='idf',
    original_name='city.idf'
)

# Return simulation ID in response
return JsonResponse({
    'success': True,
    'simulation_id': str(simulation.id),
    'idf_path': str(relative_idf_path),
    ...
})
```

**Then redirect to simulation detail:**

```typescript
// In SelectAreaPage.tsx
navigate(`/simulation/${data.simulation_id}`);
```

### Option 3: Store in Context (Simplest)

**Use SimulationContext to share files:**

```typescript
// In SelectAreaPage.tsx
import { useSimulation } from '../../context/SimulationContext';

const { setUploadedFiles } = useSimulation();

// After success
const file = await fetchFile(data.idf_url);
setUploadedFiles([file]);
navigate('/baseline');
```

**BaselinePage automatically picks up from context.**

## Recommended Approach

**Use Option 1 (Redirect with File Path)** because:

1. ✅ Clean separation of concerns
2. ✅ No backend changes needed
3. ✅ Works with existing context system
4. ✅ User can see the baseline page loading
5. ✅ Easy to add EPW selection prompt

## Full Implementation Example

### 1. Update `SelectAreaPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom';

const SelectAreaPage = () => {
  const navigate = useNavigate();
  // ... existing state ...
  
  const handleFetchArea = async () => {
    // ... existing code ...
    
    if (data.success) {
      setProcessingStatus('IDF files generated successfully!');
      setProcessComplete(true);
      
      // Store the IDF info in sessionStorage for easy retrieval
      sessionStorage.setItem('generatedIdf', JSON.stringify({
        path: data.idf_path,
        url: data.idf_url,
        bounds: drawnArea.bounds,
        timestamp: new Date().toISOString()
      }));
      
      // Navigate after 2 seconds
      setTimeout(() => {
        navigate('/baseline');
      }, 2000);
    }
  };
};
```

### 2. Update `BaselinePage.tsx`

```typescript
useEffect(() => {
  // Check for generated IDF from map selection
  const generatedIdfStr = sessionStorage.getItem('generatedIdf');
  if (generatedIdfStr) {
    const generatedIdf = JSON.parse(generatedIdfStr);
    sessionStorage.removeItem('generatedIdf'); // Clear after use
    
    // Load the IDF file
    loadGeneratedIdf(generatedIdf);
  }
}, []);

const loadGeneratedIdf = async (idfInfo: any) => {
  try {
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}${idfInfo.url}`);
    
    if (!response.ok) throw new Error('Failed to fetch IDF');
    
    const blob = await response.blob();
    const file = new File([blob], 'city.idf', { 
      type: 'application/octet-stream' 
    });
    
    // Handle like a normal upload
    handleIdfFilesUploaded([file]);
    
    // Show notification
    console.log('Loaded IDF from map selection:', idfInfo.bounds);
  } catch (err) {
    console.error('Failed to load generated IDF:', err);
  }
};
```

### 3. Add EPW Prompt (Optional)

After loading IDF, prompt for weather file:

```typescript
// Show alert or dialog
alert('IDF loaded! Please select a weather file (EPW) to continue.');

// Or automatically select nearest EPW based on bounds
const epwFile = await selectNearestEPW(idfInfo.bounds);
if (epwFile) {
  handleWeatherFileUploaded(epwFile);
}
```

## Testing the Integration

1. **Start services:**
   ```bash
   ./scripts/start.sh
   ```

2. **Navigate to Select Area page:**
   - http://localhost:5173/select-area

3. **Draw area on map:**
   - Use rectangle or polygon tool
   - Draw over Sweden (e.g., Gothenburg)

4. **Click "Fetch Area":**
   - Watch processing dialog
   - Wait for "Success!"

5. **Should auto-navigate to Baseline:**
   - IDF should be pre-loaded
   - Ready to add weather file and run

6. **Verify files created:**
   ```bash
   ls backend/media/geojson_processing/
   ```

## Future Enhancements

1. **Weather File Auto-Selection:**
   - Match bounds to nearest EPW file
   - Prompt user to confirm or change

2. **Simulation Auto-Run:**
   - After IDF + EPW loaded, auto-start simulation
   - Skip baseline page entirely for quick results

3. **History Tracking:**
   - Save map selections to user history
   - Allow re-generating same area

4. **Batch Processing:**
   - Select multiple areas
   - Generate multiple IDF files
   - Run as scenario variants

5. **Area Comparison:**
   - Compare energy performance of different areas
   - Visualize on map

## Questions?

- Check `docs/GEOJSON_PROCESSOR_IMPLEMENTATION.md` for full details
- See `backend/geojson_processor/README.md` for API docs
- Review `SelectAreaPage.tsx` for current implementation
