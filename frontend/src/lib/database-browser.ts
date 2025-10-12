// Browser-compatible database service
// This service makes HTTP requests to a backend API instead of connecting to PostgreSQL directly


import type { 
  Material,
  WindowGlazing,
  Construction,
  ConstructionSet,
  Scenario,
  MaterialInsert,
  WindowGlazingInsert,
  ConstructionSetInsert,
  ConstructionInsert,
  LayerInsert,
  ScenarioInsert
} from './database.types';
import { getCSRFTokenFromCookie } from './csrf';
import { authenticatedFetch } from './auth-api';

class BrowserDatabaseService {
  async deleteMaterial(id: string): Promise<void> {
    try {
      console.log('Deleting material via API:', id);
      const csrfToken = getCSRFTokenFromCookie();
      const response = await authenticatedFetch(`${this.baseUrl}/v2/materials/${id}/`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      } as RequestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      console.log('Material deleted successfully');
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }

  async deleteWindowGlazing(id: string): Promise<void> {
    try {
      console.log('Deleting window glazing via API:', id);
      const csrfToken = getCSRFTokenFromCookie();
  const response = await authenticatedFetch(`${this.baseUrl}/window-glazing/${id}`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      } as RequestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      console.log('Window glazing deleted successfully');
    } catch (error) {
      console.error('Error deleting window glazing:', error);
      throw error;
    }
  }

  async deleteConstruction(id: string): Promise<void> {
    try {
      console.log('Deleting construction via API:', id);
      const csrfToken = getCSRFTokenFromCookie();
      const response = await authenticatedFetch(`${this.baseUrl}/constructions/${id}/`, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      } as RequestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      console.log('Construction deleted successfully');
    } catch (error) {
      console.error('Error deleting construction:', error);
      throw error;
    }
  }
  private baseUrl: string;

  constructor() {
    // Point to our local API server that serves real PostgreSQL data
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    this.baseUrl = envUrl ? `${envUrl.replace(/\/$/, '')}/api` : 'http://localhost:8000/api';
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    try {
  const response = await authenticatedFetch(`${this.baseUrl}/v2/materials/`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const materials = await response.json();
      return materials;
    } catch (error) {
      console.error('Error fetching materials:', error);
      // Fallback to mock data if API is not available
      return [
        {
          id: '1',
          name: 'Concrete (Fallback)',
          roughness: 'Rough',
          thickness_m: 0.1,
          conductivity_w_mk: 1.8,
          density_kg_m3: 2300,
          specific_heat_j_kgk: 900,
          thermal_absorptance: 0.9,
          solar_absorptance: 0.7,
          visible_absorptance: 0.7,
          gwp_kgco2e_per_m2: 5.2,
          cost_sek_per_m2: 120.0,
          wall_allowed: true,
          roof_allowed: true,
          floor_allowed: true,
          window_layer_allowed: false,
          author_id: 'demo-user',
          date_created: new Date().toISOString(),
          date_modified: new Date().toISOString(),

// (removed misplaced export)
          source: 'Fallback Data',
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  async createMaterial(materialData: MaterialInsert): Promise<Material | null> {
    try {
      console.log('Creating material via API:', materialData);
      const csrfToken = getCSRFTokenFromCookie();
      const response = await authenticatedFetch(`${this.baseUrl}/v2/materials/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(materialData),
      } as RequestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const newMaterial = await response.json();
      return newMaterial;
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  }

  async updateMaterial(id: string, updates: Partial<MaterialInsert>): Promise<Material | null> {
    try {
      console.log('Updating material via API:', id, updates);
      const csrfToken = getCSRFTokenFromCookie();
      const response = await authenticatedFetch(`${this.baseUrl}/v2/materials/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(updates),
      } as RequestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const updatedMaterial = await response.json();
      return updatedMaterial;
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  }

  // Window Glazing
  async getWindowGlazing(): Promise<WindowGlazing[]> {
    try {
  const response = await authenticatedFetch(`${this.baseUrl}/window-glazing`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const glazings = await response.json();
      return glazings;
    } catch (error) {
      console.error('Error fetching window glazing:', error);
      // Fallback to empty list if API is not available
      return [];
    }
  }

  async createWindowGlazing(glazingData: WindowGlazingInsert): Promise<WindowGlazing | null> {
    try {
      console.log('Creating window glazing:', glazingData);
      // Mock creation - in real implementation this would be an API call
      const newGlazing: WindowGlazing = {
        id: Date.now().toString(),
        name: glazingData.name,
        thickness_m: glazingData.thickness_m,
        conductivity_w_mk: glazingData.conductivity_w_mk,
        solar_transmittance: glazingData.solar_transmittance ?? 0.7,
        visible_transmittance: glazingData.visible_transmittance ?? 0.8,
        infrared_transmittance: glazingData.infrared_transmittance ?? 0.0,
        front_ir_emissivity: glazingData.front_ir_emissivity ?? 0.84,
        back_ir_emissivity: glazingData.back_ir_emissivity ?? 0.84,
        gwp_kgco2e_per_m2: glazingData.gwp_kgco2e_per_m2,
        cost_sek_per_m2: glazingData.cost_sek_per_m2,
        author_id: glazingData.author_id ?? 'demo-user',
        date_created: glazingData.date_created ?? new Date().toISOString(),
        date_modified: glazingData.date_modified ?? new Date().toISOString(),
        source: glazingData.source ?? 'User Created',
        created_at: new Date().toISOString(),
      };
      return newGlazing;
    } catch (error) {
      console.error('Error creating window glazing:', error);
      throw error;
    }
  }

  async updateWindowGlazing(id: string, updates: Partial<WindowGlazingInsert>): Promise<WindowGlazing | null> {
    try {
      console.log('Updating window glazing:', id, updates);
      const glazings = await this.getWindowGlazing();
      const glazing = glazings.find(g => g.id === id);
      if (glazing) {
        return { ...glazing, ...updates };
      }
      return null;
    } catch (error) {
      console.error('Error updating window glazing:', error);
      throw error;
    }
  }

  // Constructions
  async getConstructions(): Promise<Construction[]> {
    try {
  const response = await authenticatedFetch(`${this.baseUrl}/constructions/`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const constructions = await response.json();
      return constructions;
    } catch (error) {
      console.error('Error fetching constructions:', error);
      // Fallback to empty array if API is not available
      return [];
    }
  }

  async getConstruction(id: string): Promise<Construction | null> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/constructions/${id}/`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const construction = await response.json();
      return construction;
    } catch (error) {
      console.error('Error fetching construction detail:', error);
      return null;
    }
  }

  // Construction Sets
  async getConstructionSets(): Promise<ConstructionSet[]> {
    try {
  const response = await authenticatedFetch(`${this.baseUrl}/construction-sets/`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const constructionSets = await response.json();
      return constructionSets;
    } catch (error) {
      console.error('Error fetching construction sets:', error);
      // Fallback to empty array if API is not available
      return [];
    }
  }

  async createConstructionSet(constructionSetData: ConstructionSetInsert): Promise<ConstructionSet | null> {
    try {
      console.log('Creating construction set via API:', constructionSetData);
      
  const response = await authenticatedFetch(`${this.baseUrl}/construction-sets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(constructionSetData),
      } as RequestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const newSet = await response.json();
      return newSet;
      
    } catch (error) {
      console.error('Error creating construction set:', error);
      throw error;
    }
  }

  async updateConstructionSet(id: string, updates: Partial<ConstructionSetInsert>): Promise<ConstructionSet | null> {
    try {
      console.log('Updating construction set via API:', id, updates);
      
  const response = await authenticatedFetch(`${this.baseUrl}/construction-sets/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      } as RequestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const updatedSet = await response.json();
      return updatedSet;
      
    } catch (error) {
      console.error('Error updating construction set:', error);
      throw error;
    }
  }

  async deleteConstructionSet(id: string): Promise<void> {
    try {
      console.log('Deleting construction set via API:', id);
      
  const response = await authenticatedFetch(`${this.baseUrl}/construction-sets/${id}/`, {
        method: 'DELETE',
      } as RequestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Construction set deleted successfully');
      
    } catch (error) {
      console.error('Error deleting construction set:', error);
      throw error;
    }
  }

  // Complex operations
  async createConstruction(
    construction: ConstructionInsert,
    layers: Omit<LayerInsert, 'construction_id'>[]
  ) {
    try {
      console.log('Creating construction via API:', construction);
      // Send construction and layers to API for persistence
  const response = await authenticatedFetch(`${this.baseUrl}/constructions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...construction, layers }),
      } as RequestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const newConstruction = await response.json();
      return newConstruction;
      
    } catch (error) {
      console.error('Error creating construction:', error);
      throw error;
    }
  }

  async updateConstruction(
    id: string,
    construction: Partial<ConstructionInsert>,
    layers: Omit<LayerInsert, 'construction_id'>[]
  ) {
    try {
      console.log('Updating construction via API:', id, construction);
      // Send update including layers so backend can replace them
  const response = await authenticatedFetch(`${this.baseUrl}/constructions/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...construction, layers }),
      } as RequestInit);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const updatedConstruction = await response.json();
      return updatedConstruction;
      
    } catch (error) {
      console.error('Error updating construction:', error);
      throw error;
    }
  }

  // Scenarios
  async getScenarios(): Promise<Scenario[]> {
    try {
  const response = await authenticatedFetch(`${this.baseUrl}/scenarios/`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const scenarios = await response.json();
      return scenarios;
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      // Fallback to empty list
      return [];
    }
  }

  async createScenario(
    scenario: ScenarioInsert,
    constructions: { constructionId: string, elementType: string }[]
  ): Promise<Scenario> {
    try {
      console.log('Creating scenario via API:', scenario, constructions);
      const csrfToken = getCSRFTokenFromCookie();
      const body = { ...scenario, constructions };
      const response = await authenticatedFetch(`${this.baseUrl}/scenarios/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(body),
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const created = await response.json();
      // If backend returns id only, fetch the full scenario list to refresh client
      if (created && created.id) {
        const all = await this.getScenarios();
        const newScenario = all.find((s: any) => String(s.id) === String(created.id));
        return newScenario ?? ({ id: created.id, ...scenario } as unknown as Scenario);
      }
      return created as unknown as Scenario;
    } catch (error) {
      console.error('Error creating scenario:', error);
      throw error;
    }
  }

  async updateScenario(
    id: string,
    scenario: Partial<ScenarioInsert>,
    constructions: { constructionId: string, elementType: string }[]
  ): Promise<void> {
    try {
      console.log('Updating scenario via API:', id, scenario, constructions);
      const csrfToken = getCSRFTokenFromCookie();
      const body = { ...scenario, constructions };
      const response = await authenticatedFetch(`${this.baseUrl}/scenarios/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        body: JSON.stringify(body),
      } as RequestInit);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating scenario:', error);
      throw error;
    }
  }

  async deleteScenario(id: string): Promise<{ status: 'deleted' | 'not_found' }> {
    try {
      console.log('Deleting scenario via API:', id);
      // Quick sanity check: ensure id looks like a UUID. Some UI state uses placeholders
      // like 'unspecified' or includes suffixes; avoid calling backend for those.
      const isUUID = (s?: string | null) => {
        if (!s) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
      };
      if (!isUUID(id)) {
        console.warn(`deleteScenario called with non-UUID id '${id}', treating as not_found`);
        return { status: 'not_found' };
      }
      const csrfToken = getCSRFTokenFromCookie();

      // Directly issue DELETE. Backend treats DELETE as idempotent and will return 204
      // even if the resource doesn't exist which avoids noisy GET 404 logs.
      const detailUrl = `${this.baseUrl}/scenarios/${id}/`;
      const response = await authenticatedFetch(detailUrl, {
        method: 'DELETE',
        headers: {
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
      } as RequestInit);

      if (!response.ok) {
        // If the resource was removed between the GET and DELETE, treat as not_found
        if (response.status === 404) {
          console.warn(`Scenario ${id} not found on server when deleting (treated as deleted)`);
          return { status: 'not_found' };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { status: 'deleted' };
    } catch (error) {
      console.error('Error deleting scenario:', error);
      throw error;
    }
  }

  // Subscription placeholders - real-time updates not needed as we use HTTP polling
  subscribeToMaterials(_callback: (materials: Material[]) => void) {
    // Subscriptions not implemented for browser client - using HTTP polling instead
    return { unsubscribe: () => {} };
  }

  subscribeToConstructions(_callback: (constructions: Construction[]) => void) {
    // Subscriptions not implemented for browser client - using HTTP polling instead
    return { unsubscribe: () => {} };
  }

  subscribeToConstructionSets(_callback: (sets: ConstructionSet[]) => void) {
    // Subscriptions not implemented for browser client - using HTTP polling instead
    return { unsubscribe: () => {} };
  }

  subscribeToScenarios(_callback: (scenarios: Scenario[]) => void) {
    // Subscriptions not implemented for browser client - using HTTP polling instead
    return { unsubscribe: () => {} };
  }
}

export const browserDatabaseService = new BrowserDatabaseService();

// Export all the functions to match the original database.ts interface
export const getMaterials = () => browserDatabaseService.getMaterials();
export const createMaterial = (data: MaterialInsert) => browserDatabaseService.createMaterial(data);
export const updateMaterial = (id: string, updates: Partial<MaterialInsert>) => browserDatabaseService.updateMaterial(id, updates);
export const deleteMaterial = (id: string) => browserDatabaseService.deleteMaterial(id);
export const getWindowGlazing = () => browserDatabaseService.getWindowGlazing();
export const createWindowGlazing = (data: WindowGlazingInsert) => browserDatabaseService.createWindowGlazing(data);
export const updateWindowGlazing = (id: string, updates: Partial<WindowGlazingInsert>) => browserDatabaseService.updateWindowGlazing(id, updates);
export const deleteWindowGlazing = (id: string) => browserDatabaseService.deleteWindowGlazing(id);
export const deleteConstruction = (id: string) => browserDatabaseService.deleteConstruction(id);
export const getConstructions = () => browserDatabaseService.getConstructions();
export const getConstruction = (id: string) => browserDatabaseService.getConstruction(id);
export const getConstructionSets = () => browserDatabaseService.getConstructionSets();
export const createConstructionSet = (data: ConstructionSetInsert) => browserDatabaseService.createConstructionSet(data);
export const updateConstructionSet = (id: string, updates: Partial<ConstructionSetInsert>) => browserDatabaseService.updateConstructionSet(id, updates);
export const deleteConstructionSet = (id: string) => browserDatabaseService.deleteConstructionSet(id);
export const createConstruction = (construction: ConstructionInsert, layers: Omit<LayerInsert, 'construction_id'>[]) => browserDatabaseService.createConstruction(construction, layers);
export const updateConstruction = (id: string, construction: Partial<ConstructionInsert>, layers: Omit<LayerInsert, 'construction_id'>[]) => browserDatabaseService.updateConstruction(id, construction, layers);
export const getScenarios = () => browserDatabaseService.getScenarios();
export const createScenario = (scenario: ScenarioInsert, constructions: { constructionId: string, elementType: string }[]) => browserDatabaseService.createScenario(scenario, constructions);
export const updateScenario = (id: string, scenario: Partial<ScenarioInsert>, constructions: { constructionId: string, elementType: string }[]) => browserDatabaseService.updateScenario(id, scenario, constructions);
export const deleteScenario = (id: string) => browserDatabaseService.deleteScenario(id);
export const subscribeToMaterials = (callback: (materials: Material[]) => void) => browserDatabaseService.subscribeToMaterials(callback);
export const subscribeToConstructions = (callback: (constructions: Construction[]) => void) => browserDatabaseService.subscribeToConstructions(callback);
export const subscribeToConstructionSets = (callback: (sets: ConstructionSet[]) => void) => browserDatabaseService.subscribeToConstructionSets(callback);
export const subscribeToScenarios = (callback: (scenarios: Scenario[]) => void) => browserDatabaseService.subscribeToScenarios(callback);