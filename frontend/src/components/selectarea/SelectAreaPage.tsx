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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  LinearProgress
} from '@mui/material';
import { MapIcon, Trash2, Download, CheckCircle } from 'lucide-react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { FeatureGroup as LeafletFeatureGroup } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import { authenticatedFetch } from '../../lib/auth-api';

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
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [processComplete, setProcessComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idfPath, setIdfPath] = useState<string | null>(null);
  const featureGroupRef = useRef<LeafletFeatureGroup>(null);

  // Sweden center coordinates: ~62.0° N, 15.0° E
  const swedenCenter: [number, number] = [62.0, 15.0];
  const defaultZoom = 5;

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
      setProcessingStatus('Preparing request...');

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
        use_multiplier: false
      };

      setProcessingStatus('Downloading building footprints from DTCC...');
      
      const response = await authenticatedFetch(`${backendUrl}/api/geojson/process-geojson/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process area');
      }

      const data = await response.json();
      
      if (data.success) {
        setProcessingStatus('IDF files generated successfully!');
        setProcessComplete(true);
        setIdfPath(data.idf_path);
        
        // Show success message for 2 seconds, then redirect to baseline
        setTimeout(() => {
          // Navigate to baseline page with IDF file info
          navigate('/baseline', { 
            state: { 
              idfPath: data.idf_path,
              idfUrl: data.idf_url,
              geojsonPath: data.geojson_path,
              geojsonUrl: data.geojson_url,
              fromGeoJSON: true
            } 
          });
        }, 2000);
      } else {
        throw new Error('Processing failed');
      }

    } catch (err) {
      console.error('Error fetching area:', err);
      setError(err instanceof Error ? err.message : 'Failed to process area');
      setProcessComplete(false);
    } finally {
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

  const formatArea = (area: number) => {
    if (area > 1000000) {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
    return `${area.toFixed(0)} m²`;
  };

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Processing Dialog */}
      <Dialog open={processing || processComplete} maxWidth="sm" fullWidth>
        <DialogTitle>
          {processComplete ? 'Processing Complete!' : 'Processing Area...'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {processingStatus}
          </DialogContentText>
          {!processComplete && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          )}
          {processComplete && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
              <CheckCircle size={24} />
              <Typography variant="body1">
                IDF files generated successfully!
              </Typography>
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

      <Paper
        sx={{
          flexGrow: 1,
          position: 'relative',
          overflow: 'hidden',
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