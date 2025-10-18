import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { 
  MapIcon, 
  Trash2, 
  Download, 
  CheckCircle, 
  Building, 
  Database, 
  Settings, 
  Box as BoxIcon, 
  Palette
} from 'lucide-react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { FeatureGroup as LeafletFeatureGroup } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { buildUrl } from '../../lib/auth-api';

// Helper to get CSRF token
const getCSRFToken = async (): Promise<string> => {
  try {
    const response = await fetch(buildUrl('/api/auth/csrf/'), {
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn('Failed to fetch CSRF token, status:', response.status);
      return '';
    }
    const data = await response.json();
    return data.csrfToken || '';
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
    return '';
  }
};

// Helper function to call backend validation API
const validateAreasAPI = async (downloadArea: DrawnArea | null, simulationArea: DrawnArea | null) => {
  try {
    const csrfToken = await getCSRFToken();
    
    const response = await fetch(buildUrl('/api/geojson/validate-areas/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken && { 'X-CSRFToken': csrfToken }),
      },
      credentials: 'include',
      body: JSON.stringify({
        download_area: downloadArea ? {
          type: downloadArea.type,
          coordinates: downloadArea.coordinates,
          bounds: downloadArea.bounds
        } : null,
        simulation_area: simulationArea ? {
          type: simulationArea.type,
          coordinates: simulationArea.coordinates,
          bounds: simulationArea.bounds
        } : null
      })
    });

    if (!response.ok) {
      throw new Error(`Validation API returned ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Validation API error:', error);
    return {
      valid: false,
      errors: [`Validation service error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      details: {}
    };
  }
};
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import { authenticatedFetch } from '../../lib/auth-api';
import ModelViewer3D from './ModelViewer3D';

// Fix Leaflet default marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Types
type BasemapType = 'osm' | 'satellite' | 'terrain' | 'cartodark' | 'cartolight';

interface DrawnArea {
  type: 'rectangle' | 'polygon';
  coordinates: [number, number][];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  area?: number;
  layer?: L.Layer;
}

interface AreaSelection {
  downloadArea: DrawnArea | null;  // Outer box - area to download from DTCC
  simulationArea: DrawnArea | null;  // Inner box - area to simulate
}

// Basemap configurations (all free, no API keys needed)
const basemapConfigs = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'Street'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    name: 'Satellite'
  },
  terrain: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    name: 'Terrain'
  },
  cartodark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
    name: 'Dark'
  },
  cartolight: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
    name: 'Light'
  }
};

// Component to handle drawing controls
const DrawingControls = ({ 
  onDrawCreated, 
  onDrawDeleted,
  onDrawEdited,
  featureGroupRef 
}: { 
  onDrawCreated: (layer: L.Layer, type: string) => void;
  onDrawDeleted: (e?: any) => void;
  onDrawEdited: (e?: any) => void;
  featureGroupRef: React.RefObject<LeafletFeatureGroup>;
}) => {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;

    // Enable Geoman controls
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawMarker: false,
      drawText: false,
      cutPolygon: false,
    });

    // Handle layer creation
    map.on('pm:create', (e: any) => {
      const layer = e.layer;
      const shape = e.shape;
      
      // Add to feature group without clearing (so we can have both areas visible)
      if (featureGroupRef.current) {
        featureGroupRef.current.addLayer(layer);
      }
      
      onDrawCreated(layer, shape);
    });

    // Handle layer removal - pass the event with layer info
    map.on('pm:remove', (e: any) => {
      onDrawDeleted(e);
    });

    // Handle layer edit in progress - fires while dragging vertices
    map.on('pm:edit', (e: any) => {
      console.log('✏️ Edit in progress (pm:edit event)', e);
      console.log('   Layer being edited:', e.layer);
      console.log('   Shape:', e.shape);
    });

    // Handle layer edit completion - fires when user clicks "Finish" button
    map.on('pm:update', (e: any) => {
      console.log('🔄 Edit finished (pm:update event)');
      onDrawEdited(e);
    });

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
      map.off('pm:edit');
      map.off('pm:update');
    };
  }, [map, onDrawCreated, onDrawDeleted, onDrawEdited, featureGroupRef]);

  return null;
};

const SelectAreaPage = () => {
  const navigate = useNavigate();
  const [basemapType, setBasemapType] = useState<BasemapType>('osm');
  const [downloadArea, setDownloadArea] = useState<DrawnArea | null>(null);
  const [simulationArea, setSimulationArea] = useState<DrawnArea | null>(null);
  const [currentDrawingMode, setCurrentDrawingMode] = useState<'download' | 'simulation'>('download');
  const [processing, setProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [idfPath, setIdfPath] = useState<string | null>(null);
  const [idfUrl, setIdfUrl] = useState<string | null>(null);
  const [geojsonPath, setGeojsonPath] = useState<string | null>(null);
  const [geojsonUrl, setGeojsonUrl] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [terrainUrl, setTerrainUrl] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const featureGroupRef = useRef<LeafletFeatureGroup>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Constants
  const MAX_DOWNLOAD_AREA_KM2 = 5;  // Maximum download area in km²
  const MIN_SIMULATION_AREA_M2 = 100;  // Minimum simulation area in m²

  // Validation function - calls backend API for accurate geospatial validation
  // Note: This function directly uses the state variables, not via useCallback,
  // to ensure it always gets the latest values when called
  const validateAreas = async (): Promise<string[]> => {
    try {
      console.log('🔍 Calling backend validation API...');
      console.log('   Download area coordinates:', downloadArea?.coordinates);
      console.log('   Simulation area coordinates:', simulationArea?.coordinates);
      
      const result = await validateAreasAPI(downloadArea, simulationArea);
      
      console.log('✅ Validation result:', result);
      
      // Update area details if provided by backend
      if (result.details) {
        if (result.details.download_area_km2 !== undefined && downloadArea) {
          console.log(`📊 Download area (backend): ${result.details.download_area_km2} km²`);
        }
        if (result.details.simulation_area_km2 !== undefined && simulationArea) {
          console.log(`📊 Simulation area (backend): ${result.details.simulation_area_km2} km²`);
        }
        if (result.details.containment_check !== undefined) {
          console.log(`🔒 Containment check: ${result.details.containment_check}`);
        }
      }
      
      return result.errors || [];
    } catch (error) {
      console.error('❌ Validation error:', error);
      return [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }
  };

  // Auto-validate whenever areas change
  React.useEffect(() => {
    if (downloadArea || simulationArea) {
      console.log('🔍 Areas changed, running validation...');
      console.log('Download area:', downloadArea?.bounds);
      console.log('Simulation area:', simulationArea?.bounds);
      
      // Call async validation
      validateAreas().then(errors => {
        setValidationErrors(errors);
        
        if (errors.length > 0) {
          console.warn('⚠️ Validation errors detected:', errors);
        } else {
          console.log('✅ All validations passed');
        }
      });
    } else {
      // Clear validation errors when both areas are cleared
      setValidationErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadArea, simulationArea]); // Re-run whenever areas change

  // Processing steps for animation
  const processingSteps = [
    { 
      icon: <Database size={32} />, 
      label: 'Downloading building footprints from DTCC', 
      description: 'Fetching 3D city data from Swedish national database...', 
      color: '#2e7d32' 
    },
    { 
      icon: <Building size={32} />, 
      label: 'Generating 3D building geometries', 
      description: 'Creating thermal zones and floor plans...', 
      color: '#1976d2' 
    },
    { 
      icon: <Settings size={32} />, 
      label: 'Configuring EnergyPlus model', 
      description: 'Setting up constructions, materials, and HVAC systems...', 
      color: '#f57c00' 
    },
    { 
      icon: <BoxIcon size={32} />, 
      label: 'Parsing IDF for visualization', 
      description: 'Extracting surfaces, windows, and building elements...', 
      color: '#7b1fa2' 
    },
    { 
      icon: <Palette size={32} />, 
      label: 'Rendering 3D preview', 
      description: 'Coloring walls, roofs, floors, and windows by type...', 
      color: '#d32f2f' 
    }
  ];

  // Sweden center coordinates: ~62.0° N, 15.0° E
  const swedenCenter: [number, number] = [57.68787935473798, 11.976315686737735];
  const defaultZoom = 15;

  const handleBasemapChange = (
    _event: React.MouseEvent<HTMLElement>,
    newBasemap: BasemapType | null
  ) => {
    if (newBasemap !== null) {
      setBasemapType(newBasemap);
    }
  };

  // Helper function for point-in-polygon check (no longer used but kept for reference)
  const isPolygonInsidePolygon = (inner: [number, number][], outer: [number, number][]): boolean => {
    // Simple point-in-polygon check for all inner points
    const pointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][1], yi = polygon[i][0];  // [lat, lon] -> use lon for x
        const xj = polygon[j][1], yj = polygon[j][0];
        const x = point[1], y = point[0];  // point is [lat, lon]
        
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };
    
    // Check if all points of inner polygon are inside outer polygon
    return inner.every(point => pointInPolygon(point, outer));
  };

  const handleDrawCreated = (layer: L.Layer, type: string) => {
    // Check if we already have 2 areas drawn
    if (downloadArea && simulationArea) {
      // Remove the extra layer immediately
      if (featureGroupRef.current && layer) {
        featureGroupRef.current.removeLayer(layer);
      }
      setValidationErrors(['Maximum 2 areas allowed. Please clear existing areas first if you want to redraw.']);
      return;
    }

    let coordinates: [number, number][] = [];
    let bounds;
    let area = 0;

    if (type === 'Rectangle' && layer instanceof L.Rectangle) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
      bounds = layer.getBounds();
      // Calculate area using bounds (more reliable)
      area = calculateAreaFromBounds(bounds);
    } else if (type === 'Polygon' && layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
      bounds = layer.getBounds();
      // Try geodesic area first, fallback to bounds calculation
      area = (L as any).GeometryUtil?.geodesicArea?.(latLngs) || calculateAreaFromBounds(bounds);
    }

    const drawnAreaData: DrawnArea = {
      type: type.toLowerCase() as 'rectangle' | 'polygon',
      coordinates,
      bounds: bounds ? {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      } : undefined,
      area,
      layer
    };

    // Determine which area to set based on what's already drawn
    if (!downloadArea) {
      // First drawing - set as download area (orange)
      if (layer instanceof L.Path) {
        layer.setStyle({ color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 0.2, weight: 3 });
      }
      
      // Add layer-specific event listeners to capture edits
      (layer as any).on('pm:edit', () => {
        console.log('📝 Download area being edited (layer pm:edit)');
      });
      
      (layer as any).on('pm:update', () => {
        console.log('✅ Download area edit finished (layer pm:update)');
        // Call the edit handler with the layer
        handleDrawEdited({ layer });
      });
      
      setDownloadArea(drawnAreaData);
      setCurrentDrawingMode('simulation');
      console.log('✅ Download area set (orange)', `Area: ${(area / 1_000_000).toFixed(3)} km²`);
    } else if (!simulationArea) {
      // Second drawing - set as simulation area (green)
      if (layer instanceof L.Path) {
        layer.setStyle({ color: '#4caf50', fillColor: '#4caf50', fillOpacity: 0.3, weight: 3 });
      }
      
      // Add layer-specific event listeners to capture edits
      (layer as any).on('pm:edit', () => {
        console.log('📝 Simulation area being edited (layer pm:edit)');
      });
      
      (layer as any).on('pm:update', () => {
        console.log('✅ Simulation area edit finished (layer pm:update)');
        // Call the edit handler with the layer
        handleDrawEdited({ layer });
      });
      
      setSimulationArea(drawnAreaData);
      console.log('✅ Simulation area set (green)', `Area: ${(area / 1_000_000).toFixed(3)} km²`);
    }

    // Validation will happen automatically via useEffect
  };

  // Helper function to calculate area from bounds (approximate, in square meters)
  const calculateAreaFromBounds = (bounds: L.LatLngBounds): number => {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();
    
    // Convert to approximate meters (rough calculation for small areas)
    const latDiff = north - south;
    const lonDiff = east - west;
    
    // Average latitude for more accurate calculation
    const avgLat = (north + south) / 2;
    const latToMeters = 111320; // meters per degree latitude
    const lonToMeters = 111320 * Math.cos(avgLat * Math.PI / 180); // meters per degree longitude
    
    const heightMeters = latDiff * latToMeters;
    const widthMeters = lonDiff * lonToMeters;
    
    return heightMeters * widthMeters; // area in square meters
  };

  const handleDrawDeleted = (e?: any) => {
    // More sophisticated delete handling
    if (!e || !e.layer) {
      // If no specific layer info, clear everything
      setDownloadArea(null);
      setSimulationArea(null);
      setCurrentDrawingMode('download');
      setValidationErrors([]);
      return;
    }

    const deletedLayer = e.layer;
    
    // Check which area was deleted by comparing layer references
    if (downloadArea?.layer === deletedLayer) {
      console.log('🗑️ Download area deleted');
      setDownloadArea(null);
      // If download area is deleted, also clear simulation area (it depends on download area)
      if (simulationArea?.layer && featureGroupRef.current) {
        featureGroupRef.current.removeLayer(simulationArea.layer);
      }
      setSimulationArea(null);
      setCurrentDrawingMode('download');
    } else if (simulationArea?.layer === deletedLayer) {
      console.log('🗑️ Simulation area deleted');
      setSimulationArea(null);
      // Don't change mode - still in simulation mode, can redraw simulation area
    }
    
    setValidationErrors([]);
  };

  const handleDrawEdited = (e?: any) => {
    if (!e || !e.layer) {
      console.warn('⚠️ Edit event missing layer info:', e);
      return;
    }

    const editedLayer = e.layer;
    console.log('✏️ Area editing finished (pm:update), updating bounds and revalidating...');
    console.log('Edited layer:', editedLayer);

    // Helper function to update area data from layer
    const updateAreaFromLayer = (layer: L.Layer): DrawnArea | null => {
      let coordinates: [number, number][] = [];
      let bounds;
      let area = 0;
      let type: 'rectangle' | 'polygon' = 'polygon';

      if (layer instanceof L.Rectangle) {
        const latLngs = layer.getLatLngs()[0] as L.LatLng[];
        coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
        bounds = layer.getBounds();
        area = calculateAreaFromBounds(bounds);
        type = 'rectangle';
        console.log('📐 Rectangle area calculated:', area, 'm²');
      } else if (layer instanceof L.Polygon) {
        const latLngs = layer.getLatLngs()[0] as L.LatLng[];
        coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
        bounds = layer.getBounds();
        area = (L as any).GeometryUtil?.geodesicArea?.(latLngs) || calculateAreaFromBounds(bounds);
        type = 'polygon';
        console.log('📐 Polygon area calculated:', area, 'm²');
      } else {
        console.warn('⚠️ Unknown layer type:', layer);
      }

      if (!bounds) {
        console.error('❌ Failed to get bounds from layer');
        return null;
      }

      return {
        type,
        coordinates,
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        },
        area,
        layer
      };
    };

    // Check which area was edited and update it
    let updated = false;
    
    // Try to identify which area was edited by layer reference or color
    const layerColor = (editedLayer as any).options?.color;
    console.log('🎨 Layer color:', layerColor);
    console.log('🔍 Checking layer match...');
    console.log('   downloadArea layer:', downloadArea?.layer);
    console.log('   simulationArea layer:', simulationArea?.layer);
    console.log('   editedLayer:', editedLayer);
    console.log('   Layer match (download):', downloadArea?.layer === editedLayer);
    console.log('   Layer match (simulation):', simulationArea?.layer === editedLayer);
    
    // Match by layer reference OR by color (orange = download, green = simulation)
    const isDownloadArea = (downloadArea?.layer === editedLayer) || layerColor === '#ff6b35';
    const isSimulationArea = (simulationArea?.layer === editedLayer) || layerColor === '#4caf50';
    
    if (isDownloadArea) {
      const updatedArea = updateAreaFromLayer(editedLayer);
      if (updatedArea) {
        const areaKm2 = ((updatedArea.area || 0) / 1_000_000).toFixed(3);
        console.log(`✅ Download area updated - New area: ${areaKm2} km²`);
        console.log('Old coordinates:', downloadArea?.coordinates);
        console.log('New coordinates:', updatedArea.coordinates);
        // Force a new object to trigger React re-render
        setDownloadArea({ ...updatedArea });
        updated = true;
      }
    } else if (isSimulationArea) {
      const updatedArea = updateAreaFromLayer(editedLayer);
      if (updatedArea) {
        const areaKm2 = ((updatedArea.area || 0) / 1_000_000).toFixed(3);
        console.log(`✅ Simulation area updated - New area: ${areaKm2} km²`);
        console.log('Old coordinates:', simulationArea?.coordinates);
        console.log('New coordinates:', updatedArea.coordinates);
        // Force a new object to trigger React re-render
        setSimulationArea({ ...updatedArea });
        updated = true;
      }
    } else {
      console.warn('⚠️ Edited layer does not match any tracked area');
      console.warn('Layer color:', layerColor);
    }

    if (!updated) {
      console.error('❌ Failed to update area after edit');
      return;
    }

    // Validation will happen automatically via useEffect when state updates
  };

  const handleClearDrawing = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDownloadArea(null);
    setSimulationArea(null);
    setCurrentDrawingMode('download');
    setValidationErrors([]);
  };

  const handleFetchArea = async () => {
    // Validate that we have at least a download area
    if (!downloadArea || !downloadArea.bounds) {
      setValidationErrors(['Please draw a download area first (orange box).']);
      return;
    }

    // Run validation checks (async)
    const errors = await validateAreas();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setProcessing(true);
      setProcessComplete(false);
      setError(null);
      setProcessingStep(0);

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      // Prepare payload with download area bounds and optional simulation area
      const payload: any = {
        bounds: {
          north: downloadArea.bounds.north,
          south: downloadArea.bounds.south,
          east: downloadArea.bounds.east,
          west: downloadArea.bounds.west
        },
        filter_height_min: 3,
        filter_height_max: 100,
        filter_area_min: 100,
        use_multiplier: true  // Enable floor multipliers for faster generation and instanced rendering
      };

      // If simulation area exists, add it to payload
      if (simulationArea && simulationArea.bounds) {
        payload.simulation_bounds = {
          north: simulationArea.bounds.north,
          south: simulationArea.bounds.south,
          east: simulationArea.bounds.east,
          west: simulationArea.bounds.west
        };
      }

      // Simulate step progression for better UX
      console.log('🚀 Starting 3D model building process...');
      console.log('📍 Download area bounds:', payload.bounds);
      if (payload.simulation_bounds) {
        console.log('📍 Simulation area bounds:', payload.simulation_bounds);
        console.log('✅ Two-area mode: Buildings inside green box will be simulated, others will be context shading');
      } else {
        console.log('ℹ️ Single-area mode: All buildings will be simulated');
      }
      
      let stepInterval: NodeJS.Timeout | null = setInterval(() => {
        setProcessingStep(prev => {
          const next = prev + 1;
          if (next < processingSteps.length) {
            console.log(`📊 Processing step ${next + 1}/${processingSteps.length}: ${processingSteps[next].label}`);
            return next;
          }
          return prev;
        });
      }, 2000);
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout (Honeybee conversion can be slow)
      
      try {
        console.log('📡 Sending request to backend:', `${backendUrl}/api/geojson/process-geojson/`);
        console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        console.log('⏱️ Timeout set to 5 minutes (Honeybee conversion can be slow for multiple buildings)');
        
        const response = await authenticatedFetch(`${backendUrl}/api/geojson/process-geojson/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (stepInterval) {
          clearInterval(stepInterval);
          stepInterval = null;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          // Combine error and details for a more informative message
          const errorMessage = errorData.details 
            ? `${errorData.error}\n\n${errorData.details}`
            : (errorData.error || `Server returned ${response.status}: ${response.statusText}`);
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('✅ Backend response received:', data);
        
        if (data.success) {
          setProcessingStep(processingSteps.length - 1);
          setProcessComplete(true);
          
          // Log files being created during the 3D model building process
          console.group('📁 3D Model Building - Files Created');
          
          if (data.idf_path) {
            console.log('📄 IDF File:', data.idf_path);
            setIdfPath(data.idf_path);
          }
          
          if (data.idf_url) {
            console.log('📄 IDF URL:', data.idf_url);
            setIdfUrl(data.idf_url);
          }
          
          if (data.model_url) {
            console.log('🎨 3D Model File:', data.model_url);
          }
          
          if (data.geojson_path) {
            console.log('🗺️ GeoJSON File:', data.geojson_path);
            setGeojsonPath(data.geojson_path);
          }
          
          if (data.geojson_url) {
            console.log('🗺️ GeoJSON URL:', data.geojson_url);
            setGeojsonUrl(data.geojson_url);
          }
          
          if (data.buildings_count) {
            console.log('🏢 Buildings Processed:', data.buildings_count);
          }
          
          if (data.files) {
            console.log('📂 Additional Files:', data.files);
          }
          
          // Log any additional metadata
          const metadata = { ...data };
          delete metadata.success;
          delete metadata.idf_path;
          delete metadata.model_url;
          delete metadata.geojson_path;
          delete metadata.buildings_count;
          delete metadata.files;
          
          if (Object.keys(metadata).length > 0) {
            console.log('ℹ️ Additional Metadata:', metadata);
          }
          
          console.groupEnd();
          
          // Set the 3D model URL if available
          if (data.model_url) {
            // Construct full URL with backend base URL
            const fullModelUrl = data.model_url.startsWith('http') 
              ? data.model_url 
              : `${backendUrl}${data.model_url}`;
            
            console.log('✅ 3D Model ready for display:', fullModelUrl);
            setModelUrl(fullModelUrl);
            setShowViewer(true);
            
            // Smooth scroll to viewer after dialog closes
            setTimeout(() => {
              viewerRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }, 2000); // Wait for dialog to close
          } else {
            console.warn('⚠️ No model_url in response data');
          }
          
          // Set the terrain URL if available
          if (data.terrain_url) {
            const fullTerrainUrl = data.terrain_url.startsWith('http')
              ? data.terrain_url
              : `${backendUrl}${data.terrain_url}`;
            
            console.log('✅ Terrain mesh ready for display:', fullTerrainUrl);
            setTerrainUrl(fullTerrainUrl);
          } else {
            console.log('ℹ️ No terrain_url in response data (optional)');
          }
          
          // Close the dialog after showing success
          setTimeout(() => {
            setProcessComplete(false);
            setProcessing(false);
          }, 1500);
          
          // Don't auto-navigate anymore - let user review in viewer first
          // User will click "Simulate Baseline" button in viewer
        } else {
          throw new Error(data.error || 'Processing failed');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (stepInterval) {
          clearInterval(stepInterval);
          stepInterval = null;
        }
        
        // Handle specific error types
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. The area might be too large or the server is busy. Please try a smaller area or try again later.');
          } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('ERR_CONNECTION_RESET')) {
            throw new Error('Connection to server failed. The backend might be processing a large area and timed out. Please try a smaller area or check if the backend is running.');
          }
        }
        throw fetchError;
      }

    } catch (err) {
      console.error('Error fetching area:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to process area. Please check your connection and try again.';
      setError(errorMessage);
      setProcessComplete(false);
      setProcessing(false);
    }
  };

  const handleExportGeometry = () => {
    if (!downloadArea && !simulationArea) return;
    
    const features = [];
    
    if (downloadArea) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [downloadArea.coordinates.map((c: [number, number]) => [c[1], c[0]])]
        },
        properties: {
          type: downloadArea.type,
          area_type: 'download',
          bounds: downloadArea.bounds,
          area_sqm: downloadArea.area
        }
      });
    }
    
    if (simulationArea) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [simulationArea.coordinates.map((c: [number, number]) => [c[1], c[0]])]
        },
        properties: {
          type: simulationArea.type,
          area_type: 'simulation',
          bounds: simulationArea.bounds,
          area_sqm: simulationArea.area
        }
      });
    }

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-areas.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateBaseline = async () => {
    if (!idfUrl) {
      setValidationErrors(['No IDF file available. Please fetch area first.']);
      return;
    }

    setIsSimulating(true);
    
    // Small delay to show the simulating state
    setTimeout(() => {
      // Navigate to baseline page with IDF file info
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

  const formatArea = (area: number) => {
    // Always display in km² with comma separators
    const areaKm2 = area / 1_000_000;
    return `${areaKm2.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} km²`;
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Processing Dialog with Fun Animated Steps - Similar to EPSM Loading Animation */}
      <Dialog 
        open={processing || processComplete} 
        maxWidth="md" 
        fullWidth
        onClose={processComplete ? undefined : () => {
          // Allow closing only if there's an error
          if (error) {
            setProcessing(false);
            setProcessComplete(false);
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          {processComplete ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 1,
              animation: 'bounceIn 0.6s ease-out',
              '@keyframes bounceIn': {
                '0%': { transform: 'scale(0)', opacity: 0 },
                '50%': { transform: 'scale(1.15)', opacity: 1 },
                '100%': { transform: 'scale(1)', opacity: 1 }
              }
            }}>
              <CheckCircle size={32} style={{ color: '#2e7d32' }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                Processing Complete!
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 1,
              animation: 'shake 0.5s ease-out',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-10px)' },
                '75%': { transform: 'translateX(10px)' }
              }
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
                ⚠️ Processing Failed
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                Building Your 3D Model
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Creating your building energy simulation model
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          {error ? (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  animation: 'fadeIn 0.5s ease-in',
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(-10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                  {error}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This usually happens when:
                </Typography>
                <Box component="ul" sx={{ textAlign: 'left', mt: 1, pl: 2 }}>
                  <li>The selected area is too large or contains too many buildings</li>
                  <li>The DTCC service is temporarily unavailable</li>
                  <li>The backend server is still processing previous requests</li>
                </Box>
              </Alert>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button 
                  variant="contained" 
                  onClick={() => {
                    setError(null);
                    handleFetchArea();
                  }}
                  sx={{
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.05)' }
                    }
                  }}
                >
                  Retry
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setError(null);
                    setProcessing(false);
                    setProcessComplete(false);
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : !processComplete ? (
            <Box sx={{ mt: 2 }}>
              {/* Central animated icon with pulse rings */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mb: 4,
                position: 'relative',
                minHeight: 180
              }}>
                {/* Outer energy pulse rings */}
                {[0, 1, 2].map((ring) => (
                  <Box
                    key={ring}
                    sx={{
                      position: 'absolute',
                      width: 120 + ring * 40,
                      height: 120 + ring * 40,
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: processingSteps[processingStep]?.color || '#1976d2',
                      opacity: 0,
                      animation: `pulse ${2}s ease-out infinite`,
                      animationDelay: `${ring * 0.4}s`,
                      '@keyframes pulse': {
                        '0%': {
                          transform: 'scale(0.8)',
                          opacity: 0.7,
                        },
                        '100%': {
                          transform: 'scale(1.5)',
                          opacity: 0,
                        },
                      },
                    }}
                  />
                ))}

                {/* Center icon container with rotation */}
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    boxShadow: `0 0 40px ${processingSteps[processingStep]?.color || '#1976d2'}50`,
                    transition: 'all 0.8s ease-in-out',
                    border: '4px solid',
                    borderColor: processingSteps[processingStep]?.color || '#1976d2',
                    color: processingSteps[processingStep]?.color || '#1976d2',
                    animation: 'iconRotate 1s ease-in-out',
                    '@keyframes iconRotate': {
                      '0%': { transform: 'scale(0.8) rotate(-20deg)', opacity: 0.5 },
                      '50%': { transform: 'scale(1.1) rotate(10deg)', opacity: 1 },
                      '100%': { transform: 'scale(1) rotate(0deg)', opacity: 1 }
                    }
                  }}
                >
                  {processingSteps[processingStep]?.icon}
                </Box>
              </Box>

              {/* Status text */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{
                    color: processingSteps[processingStep]?.color || '#1976d2',
                    fontWeight: 600,
                    mb: 1,
                    animation: 'fadeSlide 0.6s ease-in-out',
                    '@keyframes fadeSlide': {
                      '0%': {
                        opacity: 0,
                        transform: 'translateY(10px)',
                      },
                      '100%': {
                        opacity: 1,
                        transform: 'translateY(0)',
                      },
                    },
                  }}
                >
                  {processingSteps[processingStep]?.label}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    animation: 'fadeIn 0.8s ease-in',
                    '@keyframes fadeIn': {
                      from: { opacity: 0 },
                      to: { opacity: 1 }
                    }
                  }}
                >
                  {processingSteps[processingStep]?.description}
                </Typography>
              </Box>

              {/* Progress bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ 
                  height: 8, 
                  bgcolor: 'action.hover', 
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${((processingStep + 1) / processingSteps.length) * 100}%`,
                      bgcolor: processingSteps[processingStep]?.color || '#1976d2',
                      borderRadius: 4,
                      transition: 'width 0.5s ease-in-out',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        animation: 'shimmer 1.5s infinite',
                        '@keyframes shimmer': {
                          '0%': { transform: 'translateX(-100%)' },
                          '100%': { transform: 'translateX(100%)' }
                        }
                      }
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  Step {processingStep + 1} of {processingSteps.length}
                </Typography>
              </Box>

              {/* Step indicators */}
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                {processingSteps.map((step, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: index < processingStep 
                        ? step.color 
                        : index === processingStep 
                        ? step.color 
                        : 'action.disabled',
                      opacity: index <= processingStep ? 1 : 0.3,
                      transition: 'all 0.3s ease-in-out',
                      animation: index === processingStep ? 'pulse-dot 1s ease-in-out infinite' : 'none',
                      '@keyframes pulse-dot': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.3)' }
                      }
                    }}
                  />
                ))}
              </Stack>

              {/* Floating animated chips for steps */}
              <Stack 
                direction="row" 
                spacing={1} 
                flexWrap="wrap" 
                useFlexGap 
                justifyContent="center" 
                sx={{ mt: 3 }}
              >
                {processingSteps.map((step, idx) => (
                  <Chip
                    key={idx}
                    icon={React.cloneElement(step.icon as React.ReactElement, { size: 16 })}
                    label={step.label.split(' ').slice(0, 3).join(' ')}
                    size="small"
                    sx={{
                      bgcolor: idx <= processingStep ? 'background.paper' : 'action.disabledBackground',
                      borderColor: idx <= processingStep ? step.color : 'action.disabled',
                      color: idx <= processingStep ? step.color : 'text.disabled',
                      border: '2px solid',
                      opacity: idx <= processingStep ? 1 : 0.4,
                      transition: 'all 0.3s ease-in-out',
                      animation: idx === processingStep ? 'float 2s ease-in-out infinite' : 'none',
                      animationDelay: `${idx * 0.2}s`,
                      '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-8px)' },
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Box 
                sx={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 2, 
                  color: '#1e7e34',
                  p: 3,
                  borderRadius: 2,
                  bgcolor: '#d4edda',
                  border: '2px solid #c3e6cb',
                  animation: 'bounceIn 0.5s ease-in',
                  '@keyframes bounceIn': {
                    '0%': { transform: 'scale(0)', opacity: 0 },
                    '50%': { transform: 'scale(1.1)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 1 }
                  }
                }}
              >
                <CheckCircle size={48} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="h6" fontWeight={600}>
                    3D Model Ready!
                  </Typography>
                  <Typography variant="body2">
                    Scroll down to preview your building model with color-coded surfaces.
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          ✅ {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ flexGrow: 1, minWidth: 200 }}>
            Select Area
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Basemap:
            </Typography>
            <ToggleButtonGroup
              value={basemapType}
              exclusive
              onChange={handleBasemapChange}
              size="small"
            >
              {Object.entries(basemapConfigs).map(([key, config]) => (
                <ToggleButton key={key} value={key}>
                  {config.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <Divider orientation="vertical" flexItem />

          <Stack direction="row" spacing={1}>
            {(downloadArea || simulationArea) && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<CheckCircle size={18} />}
                onClick={async () => {
                  const errors = await validateAreas();
                  setValidationErrors(errors);
                  if (errors.length === 0) {
                    setSuccessMessage('All validations passed! You can proceed to fetch the area.');
                    setTimeout(() => setSuccessMessage(null), 5000);
                  } else {
                    setSuccessMessage(null);
                  }
                }}
              >
                Validate Selection
              </Button>
            )}
            {(downloadArea || simulationArea) && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={18} />}
                onClick={handleClearDrawing}
              >
                Clear All
              </Button>
            )}
            {(downloadArea || simulationArea) && (
              <Button
                variant="outlined"
                startIcon={<Download size={18} />}
                onClick={handleExportGeometry}
              >
                Export
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              startIcon={<MapIcon size={18} />}
              onClick={handleFetchArea}
              disabled={!downloadArea || validationErrors.length > 0}
            >
              Fetch Area
            </Button>
          </Stack>
        </Stack>

        {/* Instructions and Validation */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Step 1:</strong> Draw a rectangle or polygon for the <strong style={{ color: '#ff6b35' }}>download area</strong> (orange, max 5 km²).
          <br />
          <strong>Step 2 (Optional):</strong> Draw a second shape for the <strong style={{ color: '#4caf50' }}>simulation area</strong> (green, must be inside orange area).
          <br />
          <em>If you only draw one area, all buildings will be simulated. If you draw two areas, only buildings in the green area will be simulated; others will provide shading context.</em>
        </Alert>

        {/* Validation Errors - Stacked Display */}
        {validationErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {validationErrors.map((error, idx) => (
              <Alert 
                key={idx}
                severity="error" 
                sx={{ mb: 1 }}
                onClose={() => {
                  setValidationErrors(prev => prev.filter((_, i) => i !== idx));
                }}
              >
                <strong>⚠️ Validation Error {validationErrors.length > 1 ? `${idx + 1}/${validationErrors.length}` : ''}:</strong>
                <br />
                {error}
              </Alert>
            ))}
          </Box>
        )}

        {/* Download Area Info */}
        {downloadArea && (
          <Box sx={{ mt: 2 }} key={`download-${downloadArea.area || 0}`}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#ff6b35', fontWeight: 600 }}>
              📍 Download Area
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Type: ${downloadArea.type.toUpperCase()}`}
                sx={{ bgcolor: '#ff6b3520', color: '#ff6b35', borderColor: '#ff6b35' }}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Points: ${downloadArea.coordinates.length}`}
                size="small"
              />
              {downloadArea.area !== undefined && downloadArea.area > 0 && (
                <Chip
                  label={`Area: ${formatArea(downloadArea.area)}`}
                  size="small"
                  color={downloadArea.area / 1_000_000 > MAX_DOWNLOAD_AREA_KM2 ? 'error' : 'success'}
                  icon={downloadArea.area / 1_000_000 > MAX_DOWNLOAD_AREA_KM2 ? 
                    <span style={{ fontSize: '16px' }}>⚠️</span> : 
                    <span style={{ fontSize: '16px' }}>✓</span>
                  }
                />
              )}
              {downloadArea.bounds && (
                <>
                  <Chip label={`N: ${downloadArea.bounds.north.toFixed(4)}°`} size="small" />
                  <Chip label={`S: ${downloadArea.bounds.south.toFixed(4)}°`} size="small" />
                  <Chip label={`E: ${downloadArea.bounds.east.toFixed(4)}°`} size="small" />
                  <Chip label={`W: ${downloadArea.bounds.west.toFixed(4)}°`} size="small" />
                </>
              )}
            </Stack>
          </Box>
        )}

        {/* Simulation Area Info */}
        {simulationArea && (
          <Box sx={{ mt: 2 }} key={`simulation-${simulationArea.area || 0}`}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#4caf50', fontWeight: 600 }}>
              🎯 Simulation Area
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Type: ${simulationArea.type.toUpperCase()}`}
                sx={{ bgcolor: '#4caf5020', color: '#4caf50', borderColor: '#4caf50' }}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Points: ${simulationArea.coordinates.length}`}
                size="small"
              />
              {simulationArea.area !== undefined && simulationArea.area > 0 && (
                <Chip
                  label={`Area: ${formatArea(simulationArea.area)}`}
                  size="small"
                  color={simulationArea.area < MIN_SIMULATION_AREA_M2 ? 'error' : 'success'}
                  icon={simulationArea.area < MIN_SIMULATION_AREA_M2 ? 
                    <span style={{ fontSize: '16px' }}>⚠️</span> : 
                    <span style={{ fontSize: '16px' }}>✓</span>
                  }
                />
              )}
              {simulationArea.bounds && (
                <>
                  <Chip label={`N: ${simulationArea.bounds.north.toFixed(4)}°`} size="small" />
                  <Chip label={`S: ${simulationArea.bounds.south.toFixed(4)}°`} size="small" />
                  <Chip label={`E: ${simulationArea.bounds.east.toFixed(4)}°`} size="small" />
                  <Chip label={`W: ${simulationArea.bounds.west.toFixed(4)}°`} size="small" />
                </>
              )}
            </Stack>
          </Box>
        )}

        {/* Drawing Mode Indicator */}
        {downloadArea && !simulationArea && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Ready for Step 2:</strong> You can now draw the simulation area (green) or click "Fetch Area" to simulate all buildings.
          </Alert>
        )}
      </Paper>

      {/* 3D Model Viewer - shown after fetching with smooth animation */}
      {showViewer && modelUrl ? (
        <Box 
          ref={viewerRef}
          sx={{ 
            flexGrow: 1, 
            minHeight: 600,
            animation: 'fadeIn 0.5s ease-in',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(20px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}
        >
            <Paper 
              elevation={3}
              sx={{ 
                height: '100%',
                overflow: 'hidden',
                borderRadius: 2
              }}
            >
              <ModelViewer3D
                modelUrl={modelUrl}
                terrainUrl={terrainUrl || undefined}
                modelType="json"
                onSimulate={handleSimulateBaseline}
                isSimulating={isSimulating}
              />
            </Paper>
          </Box>
        ) : null}

      {/* Map - takes remaining space or full space if no viewer */}
      <Paper
        sx={{
          flexGrow: showViewer ? 0 : 1,
          height: showViewer ? 450 : 'auto',
          minHeight: showViewer ? 450 : 600,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 2,
          transition: 'all 0.3s ease-in-out',
          '& .leaflet-container': {
            height: '100%',
            width: '100%',
            zIndex: 1
          }
        }}
      >
        <MapContainer
          center={swedenCenter}
          zoom={defaultZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            key={basemapType}
            url={basemapConfigs[basemapType].url}
            attribution={basemapConfigs[basemapType].attribution}
            maxZoom={19}
          />
          <FeatureGroup ref={featureGroupRef}>
            <DrawingControls
              onDrawCreated={handleDrawCreated}
              onDrawDeleted={handleDrawDeleted}
              onDrawEdited={handleDrawEdited}
              featureGroupRef={featureGroupRef}
            />
          </FeatureGroup>
        </MapContainer>
      </Paper>
    </Box>
  );
};

export default SelectAreaPage;