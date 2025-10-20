// Utility for managing recent 3D models in localStorage

export interface RecentModel {
  id: string;
  name: string;
  modelUrl: string;
  terrainUrl?: string;
  idfUrl?: string;
  geojsonUrl?: string;
  createdAt: string;
  downloadArea: {
    type: 'rectangle' | 'polygon';
    coordinates: [number, number][];
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    area: number;
  };
  simulationArea?: {
    type: 'rectangle' | 'polygon';
    coordinates: [number, number][];
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
    area: number;
  };
  buildingsCount?: number;
}

const STORAGE_KEY = 'epsm_recent_models';
const MAX_RECENT_MODELS = 10; // Keep last 10 models

// Get all recent models
export const getRecentModels = (): RecentModel[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const models = JSON.parse(stored) as RecentModel[];
    
    // Sort by creation date (newest first)
    return models.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to load recent models:', error);
    return [];
  }
};

// Save a new model to recent models
export const saveRecentModel = (model: Omit<RecentModel, 'id' | 'createdAt'>): RecentModel => {
  try {
    const existingModels = getRecentModels();
    
    // Generate unique ID based on timestamp and random component
    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newModel: RecentModel = {
      ...model,
      id,
      createdAt: new Date().toISOString()
    };
    
    // Check if a very similar model already exists (same area bounds)
    const existingIndex = existingModels.findIndex(existing => {
      const sameDownloadArea = 
        Math.abs(existing.downloadArea.bounds.north - model.downloadArea.bounds.north) < 0.0001 &&
        Math.abs(existing.downloadArea.bounds.south - model.downloadArea.bounds.south) < 0.0001 &&
        Math.abs(existing.downloadArea.bounds.east - model.downloadArea.bounds.east) < 0.0001 &&
        Math.abs(existing.downloadArea.bounds.west - model.downloadArea.bounds.west) < 0.0001;
      
      const sameSimulationArea = 
        (!existing.simulationArea && !model.simulationArea) ||
        (existing.simulationArea && model.simulationArea &&
          Math.abs(existing.simulationArea.bounds.north - model.simulationArea.bounds.north) < 0.0001 &&
          Math.abs(existing.simulationArea.bounds.south - model.simulationArea.bounds.south) < 0.0001 &&
          Math.abs(existing.simulationArea.bounds.east - model.simulationArea.bounds.east) < 0.0001 &&
          Math.abs(existing.simulationArea.bounds.west - model.simulationArea.bounds.west) < 0.0001);
      
      return sameDownloadArea && sameSimulationArea;
    });
    
    let updatedModels: RecentModel[];
    
    if (existingIndex !== -1) {
      // Update existing model (replace)
      updatedModels = [...existingModels];
      updatedModels[existingIndex] = newModel;
    } else {
      // Add new model at the beginning
      updatedModels = [newModel, ...existingModels];
      
      // Keep only the most recent models
      if (updatedModels.length > MAX_RECENT_MODELS) {
        updatedModels = updatedModels.slice(0, MAX_RECENT_MODELS);
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedModels));
    
    console.log('✅ Saved recent model:', newModel.name);
    return newModel;
  } catch (error) {
    console.error('Failed to save recent model:', error);
    throw error;
  }
};

// Remove a model from recent models
export const removeRecentModel = (id: string): void => {
  try {
    const existingModels = getRecentModels();
    const updatedModels = existingModels.filter(model => model.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedModels));
    console.log('✅ Removed recent model:', id);
  } catch (error) {
    console.error('Failed to remove recent model:', error);
    throw error;
  }
};

// Clear all recent models
export const clearRecentModels = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Cleared all recent models');
  } catch (error) {
    console.error('Failed to clear recent models:', error);
    throw error;
  }
};

// Get a specific model by ID
export const getRecentModel = (id: string): RecentModel | null => {
  const models = getRecentModels();
  return models.find(model => model.id === id) || null;
};

// Generate a display name for a model based on its area
export const generateModelName = (downloadArea: RecentModel['downloadArea'], simulationArea?: RecentModel['simulationArea']): string => {
  const downloadAreaKm2 = (downloadArea.area / 1_000_000).toFixed(3);
  const centerLat = (downloadArea.bounds.north + downloadArea.bounds.south) / 2;
  const centerLng = (downloadArea.bounds.east + downloadArea.bounds.west) / 2;
  
  // Try to get a readable location name (simplified approximation)
  const locationName = getLocationName(centerLat, centerLng);
  
  if (simulationArea) {
    const simulationAreaKm2 = (simulationArea.area / 1_000_000).toFixed(3);
    return `${locationName} (${downloadAreaKm2} km² → ${simulationAreaKm2} km²)`;
  } else {
    return `${locationName} (${downloadAreaKm2} km²)`;
  }
};

// Simple function to get a readable location name (can be enhanced with geocoding API later)
const getLocationName = (lat: number, lng: number): string => {
  // For Sweden, provide some basic city approximations
  const swedishCities = [
    { name: 'Stockholm', lat: 59.3293, lng: 18.0686, radius: 50 },
    { name: 'Gothenburg', lat: 57.7089, lng: 11.9746, radius: 30 },
    { name: 'Malmö', lat: 55.6050, lng: 13.0038, radius: 20 },
    { name: 'Uppsala', lat: 59.8586, lng: 17.6389, radius: 15 },
    { name: 'Linköping', lat: 58.4108, lng: 15.6214, radius: 15 },
    { name: 'Västerås', lat: 59.6162, lng: 16.5528, radius: 15 },
    { name: 'Örebro', lat: 59.2741, lng: 15.2066, radius: 15 },
    { name: 'Norrköping', lat: 58.5877, lng: 16.1924, radius: 15 },
    { name: 'Helsingborg', lat: 56.0465, lng: 12.6945, radius: 15 },
    { name: 'Jönköping', lat: 57.7826, lng: 14.1618, radius: 15 },
  ];
  
  // Find closest city within radius
  for (const city of swedishCities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    ) * 111; // Rough km conversion
    
    if (distance < city.radius) {
      return city.name;
    }
  }
  
  // Fallback to coordinates
  return `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
};

// Validate if a model URL is still accessible
export const validateModelUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Clean up invalid models (remove models with inaccessible URLs)
export const cleanupInvalidModels = async (): Promise<number> => {
  const models = getRecentModels();
  const validModels: RecentModel[] = [];
  let removedCount = 0;
  
  for (const model of models) {
    const isValid = await validateModelUrl(model.modelUrl);
    if (isValid) {
      validModels.push(model);
    } else {
      removedCount++;
      console.log('🗑️ Removing invalid model:', model.name);
    }
  }
  
  if (removedCount > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validModels));
    console.log(`✅ Cleaned up ${removedCount} invalid models`);
  }
  
  return removedCount;
};