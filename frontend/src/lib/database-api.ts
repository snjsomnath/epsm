/**
 * Simple API-based database functions
 * Makes HTTP requests to Django backend instead of direct database calls
 */

import { authenticatedFetch } from './auth-api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Type definitions (simplified for now)
export interface Material {
  id: string;
  name: string;
  description?: string;
  thermal_conductivity?: number;
  density?: number;
  specific_heat?: number;
}

export interface Construction {
  id: string;
  name: string;
  description?: string;
}

export interface ConstructionSet {
  id: string;
  name: string;
  description?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Material functions
export async function getMaterials(): Promise<Material[]> {
  try {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/v2/materials/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
}

export async function createMaterial(materialData: Partial<Material>): Promise<Material | null> {
  try {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/v2/materials/`, {
      method: 'POST',
      body: JSON.stringify(materialData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating material:', error);
    return null;
  }
}

// Construction functions
export async function getConstructions(): Promise<Construction[]> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/constructions/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error fetching constructions:', error);
    return [];
  }
}

// Construction Sets functions
export async function getConstructionSets(): Promise<ConstructionSet[]> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/construction-sets/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error fetching construction sets:', error);
    return [];
  }
}

// Scenarios
export async function getScenarios(): Promise<Scenario[]> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/scenarios/`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return [];
  }
}

// Placeholder subscription functions (no real-time updates for now)
export const subscribeToMaterials = (_callback: (materials: Material[]) => void) => {
  console.warn('Real-time subscriptions not implemented for API client');
  return { unsubscribe: () => {} };
};

export const subscribeToConstructions = (_callback: (constructions: Construction[]) => void) => {
  console.warn('Real-time subscriptions not implemented for API client');
  return { unsubscribe: () => {} };
};

export const subscribeToConstructionSets = (_callback: (sets: ConstructionSet[]) => void) => {
  console.warn('Real-time subscriptions not implemented for API client');
  return { unsubscribe: () => {} };
};

export const subscribeToScenarios = (_callback: (scenarios: Scenario[]) => void) => {
  console.warn('Real-time subscriptions not implemented for API client');
  return { unsubscribe: () => {} };
};