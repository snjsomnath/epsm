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
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import earcut from 'earcut';

interface ModelViewer3DProps {
  modelUrl: string;
  terrainUrl?: string;
  modelType?: 'gltf' | 'obj' | 'json';
  onSimulate?: () => void;
  isSimulating?: boolean;
}

const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  modelUrl,
  terrainUrl,
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
  const terrainRef = useRef<THREE.Object3D | null>(null);
  const groundRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);

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
    ceilings: false,    // ceilings hidden by default
    terrain: true,
    ground: false,      // ground plane hidden by default
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
    
    // Handle terrain visibility separately
    if (terrainRef.current) {
      terrainRef.current.visible = layerVisibility.terrain;
    }
    
    // Handle ground plane visibility separately
    if (groundRef.current) {
      groundRef.current.visible = layerVisibility.ground;
    }
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
      terrain: newVisibility,
      ground: newVisibility,
      other: newVisibility
    });
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize scene with neutral background
    const scene = new THREE.Scene();
    
    // Replace gradient background with neutral clear color
    scene.background = null;
    
    // Fog should match the clear color and be subtle
    scene.fog = new THREE.Fog(0xf4f6f8, 1200, 3000);
    
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

    // Initialize renderer with enhanced settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit to 2x for performance
    
    // Enhanced shadow settings
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    
    // Improved rendering quality with enhanced tone mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.75;        // balanced exposure to prevent wall washout
    THREE.ColorManagement.enabled = true;       // ensure correct color space (r152+)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Replace gradient background with neutral clear color
    renderer.setClearColor(0xf4f6f8, 1);        // light neutral gray
    
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup simple environment for subtle reflections
    const setupEnvironment = () => {
      try {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envRT = pmrem.fromScene(new THREE.Scene());
        scene.environment = envRT.texture;
        pmrem.dispose();
      } catch (error) {
        console.warn('Failed to setup environment:', error);
      }
    };
    setupEnvironment();

    // Setup post-processing for enhanced visual quality
    const composer = new EffectComposer(renderer);
    
    // Main render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add SSAO (Screen Space Ambient Occlusion) for better depth perception
    const ssaoPass = new SSAOPass(scene, camera, mountRef.current.clientWidth, mountRef.current.clientHeight);
    ssaoPass.kernelRadius = 12;
    ssaoPass.minDistance = 0.0015;
    ssaoPass.maxDistance = 0.04;
    ssaoPass.output = 0; // default, keep it subtle
    composer.addPass(ssaoPass);
    
    // OPTIONAL anti-aliasing (if available in your bundle)
    // import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
    // const smaa = new SMAAPass(mountRef.current.clientWidth, mountRef.current.clientHeight);
    // composer.addPass(smaa);
    
    // Output pass for proper color space conversion
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    
    composerRef.current = composer;

    // Initialize controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // Enhanced lighting setup for vibrant, high-contrast scene
    const sun = new THREE.DirectionalLight(0xfff8e1, 5);  // slightly reduced intensity to prevent washout
    sun.position.set(600, 300, 500);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);  // higher resolution shadows
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 1000;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    sun.shadow.normalBias = 0.05;   // optimized for sharp, contrasted shadows
    sun.shadow.bias = -0.0008;      // balanced bias for clean shadows
    
    // Enhanced shadow settings for high contrast
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene.add(sun);

    const ambient = new THREE.AmbientLight(0xe8f4fd, 0.8);  // minimal ambient for almost black shadows
    scene.add(ambient);
    
    // Set darker shadow color by adjusting renderer shadow settings
    if (renderer.shadowMap) {
      // Force darker shadows by reducing the shadow intensity multiplier
      (renderer as any).shadowMap.autoUpdate = true;
    }

    // Enhanced ground plane with intense shadow catching properties
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,      // lighter base for maximum shadow contrast
      roughness: 1.0,       // maximum roughness for deep shadow absorption
      metalness: 0.0,       // Non-metallic
      envMapIntensity: 0.0   // no environment reflection to avoid shadow interference
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    groundRef.current = ground;

    // Enhanced grid helper with better styling
    const gridHelper = new THREE.GridHelper(2000, 100, 0xBBBBBB, 0xDDDDDD);
    const gridMaterial = gridHelper.material as THREE.LineBasicMaterial;
    gridMaterial.opacity = 0.3;
    gridMaterial.transparent = true;
    gridMaterial.vertexColors = false;
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Load model
    loadModel(modelUrl, modelType, scene, camera, controls);

    // Enhanced animation loop with post-processing
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      
      // Use composer for enhanced rendering if available, otherwise fallback to basic renderer
      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    // Handle window resize with composer support
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // Update composer size if available
      if (composerRef.current) {
        composerRef.current.setSize(width, height);
      }
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
      
      // Clean up post-processing
      if (composerRef.current) {
        composerRef.current.dispose();
      }
      
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Separate effect for loading terrain when terrainUrl changes
  useEffect(() => {
    if (!terrainUrl || !sceneRef.current) return;
    
    console.log('🗺️ terrainUrl changed, loading terrain:', terrainUrl);
    loadTerrain(terrainUrl, sceneRef.current);
  }, [terrainUrl]);

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

      // Apply enhanced materials to model
      model.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Apply enhanced building material if not already set or if it's a basic material
          if (!child.material || (child.material as THREE.Material).type === 'MeshBasicMaterial') {
            // Create enhanced material based on object name - more vibrant colors
            const objectName = child.name.toLowerCase();
            let materialProps: any = {
              color: 0x64b5f6,      // more vibrant blue
              roughness: 0.4,       // smoother for better light interaction
              metalness: 0.05,      // slight metallic sheen
              envMapIntensity: 0.4   // increased environment reflection
            };
            
            // Adjust material properties based on object type - enhanced vibrancy
            if (objectName.includes('window') || objectName.includes('glass')) {
              materialProps = {
                color: 0x42a5f5,      // more vibrant blue glass
                metalness: 0.0,
                roughness: 0.05,       // more reflective
                transmission: 0.8,     // increased transparency
                transparent: true,
                opacity: 0.9,
                ior: 1.52,
                clearcoat: 1.0,        // enhanced reflections
                clearcoatRoughness: 0.05
              };
              child.material = new THREE.MeshPhysicalMaterial(materialProps);
            } else if (objectName.includes('roof')) {
              materialProps.color = 0xd84315;  // vibrant terracotta roof
              materialProps.roughness = 0.5;   // more reflective
              materialProps.metalness = 0.1;
              materialProps.envMapIntensity = 0.5;
              child.material = new THREE.MeshStandardMaterial(materialProps);
            } else {
              child.material = new THREE.MeshStandardMaterial(materialProps);
            }
          }
          
          // Ensure material has proper settings for lighting
          if (child.material instanceof THREE.MeshStandardMaterial || 
              child.material instanceof THREE.MeshPhysicalMaterial) {
            child.material.needsUpdate = true;
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

  const loadTerrain = async (url: string, scene: THREE.Scene) => {
    try {
      console.group('🗺️ 3D Model Viewer - Loading Terrain');
      console.log('📍 Terrain URL:', url);
      console.log('⏰ Load started at:', new Date().toISOString());
      
      // Load STL file
      const loader = new STLLoader();
      const geometry = await loader.loadAsync(url);
      
      // Normalize geometry to origin and apply coordinate system transformation
      // Buildings are transformed: EnergyPlus [X, Y, Z] → Three.js [X, Z, Y]
      // Need to apply same transformation to terrain for alignment
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox!;
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      
      console.log('🗺️ Original terrain bounding box:', {
        min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
        max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
        center: { x: center.x, y: center.y, z: center.z }
      });
      
      // Step 1: Translate to origin
      geometry.translate(-center.x, -center.y, -center.z);
      
      // Step 2: Apply coordinate transformation [X, Y, Z] → [X, Z, Y]
      // This matches the transformation applied to buildings in model_3d_generator.py
      const positionAttribute = geometry.getAttribute('position');
      for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const y = positionAttribute.getY(i);
        const z = positionAttribute.getZ(i);
        
        // Transform: X stays X, Y becomes Z, Z becomes Y
        positionAttribute.setXYZ(i, x, z, y);
      }
      
      // Flip terrain normals by reversing triangle winding order
      const indices = geometry.getIndex();
      if (indices) {
        // Flip every triangle by swapping the second and third vertices
        for (let i = 0; i < indices.count; i += 3) {
          const temp = indices.getX(i + 1);
          indices.setX(i + 1, indices.getX(i + 2));
          indices.setX(i + 2, temp);
        }
        indices.needsUpdate = true;
      } else {
        // If no indices, flip the position attribute directly
        const position = geometry.getAttribute('position');
        const tempArray = new Float32Array(3);
        for (let i = 0; i < position.count; i += 3) {
          // Save second vertex
          tempArray[0] = position.getX(i + 1);
          tempArray[1] = position.getY(i + 1);
          tempArray[2] = position.getZ(i + 1);
          
          // Move third to second
          position.setXYZ(i + 1, 
            position.getX(i + 2), 
            position.getY(i + 2), 
            position.getZ(i + 2)
          );
          
          // Move saved second to third
          position.setXYZ(i + 2, tempArray[0], tempArray[1], tempArray[2]);
        }
        position.needsUpdate = true;
      }
      
      // Recalculate normals and bounding box after transformation and normal flipping
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const newBbox = geometry.boundingBox!;
      
      // Step 3: Translate so lowest point is at ground level (y=0)
      const minY = newBbox.min.y;
      geometry.translate(0, -minY, 0);
      
      // Final bounding box
      geometry.computeBoundingBox();
      const finalBbox = geometry.boundingBox!;
      console.log('🗺️ Final terrain bounding box (ground-aligned):', {
        min: { x: finalBbox.min.x, y: finalBbox.min.y, z: finalBbox.min.z },
        max: { x: finalBbox.max.x, y: finalBbox.max.y, z: finalBbox.max.z }
      });
      
      // Create enhanced terrain material with better lighting interaction
      const material = new THREE.MeshStandardMaterial({
        color: 0xdddddd,      // White terrain for natural appearance
        roughness: 1,       // Very rough for natural terrain
        metalness: 0.0,       // Non-metallic
        envMapIntensity: 0.0, // Subtle environment reflection
        flatShading: true,   // Smooth shading for better appearance
        side: THREE.DoubleSide // Make visible from both sides
      });
      
      // Create mesh
      const terrain = new THREE.Mesh(geometry, material);
      terrain.name = 'terrain';
      terrain.userData.type = 'terrain';
      terrain.receiveShadow = true;
      terrain.castShadow = false; // Terrain doesn't need to cast shadows
      
      // Add to scene
      scene.add(terrain);
      terrainRef.current = terrain;
      
      console.log('✅ Terrain loaded successfully!');
      console.log('⏰ Load completed at:', new Date().toISOString());
      console.groupEnd();
      
    } catch (err) {
      console.error('❌ Error loading terrain:', err);
      console.groupEnd();
      // Don't set error state for terrain - it's optional
      console.warn('Terrain loading failed, continuing without terrain');
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
            
            // For the topmost floor, convert ceilings to roofs for better visualization
            if (i === multiplier - 1) {
              instance.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh && child.userData.type === 'ceiling') {
                  // Update material to use roof color
                  const roofColor = data.metadata?.colors?.['roof'] || '#8B4513';
                  child.material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(roofColor),
                    roughness: 0.7,
                    metalness: 0.0,
                    side: THREE.DoubleSide
                  });
                  // Update userData to reflect it's now a roof
                  child.userData.type = 'roof';
                  child.userData.originalType = 'ceiling';
                }
              });
            }
            
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
    
    // Helper function to create material for a surface type with enhanced visual quality
    function createMaterialForType(type: string): THREE.Material {
      const color = data.metadata?.colors?.[type] || '#88ccff';
      const isWindow = type === 'window' || type === 'glassdoor';
      
      if (isWindow) {
        // Enhanced glass material for windows
        return new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0x88CCFF),
          metalness: 0.0,
          roughness: 0.1,
          transmission: 0.7,        // Glass transparency
          transparent: true,
          opacity: 0.8,
          thickness: 0.5,           // Glass thickness for realistic refraction
          ior: 1.5,                 // Index of refraction for glass
          clearcoat: 1.0,           // Clear coat for glossy finish
          clearcoatRoughness: 0.1,
          side: THREE.DoubleSide
        });
      } else {
        // Enhanced materials for building surfaces
        const materialProps: any = {
          color: new THREE.Color(color),
          side: THREE.DoubleSide
        };
        
        // Different material properties based on surface type
        switch (type) {
          case 'wall':
            // Flip wall normal for correct lighting
            
            materialProps.color = new THREE.Color(0xedc67e);  // warm beige color
            materialProps.roughness = 0.9;
            materialProps.metalness = 0.0;
            materialProps.envMapIntensity = 0.9;
            break;
          case 'roof':
            materialProps.roughness = 0.7;
            materialProps.metalness = 0.1;
            materialProps.envMapIntensity = 0.2;
            break;
          case 'floor':
            materialProps.roughness = 0.9;
            materialProps.metalness = 0.0;
            materialProps.envMapIntensity = 0.05;
            break;
          case 'ceiling':
            materialProps.roughness = 0.6;
            materialProps.metalness = 0.0;
            materialProps.envMapIntensity = 0.1;
            break;
          case 'door':
            materialProps.roughness = 0.4;
            materialProps.metalness = 0.2;
            materialProps.envMapIntensity = 0.3;
            break;
          default:
            materialProps.roughness = 0.7;
            materialProps.metalness = 0.0;
            materialProps.envMapIntensity = 0.1;
        }
        
        return new THREE.MeshStandardMaterial(materialProps);
      }
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
      const shouldFlipNormals = surface.type === 'wall' || 
                               surface.type === 'roof' || 
                               surface.type === 'roofceiling' || 
                               surface.type === 'ceiling' ||
                               surface.type === 'shade';
      
      // Debug: Log surface types to understand what we're working with
      if (surface.type && (surface.type.includes('roof') || surface.type.includes('ceiling') || surface.type.includes('shade'))) {
        console.log(`🔧 Processing surface type: "${surface.type}", flipping normals: ${shouldFlipNormals}`);
      }
      
      if (surface.vertices.length === 3) {
        // Triangle - flip winding order for walls and roofs to reverse normals
        if (shouldFlipNormals) {
          indices.push(0, 2, 1);  // flipped for walls and roofs
        } else {
          indices.push(0, 1, 2);
        }
      } else if (surface.vertices.length === 4) {
        // Quad - flip winding order for walls and roofs to reverse normals
        if (shouldFlipNormals) {
          indices.push(0, 2, 1, 0, 3, 2);  // flipped for walls and roofs
        } else {
          indices.push(0, 1, 2, 0, 2, 3);
        }
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
          if (shouldFlipNormals) {
            // Flip triangle winding order for walls and roofs to reverse normals
            for (let i = 0; i < triangles.length; i += 3) {
              indices.push(triangles[i], triangles[i + 2], triangles[i + 1]);
            }
          } else {
            indices.push(...triangles);
          }
        } catch (error) {
          console.warn(`Earcut triangulation failed for surface, using fallback`, error);
          // Fallback: fan triangulation from first vertex
          for (let i = 1; i < surface.vertices.length - 1; i++) {
            if (shouldFlipNormals) {
              indices.push(0, i + 1, i);  // flipped for walls and roofs
            } else {
              indices.push(0, i, i + 1);
            }
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
                        checked={layerVisibility.terrain}
                        onChange={() => handleLayerToggle('terrain')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Terrain</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={layerVisibility.ground}
                        onChange={() => handleLayerToggle('ground')}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Ground Plane</Typography>}
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
