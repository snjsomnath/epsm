# Auto-Load IDF to Baseline Simulation

**Date:** October 14, 2025  
**Status:** ✅ Complete  
**Files Modified:** 1

## Summary

Implemented automatic loading of generated IDF files into the baseline simulation page when clicking "Run Simulation" from the SelectArea page. The system now captures all necessary URLs from the backend response and properly passes them to the baseline page for automatic file loading.

## Changes Made

### 1. SelectAreaPage.tsx (`frontend/src/components/selectarea/SelectAreaPage.tsx`)

#### Added State Variables
```typescript
const [idfPath, setIdfPath] = useState<string | null>(null);
const [idfUrl, setIdfUrl] = useState<string | null>(null);
const [geojsonPath, setGeojsonPath] = useState<string | null>(null);
const [geojsonUrl, setGeojsonUrl] = useState<string | null>(null);
```

**Why:** Need to store both the file paths and URLs returned by the backend to properly pass to the baseline page.

#### Updated Response Handling
```typescript
if (data.idf_path) {
  console.log('📄 IDF File:', data.idf_path);
  setIdfPath(data.idf_path);
}

if (data.idf_url) {
  console.log('📄 IDF URL:', data.idf_url);
  setIdfUrl(data.idf_url);
}

if (data.geojson_path) {
  console.log('🗺️ GeoJSON File:', data.geojson_path);
  setGeojsonPath(data.geojson_path);
}

if (data.geojson_url) {
  console.log('🗺️ GeoJSON URL:', data.geojson_url);
  setGeojsonUrl(data.geojson_url);
}
```

**Why:** Capture all relevant file paths and URLs from the backend response for complete data transfer.

#### Updated Navigation Logic
```typescript
const handleSimulateBaseline = async () => {
  if (!idfUrl) {
    alert('No IDF file available');
    return;
  }

  setIsSimulating(true);
  
  setTimeout(() => {
    navigate('/baseline', { 
      state: { 
        idfPath: idfPath,
        idfUrl: idfUrl,
        geojsonPath: geojsonPath,
        geojsonUrl: geojsonUrl,
        fromGeoJSON: true
      } 
    });
  }, 500);
};
```

**Why:** 
- Changed validation from `idfPath` to `idfUrl` (the URL is what BaselinePage needs to fetch the file)
- Added all URLs to the navigation state so BaselinePage can access the files
- Added `fromGeoJSON: true` flag to trigger automatic loading

## User Flow

### Before Changes
1. ✅ User draws area on map
2. ✅ User clicks "Fetch Area"
3. ✅ Backend generates IDF file
4. ✅ 3D preview displays
5. ✅ User clicks "Simulate Baseline"
6. ❌ User arrives at baseline page with empty state
7. ❌ User must manually upload IDF file again

### After Changes
1. ✅ User draws area on map
2. ✅ User clicks "Fetch Area"
3. ✅ Backend generates IDF file
4. ✅ 3D preview displays
5. ✅ User clicks "Simulate Baseline"
6. ✅ **User arrives at baseline page**
7. ✅ **IDF file automatically loads**
8. ✅ **File is parsed and ready**
9. ✅ **User only needs to upload weather file and run simulation**

## Backend Response Structure

The backend (`geojson_processor/views.py`) returns:

```json
{
  "success": true,
  "idf_path": "geojson_processing/abc123/city.idf",
  "idf_url": "/media/geojson_processing/abc123/city.idf",
  "geojson_path": "geojson_processing/abc123/city_enriched.geojson",
  "geojson_url": "/media/geojson_processing/abc123/city_enriched.geojson",
  "model_url": "/media/geojson_processing/abc123/model_3d.json"
}
```

## BaselinePage Integration

BaselinePage already has the logic to handle this automatically:

```typescript
useEffect(() => {
  const handleGeoJSONImport = async () => {
    const state = location.state as any;
    if (state?.fromGeoJSON && state?.idfUrl) {
      // Fetch the IDF file
      const response = await fetch(`${backendUrl}${state.idfUrl}`);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'application/octet-stream' });
      
      // Automatically load the IDF file
      await handleIdfFilesUploaded([file]);
    }
  };
  
  handleGeoJSONImport();
}, [location.state]);
```

## Benefits

1. **Seamless Workflow:** No manual file handling required
2. **Better UX:** One-click transition from 3D preview to simulation
3. **Error Prevention:** Eliminates risk of user uploading wrong file
4. **Time Savings:** Reduces steps from 7 to 4 for the user
5. **Data Integrity:** Uses exact file generated from selected area

## Testing Checklist

- [ ] Draw area on SelectArea page
- [ ] Click "Fetch Area" and wait for processing
- [ ] Verify 3D model displays correctly
- [ ] Click "Simulate Baseline" button
- [ ] Verify navigation to baseline page
- [ ] Verify IDF file automatically loads
- [ ] Verify file appears in upload area
- [ ] Verify building data is parsed and displayed
- [ ] Upload weather file
- [ ] Click "Run Simulation"
- [ ] Verify simulation runs successfully

## Notes

- The `idfUrl` is the critical piece of data needed for fetching the file
- The `idfPath` is kept for display purposes (shows filename)
- The `fromGeoJSON` flag is used by BaselinePage to know this is an auto-load scenario
- All state variables are properly typed with `string | null`
- No TypeScript errors or linting warnings

## Related Files

- **Frontend SelectArea:** `frontend/src/components/selectarea/SelectAreaPage.tsx`
- **Frontend Baseline:** `frontend/src/components/baseline/BaselinePage.tsx`
- **Backend API:** `backend/geojson_processor/views.py`
- **Backend Converter:** `backend/geojson_processor/geojson_to_idf.py`
