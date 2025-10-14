import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
  FormGroup
} from '@mui/material';
import { Play, RotateCcw, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import earcut from 'earcut';

interface ModelViewer3DProps {
  modelUrl: string;
  modelType?: 'gltf' | 'obj' | 'json';
  onSimulate?: () => void;
  isSimulating?: boolean;
}

const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelUrl,
  modelType = 'gltf',
  onSimulate,
  isSimulating = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{
    vertices: number;
    faces: number;
    buildings: number;
  } | null>(null);
  const [layerVisibility, setLayerVisibility] = useState({
    walls: true,
    roofs: true,
    floors: true,
    windows: true,
    doors: true,
    ceilings: true,
    other: true
  });
  const [showLayerControls, setShowLayerControls] = useState(false);

  // Update mesh visibility when layer visibility changes
  useEffect(() => {
    if (!modelRef.current) return;

    modelRef.current.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.userData.type) {
        const surfaceType = child.userData.type.toLowerCase();
        
        // Map surface types to layer categories
        let visible = true;
        if (surfaceType.includes('wall')) {
          visible = layerVisibility.walls;
        } else if (surfaceType.includes('roof')) {
          visible = layerVisibility.roofs;
        } else if (surfaceType.includes('floor')) {
          visible = layerVisibility.floors;
        } else if (surfaceType.includes('window') || surfaceType.includes('glass')) {
          visible = layerVisibility.windows;
        } else if (surfaceType.includes('door')) {
          visible = layerVisibility.doors;
        } else if (surfaceType.includes('ceiling')) {
          visible = layerVisibility.ceilings;
        } else {
          visible = layerVisibility.other;
        }
        
        child.visible = visible;
      }
    });
  }, [layerVisibility]);

  const handleLayerToggle = (layer: keyof typeof layerVisibility) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const handleToggleAllLayers = () => {
    const allVisible = Object.values(layerVisibility).every(v => v);
    const newVisibility = !allVisible;
    
    setLayerVisibility({
      walls: newVisibility,
      roofs: newVisibility,
      floors: newVisibility,
      windows: newVisibility,
      doors: newVisibility,
      ceilings: newVisibility,
      other: newVisibility
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    scene.fog = new THREE.Fog(0xf0f0f0, 500, 10000);
    sceneRef.current = scene;

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Initialize controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);

    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(2000, 50, 0x000000, 0x000000);
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Load model
    loadModel(modelUrl, modelType, scene, camera, controls);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  const loadModel = async (
    url: string,
    type: string,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls
  ) => {
    setLoading(true);
    setError(null);

    try {
      console.group('🎨 3D Model Viewer - Loading Model');
      console.log('📍 Model URL:', url);
      console.log('📦 Model Type:', type);
      console.log('⏰ Load started at:', new Date().toISOString());
      
      let model: THREE.Object3D;

      if (type === 'gltf') {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(url);
        model = gltf.scene;
      } else if (type === 'obj') {
        const loader = new OBJLoader();
        model = await loader.loadAsync(url);
      } else if (type === 'json') {
        // Load custom JSON geometry format
        console.log('📥 Fetching JSON model...');
        const response = await fetch(url);
        
        console.log('📊 Response status:', response.status, response.statusText);
        console.log('📋 Response headers:', {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`⚠️ Unexpected content type: ${contentType}`);
          throw new Error(`Expected JSON but received ${contentType}. URL may be incorrect.`);
        }
        
        const data = await response.json();
        console.log('✅ Model data loaded successfully');
        console.log('📊 Model structure:', {
          version: data.version,
          type: data.type,
          surfaceCount: data.surfaces?.length || 0,
          metadata: data.metadata
        });
        
        model = createModelFromJSON(data);
      } else {
        throw new Error('Unsupported model type');
      }

      // Apply materials to model
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Apply building material if not already set
          if (!child.material || (child.material as THREE.Material).type === 'MeshBasicMaterial') {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x88ccff,
              roughness: 0.5,
              metalness: 0.3
            });
          }
        }
      });

      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Move model to origin
      model.position.x = -center.x;
      model.position.y = -box.min.y;
      model.position.z = -center.z;

      scene.add(model);
      modelRef.current = model;

      // Adjust camera to view entire model
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.5; // Add some padding

      camera.position.set(cameraZ, cameraZ, cameraZ);
      camera.lookAt(0, size.y / 2, 0);
      controls.target.set(0, size.y / 2, 0);
      controls.update();

      // Calculate model info
      let vertices = 0;
      let faces = 0;
      let buildings = 0;

      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          buildings++;
          const geometry = child.geometry;
          if (geometry.attributes.position) {
            vertices += geometry.attributes.position.count;
            if (geometry.index) {
              faces += geometry.index.count / 3;
            }
          }
        }
      });

      setModelInfo({ vertices, faces, buildings });
      setLoading(false);
      
      console.log('✅ Model loaded successfully!');
      console.log('📊 Model stats:', { vertices, faces, buildings });
      console.log('⏰ Load completed at:', new Date().toISOString());
      console.groupEnd();
      
    } catch (err) {
      console.error('❌ Error loading model:', err);
      console.groupEnd();
      setError(err instanceof Error ? err.message : 'Failed to load 3D model');
      setLoading(false);
    }
  };

  const createModelFromJSON = (data: any): THREE.Object3D => {
    console.log('🔨 Creating Three.js model from JSON data...');
    const group = new THREE.Group();

    // Check if model uses floor multipliers for instancing
    const usesMultipliers = data.metadata?.uses_multipliers || false;
    const multipliers = data.multipliers || {};
    
    if (usesMultipliers && Object.keys(multipliers).length > 0) {
      console.log('🔄 Model uses floor multipliers - instancing enabled for better performance');
      console.log(`📊 Multipliers:`, multipliers);
    }

    // Handle IDF format with surfaces array
    if (data.surfaces && Array.isArray(data.surfaces)) {
      console.log(`📐 Processing ${data.surfaces.length} surfaces...`);
      console.log(`⚡ Using geometry merging for performance optimization...`);
      
      // Group surfaces by zone for potential instancing
      const surfacesByZone: { [zone: string]: any[] } = {};
      
      data.surfaces.forEach((surface: any) => {
        const zoneName = surface.zone || 'exterior';
        if (!surfacesByZone[zoneName]) {
          surfacesByZone[zoneName] = [];
        }
        surfacesByZone[zoneName].push(surface);
      });
      
      let successCount = 0;
      let skipCount = 0;
      let instancedCount = 0;
      let mergedCount = 0;
      
      // Process each zone
      Object.entries(surfacesByZone).forEach(([zoneName, surfaces]) => {
        const multiplier = multipliers[zoneName] || 1;
        
        if (multiplier > 1) {
          console.log(`🔄 Zone '${zoneName}' has multiplier ${multiplier} - creating instances with merged geometry`);
          
          // Create a group for the base geometry with merging
          const zoneGroup = new THREE.Group();
          zoneGroup.name = `${zoneName}_base`;
          
          // Separate walls/floors/ceilings from windows
          const structuralSurfaces = surfaces.filter((s: any) => 
            s.type !== 'window' && s.type !== 'glassdoor'
          );
          const windowSurfaces = surfaces.filter((s: any) => 
            s.type === 'window' || s.type === 'glassdoor'
          );
          
          // Merge structural surfaces by type
          const mergedMeshes = createMergedMeshesByType(structuralSurfaces);
          mergedMeshes.forEach(mesh => {
            zoneGroup.add(mesh);
            mergedCount++;
          });
          successCount += structuralSurfaces.length;
          
          // Merge windows separately (they need transparency)
          if (windowSurfaces.length > 0) {
            const mergedWindows = createMergedMeshesByType(windowSurfaces);
            mergedWindows.forEach(mesh => {
              zoneGroup.add(mesh);
              mergedCount++;
            });
            successCount += windowSurfaces.length;
          }
          
          // Get the bounding box to calculate floor height
          const bbox = new THREE.Box3().setFromObject(zoneGroup);
          const floorHeight = bbox.max.y - bbox.min.y || 3.0; // Default to 3m if can't calculate
          
          // Create instances by cloning and offsetting vertically
          for (let i = 0; i < multiplier; i++) {
            const instance = zoneGroup.clone();
            instance.name = `${zoneName}_floor_${i + 1}`;
            instance.position.y = floorHeight * i;
            group.add(instance);
            
            if (i > 0) {
              instancedCount++;
            }
          }
          
          const windowCount = windowSurfaces.length;
          console.log(`✅ Created ${multiplier} instances for zone '${zoneName}' (floor height: ${floorHeight.toFixed(2)}m, ${windowCount} windows per floor)`);
        } else {
          // No multiplier - merge surfaces by type
          const mergedMeshes = createMergedMeshesByType(surfaces);
          mergedMeshes.forEach(mesh => {
            mesh.name = `${zoneName}_${mesh.userData.type}`;
            group.add(mesh);
            mergedCount++;
          });
          successCount += surfaces.length;
        }
      });
      
      console.log(`✅ Processed ${successCount} surfaces into ${mergedCount} merged meshes (${skipCount} skipped, ${instancedCount} instanced)`);
      console.log(`⚡ Performance boost: Reduced from ${successCount} draw calls to ${mergedCount} draw calls!`);
      
      if (instancedCount > 0) {
        console.log(`⚡ Additional boost: ${instancedCount} floors instanced instead of creating duplicate geometry`);
      }
    }
    // Handle old format with buildings array
    else if (data.buildings && Array.isArray(data.buildings)) {
      console.log(`🏢 Processing ${data.buildings.length} buildings (legacy format)...`);
      data.buildings.forEach((building: any, index: number) => {
        if (building.geometry && building.geometry.vertices && building.geometry.faces) {
          const geometry = new THREE.BufferGeometry();
          const vertices = new Float32Array(building.geometry.vertices.flat());
          const indices = new Uint32Array(building.geometry.faces.flat());

          geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
          geometry.computeVertexNormals();

          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(index * 0.1, 0.7, 0.6),
            roughness: 0.5,
            metalness: 0.3
          });

          const mesh = new THREE.Mesh(geometry, material);
          mesh.name = building.name || `Building_${index}`;
          group.add(mesh);
        }
      });
      
      console.log(`✅ Created ${data.buildings.length} building meshes`);
    } else {
      console.warn('⚠️ Unknown model data format - no surfaces or buildings array found');
    }

    console.log(`🎯 Final group has ${group.children.length} children`);
    return group;
    
    // Helper function to create merged meshes by surface type
    function createMergedMeshesByType(surfaces: any[]): THREE.Mesh[] {
      // Group surfaces by type
      const surfacesByType: { [type: string]: any[] } = {};
      
      surfaces.forEach((surface: any) => {
        const type = surface.type || 'undefined';
        if (!surfacesByType[type]) {
          surfacesByType[type] = [];
        }
        surfacesByType[type].push(surface);
      });
      
      const mergedMeshes: THREE.Mesh[] = [];
      
      // Create merged geometry for each type
      Object.entries(surfacesByType).forEach(([type, typeSurfaces]) => {
        const geometries: THREE.BufferGeometry[] = [];
        
        typeSurfaces.forEach((surface: any) => {
          const geom = createSurfaceGeometry(surface);
          if (geom) {
            geometries.push(geom);
          }
        });
        
        if (geometries.length === 0) return;
        
        // Merge all geometries of this type
        let mergedGeometry: THREE.BufferGeometry;
        
        if (geometries.length === 1) {
          mergedGeometry = geometries[0];
        } else {
          try {
            mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
          } catch (error) {
            console.warn(`Failed to merge ${type} geometries, using individual meshes:`, error);
            // Fallback: create individual meshes
            geometries.forEach((geom, idx) => {
              const material = createMaterialForType(type);
              const mesh = new THREE.Mesh(geom, material);
              mesh.name = `${type}_${idx}`;
              mesh.userData = { type };
              mesh.castShadow = type !== 'window' && type !== 'glassdoor';
              mesh.receiveShadow = type !== 'window' && type !== 'glassdoor';
              mergedMeshes.push(mesh);
            });
            return;
          }
        }
        
        // Create material based on surface type
        const material = createMaterialForType(type);
        
        const mesh = new THREE.Mesh(mergedGeometry, material);
        mesh.name = type;
        mesh.userData = { type, count: typeSurfaces.length };
        mesh.castShadow = type !== 'window' && type !== 'glassdoor';
        mesh.receiveShadow = type !== 'window' && type !== 'glassdoor';
        
        mergedMeshes.push(mesh);
        
        console.log(`🔗 Merged ${typeSurfaces.length} ${type} surfaces into 1 mesh`);
      });
      
      return mergedMeshes;
    }
    
    // Helper function to create material for a surface type
    function createMaterialForType(type: string): THREE.Material {
      const color = data.metadata?.colors?.[type] || '#88ccff';
      const isWindow = type === 'window' || type === 'glassdoor';
      
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: isWindow ? 0.1 : 0.5,
        metalness: isWindow ? 0.8 : 0.3,
        transparent: isWindow,
        opacity: isWindow ? 0.4 : 1.0,
        side: THREE.DoubleSide
      });
    }
    
    // Helper function to create geometry from a surface (without material)
    function createSurfaceGeometry(surface: any): THREE.BufferGeometry | null {
      if (!surface.vertices || surface.vertices.length < 3) {
        return null;
      }
      
      // Create geometry from vertices
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      
      surface.vertices.forEach((v: number[]) => {
        vertices.push(v[0], v[1], v[2]);
      });
      
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
      
      // Triangulate the polygon using earcut for proper handling of non-convex shapes
      const indices: number[] = [];
      
      if (surface.vertices.length === 3) {
        // Triangle - no triangulation needed
        indices.push(0, 1, 2);
      } else if (surface.vertices.length === 4) {
        // Quad - simple triangulation (two triangles)
        indices.push(0, 1, 2, 0, 2, 3);
      } else {
        // Complex polygon - use earcut for proper triangulation
        const v0 = new THREE.Vector3(surface.vertices[0][0], surface.vertices[0][1], surface.vertices[0][2]);
        const v1 = new THREE.Vector3(surface.vertices[1][0], surface.vertices[1][1], surface.vertices[1][2]);
        const v2 = new THREE.Vector3(surface.vertices[2][0], surface.vertices[2][1], surface.vertices[2][2]);
        
        const edge1 = new THREE.Vector3().subVectors(v1, v0);
        const edge2 = new THREE.Vector3().subVectors(v2, v0);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
        
        // Determine which axes to use for 2D projection
        const absNormal = new THREE.Vector3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));
        let skipAxis = 0; // Default: skip X axis (project to YZ plane)
        
        if (absNormal.y > absNormal.x && absNormal.y > absNormal.z) {
          skipAxis = 1; // Skip Y axis (project to XZ plane) - horizontal surfaces
        } else if (absNormal.z > absNormal.x && absNormal.z > absNormal.y) {
          skipAxis = 2; // Skip Z axis (project to XY plane)
        }
        
        // Create 2D coordinates for earcut
        const coords2D: number[] = [];
        surface.vertices.forEach((v: number[]) => {
          if (skipAxis === 0) {
            coords2D.push(v[1], v[2]); // Y, Z
          } else if (skipAxis === 1) {
            coords2D.push(v[0], v[2]); // X, Z
          } else {
            coords2D.push(v[0], v[1]); // X, Y
          }
        });
        
        try {
          const triangles = earcut(coords2D);
          indices.push(...triangles);
        } catch (error) {
          console.warn(`Earcut triangulation failed for surface, using fallback`, error);
          // Fallback: fan triangulation from first vertex
          for (let i = 1; i < surface.vertices.length - 1; i++) {
            indices.push(0, i, i + 1);
          }
        }
      }
      
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      
      return geometry;
    }
  };

  const handleResetView = () => {
    if (!cameraRef.current || !controlsRef.current || !modelRef.current) return;

    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;

    cameraRef.current.position.set(cameraZ, cameraZ, cameraZ);
    cameraRef.current.lookAt(center);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const handleZoomIn = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.multiplyScalar(0.8);
  };

  const handleZoomOut = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.multiplyScalar(1.2);
  };

  return (
    <Paper sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Building Model Preview
          </Typography>
          
          {modelInfo && (
            <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem' }}>
              <Typography variant="body2">
                Surfaces: {modelInfo.buildings}
              </Typography>
              <Typography variant="body2">
                Vertices: {modelInfo.vertices.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                Faces: {Math.floor(modelInfo.faces).toLocaleString()}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* 3D Viewer */}
      <Box
        ref={mountRef}
        sx={{
          height: 'calc(100% - 140px)',
          width: '100%',
          position: 'relative',
          bgcolor: 'background.default'
        }}
      />

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading 3D model...
          </Typography>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Box sx={{ position: 'absolute', top: 80, left: 16, right: 16 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}

      {/* Controls */}
      {!loading && !error && (
        <>
          {/* Zoom and Reset Controls */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: 'absolute',
              top: 80,
              right: 16,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 2,
              p: 0.5
            }}
          >
            <Tooltip title="Toggle Layer Visibility">
              <IconButton 
                size="small" 
                onClick={() => setShowLayerControls(!showLayerControls)}
                color={showLayerControls ? 'primary' : 'default'}
              >
                <Layers size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={handleZoomIn}>
                <ZoomIn size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={handleZoomOut}>
                <ZoomOut size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View">
              <IconButton size="small" onClick={handleResetView}>
                <RotateCcw size={18} />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Layer Visibility Controls */}
          {showLayerControls && (
            <Paper
              sx={{
                position: 'absolute',
                top: 130,
                right: 16,
                p: 2,
                boxShadow: 3,
                minWidth: 200
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight="600">
                    Layer Visibility
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleToggleAllLayers}
                    sx={{ minWidth: 'auto', fontSize: '0.75rem' }}
                  >
                    {Object.values(layerVisibility).every(v => v) ? 'Hide All' : 'Show All'}
                  </Button>
                </Stack>
                
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.walls}
                        onChange={() => handleLayerToggle('walls')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Walls</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.roofs}
                        onChange={() => handleLayerToggle('roofs')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Roofs</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.floors}
                        onChange={() => handleLayerToggle('floors')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Floors</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.windows}
                        onChange={() => handleLayerToggle('windows')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Windows</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.doors}
                        onChange={() => handleLayerToggle('doors')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Doors</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.ceilings}
                        onChange={() => handleLayerToggle('ceilings')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Ceilings</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.other}
                        onChange={() => handleLayerToggle('other')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Other</Typography>}
                  />
                </FormGroup>
              </Stack>
            </Paper>
          )}
        </>
      )}

      {/* Bottom Action Bar */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Alert severity="info" sx={{ flexGrow: 1 }}>
            Review the building geometry. When ready, click "Simulate Baseline" to start the energy simulation.
          </Alert>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={isSimulating ? <CircularProgress size={20} color="inherit" /> : <Play size={20} />}
            onClick={onSimulate}
            disabled={loading || !!error || isSimulating}
            sx={{ minWidth: 200 }}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Baseline'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default ModelViewer3D;
