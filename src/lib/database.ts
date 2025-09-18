import { postgres } from './queryBuilder';
import type { 
  ConstructionInsert, 
  LayerInsert,
  ScenarioInsert,
  Scenario,
  Material,
  WindowGlazing,
  Construction,
  ConstructionSet,
  MaterialInsert,
  WindowGlazingInsert,
  ConstructionSetInsert
} from './database.types';

// Material functions
export async function getMaterials(): Promise<Material[]> {
  try {
    const result = await postgres
      .from('materials')
      .select('*')
      .order('name')
      .execute();

    if (result.error) {
      console.error('Error fetching materials:', result.error);
      throw result.error;
    }

    return (result.data || []) as Material[];
  } catch (error) {
    console.error('Error in getMaterials:', error);
    throw error;
  }
}export async function createMaterial(materialData: MaterialInsert): Promise<Material | null> {
  try {
    console.log('Creating material with data:', materialData);
    
    const result = await postgres
      .from('materials')
      .insert(materialData);

    console.log('Create material result:', result);

    if (result.error) {
      console.error('Error creating material:', result.error);
      throw result.error;
    }

    // Fetch the newly created record
    const fetchResult = await postgres
      .from('materials')
      .select('*')
      .eq('name', materialData.name)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching created material:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as Material[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in createMaterial:', error);
    throw error;
  }
}

export async function updateMaterial(id: string, updates: Partial<MaterialInsert>): Promise<Material | null> {
  try {
    const result = await postgres
      .from('materials')
      .eq('id', id)
      .update(updates);

    if (result.error) {
      console.error('Error updating material:', result.error);
      throw result.error;
    }

    // After update, fetch the updated record
    const fetchResult = await postgres
      .from('materials')
      .select('*')
      .eq('id', id)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching updated material:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as Material[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in updateMaterial:', error);
    throw error;
  }
}

// Window Glazing functions
export async function getWindowGlazing(): Promise<WindowGlazing[]> {
  try {
    const result = await postgres
      .from('window_glazing')
      .select('*')
      .order('name')
      .execute();

    if (result.error) {
      console.error('Error fetching window glazing:', result.error);
      throw result.error;
    }

    return (result.data || []) as WindowGlazing[];
  } catch (error) {
    console.error('Error in getWindowGlazing:', error);
    throw error;
  }
}

export async function createWindowGlazing(glazingData: WindowGlazingInsert): Promise<WindowGlazing | null> {
  try {
    const result = await postgres
      .from('window_glazing')
      .insert(glazingData);

    if (result.error) {
      console.error('Error creating window glazing:', result.error);
      throw result.error;
    }

    // Fetch the newly created record
    const fetchResult = await postgres
      .from('window_glazing')
      .select('*')
      .eq('name', glazingData.name)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching created window glazing:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as WindowGlazing[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in createWindowGlazing:', error);
    throw error;
  }
}

export async function updateWindowGlazing(id: string, updates: Partial<WindowGlazingInsert>): Promise<WindowGlazing | null> {
  try {
    const result = await postgres
      .from('window_glazing')
      .eq('id', id)
      .update(updates);

    if (result.error) {
      console.error('Error updating window glazing:', result.error);
      throw result.error;
    }

    // Fetch the updated record
    const fetchResult = await postgres
      .from('window_glazing')
      .select('*')
      .eq('id', id)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching updated window glazing:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as WindowGlazing[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in updateWindowGlazing:', error);
    throw error;
  }
}

// Construction functions
export async function getConstructions(): Promise<Construction[]> {
  try {
    const result = await postgres
      .from('constructions')
      .select('*')
      .order('name')
      .execute();

    if (result.error) {
      console.error('Error fetching constructions:', result.error);
      throw result.error;
    }

    return (result.data || []) as Construction[];
  } catch (error) {
    console.error('Error in getConstructions:', error);
    throw error;
  }
}

// Construction Sets functions
export async function getConstructionSets(): Promise<ConstructionSet[]> {
  try {
    const result = await postgres
      .from('construction_sets')
      .select('*')
      .order('name')
      .execute();

    if (result.error) {
      console.error('Error fetching construction sets:', result.error);
      throw result.error;
    }

    return (result.data || []) as ConstructionSet[];
  } catch (error) {
    console.error('Error in getConstructionSets:', error);
    throw error;
  }
}

export async function createConstructionSet(constructionSetData: ConstructionSetInsert): Promise<ConstructionSet | null> {
  try {
    const result = await postgres
      .from('construction_sets')
      .insert(constructionSetData);

    if (result.error) {
      console.error('Error creating construction set:', result.error);
      throw result.error;
    }

    // Fetch the newly created record
    const fetchResult = await postgres
      .from('construction_sets')
      .select('*')
      .eq('name', constructionSetData.name)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching created construction set:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as ConstructionSet[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in createConstructionSet:', error);
    throw error;
  }
}

export async function updateConstructionSet(id: string, updates: Partial<ConstructionSetInsert>): Promise<ConstructionSet | null> {
  try {
    const result = await postgres
      .from('construction_sets')
      .eq('id', id)
      .update(updates);

    if (result.error) {
      console.error('Error updating construction set:', result.error);
      throw result.error;
    }

    // Fetch the updated record
    const fetchResult = await postgres
      .from('construction_sets')
      .select('*')
      .eq('id', id)
      .execute();

    if (fetchResult.error) {
      console.error('Error fetching updated construction set:', fetchResult.error);
      throw fetchResult.error;
    }

    const data = fetchResult.data as ConstructionSet[];
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in updateConstructionSet:', error);
    throw error;
  }
}

export async function deleteConstructionSet(id: string): Promise<void> {
  try {
    const result = await postgres
      .from('construction_sets')
      .eq('id', id)
      .delete();

    if (result.error) {
      console.error('Error deleting construction set:', result.error);
      throw result.error;
    }
  } catch (error) {
    console.error('Error in deleteConstructionSet:', error);
    throw error;
  }
}

export const createConstruction = async (
  construction: ConstructionInsert,
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  try {
    console.log("database.ts: Creating construction in PostgreSQL:", construction);
    
    // First create the construction
    const constructionResult = await postgres
      .from('constructions')
      .insert(construction);
    
    console.log("database.ts: PostgreSQL construction response:", constructionResult);
    
    if (constructionResult.error) {
      console.error("database.ts: PostgreSQL construction error:", constructionResult.error);
      throw constructionResult.error;
    }

    // Fetch the created construction
    const fetchResult = await postgres
      .from('constructions')
      .select('*')
      .eq('name', construction.name)
      .execute();

    if (fetchResult.error || !fetchResult.data || fetchResult.data.length === 0) {
      console.error("database.ts: Failed to fetch created construction");
      throw new Error("Failed to fetch created construction");
    }

    const constructionData = (fetchResult.data as Construction[])[0];
    console.log("database.ts: Created construction data:", constructionData);

    // Then add the layers
    if (layers.length > 0) {
      console.log("database.ts: Adding layers to construction:", layers);
      
      const constructionLayers = layers.map(layer => ({
        ...layer,
        construction_id: constructionData.id
      }));

      const layersResult = await postgres
        .from('layers')
        .insert(constructionLayers);
      
      console.log("database.ts: PostgreSQL layers response:", layersResult);
      
      if (layersResult.error) {
        console.error("database.ts: PostgreSQL layers error:", layersResult.error);
        throw layersResult.error;
      }
    }

    return constructionData;
  } catch (err) {
    console.error('database.ts: Failed to create construction:', err);
    throw err;
  }
};

export const updateConstruction = async (
  id: string,
  construction: Partial<ConstructionInsert>,
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  try {
    // Update construction
    const constructionResult = await postgres
      .from('constructions')
      .eq('id', id)
      .update(construction);
    
    if (constructionResult.error) throw constructionResult.error;

    // Delete existing layers
    const deleteResult = await postgres
      .from('layers')
      .eq('construction_id', id)
      .delete();
    
    if (deleteResult.error) throw deleteResult.error;

    // Add new layers
    if (layers.length > 0) {
      const constructionLayers = layers.map(layer => ({
        ...layer,
        construction_id: id
      }));

      const layersResult = await postgres
        .from('layers')
        .insert(constructionLayers);
      
      if (layersResult.error) throw layersResult.error;
    }

    // Fetch the updated construction
    const fetchResult = await postgres
      .from('constructions')
      .select('*')
      .eq('id', id)
      .execute();

    if (fetchResult.error) throw fetchResult.error;

    const data = fetchResult.data as Construction[];
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('Failed to update construction:', err);
    throw err;
  }
};

// Scenarios
export const getScenarios = async (): Promise<Scenario[]> => {
  const result = await postgres
    .from('scenarios')
    .select('*')
    .order('created_at', { ascending: false })
    .execute();

  if (result.error) throw result.error;
  return (result.data || []) as Scenario[];
};

export const createScenario = async (
  scenario: ScenarioInsert, 
  constructions: { constructionId: string, elementType: string }[]
): Promise<Scenario> => {
  // First, insert the scenario
  const scenarioResult = await postgres
    .from('scenarios')
    .insert(scenario);

  if (scenarioResult.error) throw scenarioResult.error;

  // Fetch the created scenario
  const fetchResult = await postgres
    .from('scenarios')
    .select('*')
    .eq('name', scenario.name)
    .execute();

  if (fetchResult.error || !fetchResult.data || fetchResult.data.length === 0) {
    throw new Error("Failed to fetch created scenario");
  }

  const scenarioData = (fetchResult.data as Scenario[])[0];

  if (constructions.length > 0) {
    // Then, insert the scenario_constructions
    const scenarioConstructions = constructions.map(c => ({
      scenario_id: scenarioData.id,
      construction_id: c.constructionId,
      element_type: c.elementType
    }));

    const constructionsResult = await postgres
      .from('scenario_constructions')
      .insert(scenarioConstructions);

    if (constructionsResult.error) throw constructionsResult.error;
  }

  return scenarioData;
};

export const updateScenario = async (
  id: string,
  scenario: Partial<ScenarioInsert>,
  constructions: { constructionId: string, elementType: string }[]
): Promise<void> => {
  // First, update the scenario
  const scenarioResult = await postgres
    .from('scenarios')
    .eq('id', id)
    .update(scenario);

  if (scenarioResult.error) throw scenarioResult.error;

  // Then, delete existing scenario_constructions
  const deleteResult = await postgres
    .from('scenario_constructions')
    .eq('scenario_id', id)
    .delete();

  if (deleteResult.error) throw deleteResult.error;

  if (constructions.length > 0) {
    // Finally, insert new scenario_constructions
    const scenarioConstructions = constructions.map(c => ({
      scenario_id: id,
      construction_id: c.constructionId,
      element_type: c.elementType
    }));

    const constructionsResult = await postgres
      .from('scenario_constructions')
      .insert(scenarioConstructions);

    if (constructionsResult.error) throw constructionsResult.error;
  }
};

export const deleteScenario = async (id: string): Promise<void> => {
  // Deleting the scenario will cascade to scenario_constructions
  const result = await postgres
    .from('scenarios')
    .eq('id', id)
    .delete();

  if (result.error) throw result.error;
};

export const subscribeToMaterials = (_callback: (materials: Material[]) => void) => {
  // Note: Real-time subscriptions not available with PostgreSQL client
  // For real-time functionality, consider implementing WebSocket server or polling
  console.warn('Real-time subscriptions not implemented for PostgreSQL client');
  return { unsubscribe: () => {} };
};

export const subscribeToConstructions = (_callback: (constructions: Construction[]) => void) => {
  // Note: Real-time subscriptions not available with PostgreSQL client
  // For real-time functionality, consider implementing WebSocket server or polling
  console.warn('Real-time subscriptions not implemented for PostgreSQL client');
  return { unsubscribe: () => {} };
};

export const subscribeToConstructionSets = (_callback: (sets: ConstructionSet[]) => void) => {
  // Note: Real-time subscriptions not available with PostgreSQL client
  // For real-time functionality, consider implementing WebSocket server or polling
  console.warn('Real-time subscriptions not implemented for PostgreSQL client');
  return { unsubscribe: () => {} };
};

export const subscribeToScenarios = (_callback: (scenarios: Scenario[]) => void) => {
  // Note: Real-time subscriptions not available with PostgreSQL client
  // For real-time functionality, consider implementing WebSocket server or polling
  console.warn('Real-time subscriptions not implemented for PostgreSQL client');
  return { unsubscribe: () => {} };
};