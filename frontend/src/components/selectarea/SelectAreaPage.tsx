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
  featureGroupRef 
}: { 
  onDrawCreated: (layer: L.Layer, type: string) => void;
  onDrawDeleted: () => void;
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
      
      if (featureGroupRef.current) {
        featureGroupRef.current.clearLayers();
        featureGroupRef.current.addLayer(layer);
      }
      
      onDrawCreated(layer, shape);
    });

    // Handle layer removal
    map.on('pm:remove', () => {
      onDrawDeleted();
    });

    return () => {
      map.pm.removeControls();
      map.off('pm:create');
      map.off('pm:remove');
    };
  }, [map, onDrawCreated, onDrawDeleted, featureGroupRef]);

  return null;
};

const SelectAreaPage = () => {
  const navigate = useNavigate();
  const [basemapType, setBasemapType] = useState<BasemapType>('osm');
  const [drawnArea, setDrawnArea] = useState<DrawnArea | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processComplete, setProcessComplete] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [idfPath, setIdfPath] = useState<string | null>(null);
  const [idfUrl, setIdfUrl] = useState<string | null>(null);
  const [geojsonPath, setGeojsonPath] = useState<string | null>(null);
  const [geojsonUrl, setGeojsonUrl] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const featureGroupRef = useRef<LeafletFeatureGroup>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

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

  const handleDrawCreated = (layer: L.Layer, type: string) => {
    let coordinates: [number, number][] = [];
    let bounds;
    let area = 0;

    if (type === 'Rectangle' && layer instanceof L.Rectangle) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
      bounds = layer.getBounds();
      area = (L as any).GeometryUtil?.geodesicArea?.(latLngs) || 0;
    } else if (type === 'Polygon' && layer instanceof L.Polygon) {
      const latLngs = layer.getLatLngs()[0] as L.LatLng[];
      coordinates = latLngs.map(latLng => [latLng.lat, latLng.lng]);
      bounds = layer.getBounds();
      area = (L as any).GeometryUtil?.geodesicArea?.(latLngs) || 0;
    }

    setDrawnArea({
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
    });
  };

  const handleDrawDeleted = () => {
    setDrawnArea(null);
  };

  const handleClearDrawing = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDrawnArea(null);
  };

  const handleFetchArea = async () => {
    if (!drawnArea || !drawnArea.bounds) {
      alert('Please draw an area first');
      return;
    }

    try {
      setProcessing(true);
      setProcessComplete(false);
      setError(null);
      setProcessingStep(0);

      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      // Prepare payload with bounds
      const payload = {
        bounds: {
          north: drawnArea.bounds.north,
          south: drawnArea.bounds.south,
          east: drawnArea.bounds.east,
          west: drawnArea.bounds.west
        },
        filter_height_min: 3,
        filter_height_max: 100,
        filter_area_min: 100,
        use_multiplier: true  // Enable floor multipliers for faster generation and instanced rendering
      };

      // Simulate step progression for better UX
      console.log('🚀 Starting 3D model building process...');
      console.log('📍 Area bounds:', payload.bounds);
      
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
          throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
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
    if (!drawnArea) return;
    
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [drawnArea.coordinates.map(c => [c[1], c[0]])] // [lng, lat] for GeoJSON
      },
      properties: {
        type: drawnArea.type,
        bounds: drawnArea.bounds,
        area_sqm: drawnArea.area
      }
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'selected-area.geojson';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSimulateBaseline = async () => {
    if (!idfUrl) {
      alert('No IDF file available');
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
    if (area > 1000000) {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
    return `${area.toFixed(0)} m²`;
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
            {drawnArea && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={18} />}
                onClick={handleClearDrawing}
              >
                Clear
              </Button>
            )}
            {drawnArea && (
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
              disabled={!drawnArea}
            >
              Fetch Area
            </Button>
          </Stack>
        </Stack>

        <Alert severity="info" sx={{ mt: 2 }}>
          Use the drawing tools on the map (top-left) to draw a rectangle or polygon. 
          The tools will appear once the map is loaded.
        </Alert>

        {drawnArea && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Type: ${drawnArea.type.toUpperCase()}`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Points: ${drawnArea.coordinates.length}`}
              size="small"
            />
            {drawnArea.area && (
              <Chip
                label={`Area: ${formatArea(drawnArea.area)}`}
                size="small"
                color="success"
              />
            )}
            {drawnArea.bounds && (
              <>
                <Chip
                  label={`N: ${drawnArea.bounds.north.toFixed(4)}°`}
                  size="small"
                />
                <Chip
                  label={`S: ${drawnArea.bounds.south.toFixed(4)}°`}
                  size="small"
                />
                <Chip
                  label={`E: ${drawnArea.bounds.east.toFixed(4)}°`}
                  size="small"
                />
                <Chip
                  label={`W: ${drawnArea.bounds.west.toFixed(4)}°`}
                  size="small"
                />
              </>
            )}
          </Stack>
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
              featureGroupRef={featureGroupRef}
            />
          </FeatureGroup>
        </MapContainer>
      </Paper>
    </Box>
  );
};

export default SelectAreaPage;