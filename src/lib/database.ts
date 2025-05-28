import { supabase } from './supabase';
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
export const getMaterials = async (): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch materials:', err);
    throw err;
  }
};

export const createMaterial = async (material: MaterialInsert) => {
  try {
    console.log("database.ts: Creating material in Supabase:", material);
    
    // Ensure all required fields are present and have valid values
    const validatedMaterial = {
      ...material,
      thickness_m: material.thickness_m || 0,
      conductivity_w_mk: material.conductivity_w_mk || 0,
      density_kg_m3: material.density_kg_m3 || 0,
      specific_heat_j_kgk: material.specific_heat_j_kgk || 0,
      roughness: material.roughness || 'MediumRough',
      thermal_absorptance: material.thermal_absorptance ?? 0.9,
      solar_absorptance: material.solar_absorptance ?? 0.7,
      visible_absorptance: material.visible_absorptance ?? 0.7,
      gwp_kgco2e_per_m2: material.gwp_kgco2e_per_m2 || 0,
      cost_sek_per_m2: material.cost_sek_per_m2 || 0,
      wall_allowed: material.wall_allowed ?? true,
      roof_allowed: material.roof_allowed ?? true,
      floor_allowed: material.floor_allowed ?? true,
      window_layer_allowed: material.window_layer_allowed ?? false,
    };
    
    const { data, error, status, statusText } = await supabase
      .from('materials')
      .insert([validatedMaterial])
      .select();
    
    console.log("database.ts: Supabase response:", { data, error, status, statusText });
    
    if (error) {
      console.error("database.ts: Supabase error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn("database.ts: No data returned from Supabase insert");
      return { data: null };
    }
    
    return { data: data[0] };
  } catch (err) {
    console.error('database.ts: Failed to create material:', err);
    return { error: err };
  }
};

export const updateMaterial = async (id: string, material: Partial<MaterialInsert>) => {
  try {
    const { data, error } = await supabase
      .from('materials')
      .update(material)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to update material:', err);
    throw err;
  }
};

// Window Glazing functions
export const getWindowGlazing = async (): Promise<WindowGlazing[]> => {
  try {
    const { data, error } = await supabase
      .from('window_glazing')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch window glazing:', err);
    throw err;
  }
};

export const createWindowGlazing = async (glazing: WindowGlazingInsert) => {
  try {
    const { data, error } = await supabase
      .from('window_glazing')
      .insert([glazing])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to create window glazing:', err);
    throw err;
  }
};

export const updateWindowGlazing = async (id: string, glazing: Partial<WindowGlazingInsert>) => {
  try {
    const { data, error } = await supabase
      .from('window_glazing')
      .update(glazing)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to update window glazing:', err);
    throw err;
  }
};

// Construction functions
export const getConstructions = async (): Promise<Construction[]> => {
  try {
    const { data, error } = await supabase
      .from('constructions')
      .select(`
        *,
        layers (
          *,
          material:materials(*),
          glazing:window_glazing(*)
        )
      `)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch constructions:', err);
    throw err;
  }
};

// Construction Sets functions
export const getConstructionSets = async (): Promise<ConstructionSet[]> => {
  try {
    const { data, error } = await supabase
      .from('construction_sets')
      .select(`
        *,
        wall_construction:constructions!construction_sets_wall_construction_id_fkey(*),
        roof_construction:constructions!construction_sets_roof_construction_id_fkey(*),
        floor_construction:constructions!construction_sets_floor_construction_id_fkey(*),
        window_construction:constructions!construction_sets_window_construction_id_fkey(*)
      `)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Failed to fetch construction sets:', err);
    throw err;
  }
};

export const createConstructionSet = async (constructionSet: ConstructionSetInsert) => {
  try {
    const { data, error } = await supabase
      .from('construction_sets')
      .insert([constructionSet])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to create construction set:', err);
    throw err;
  }
};

export const updateConstructionSet = async (id: string, constructionSet: Partial<ConstructionSetInsert>) => {
  try {
    const { data, error } = await supabase
      .from('construction_sets')
      .update(constructionSet)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to update construction set:', err);
    throw err;
  }
};

export const deleteConstructionSet = async (id: string) => {
  try {
    const { error } = await supabase
      .from('construction_sets')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (err) {
    console.error('Failed to delete construction set:', err);
    throw err;
  }
};

export const createConstruction = async (
  construction: ConstructionInsert,
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  try {
    console.log("database.ts: Creating construction in Supabase:", construction);
    
    // First create the construction
    const { data: constructionData, error: constructionError, status, statusText } = await supabase
      .from('constructions')
      .insert([construction])
      .select()
      .single();
    
    console.log("database.ts: Supabase construction response:", { constructionData, constructionError, status, statusText });
    
    if (constructionError) {
      console.error("database.ts: Supabase construction error:", constructionError);
      throw constructionError;
    }

    if (!constructionData) {
      console.warn("database.ts: No data returned from Supabase construction insert");
      throw new Error("No data returned from construction insert");
    }

    // Then add the layers
    if (layers.length > 0) {
      console.log("database.ts: Adding layers to construction:", layers);
      
      const constructionLayers = layers.map(layer => ({
        ...layer,
        construction_id: constructionData.id
      }));

      const { data: layersData, error: layersError } = await supabase
        .from('layers')
        .insert(constructionLayers);
      
      console.log("database.ts: Supabase layers response:", { layersData, layersError });
      
      if (layersError) {
        console.error("database.ts: Supabase layers error:", layersError);
        throw layersError;
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
    const { data: constructionData, error: constructionError } = await supabase
      .from('constructions')
      .update(construction)
      .eq('id', id)
      .select()
      .single();
    
    if (constructionError) throw constructionError;

    // Delete existing layers
    const { error: deleteError } = await supabase
      .from('layers')
      .delete()
      .eq('construction_id', id);
    
    if (deleteError) throw deleteError;

    // Add new layers
    if (layers.length > 0) {
      const constructionLayers = layers.map(layer => ({
        ...layer,
        construction_id: id
      }));

      const { error: layersError } = await supabase
        .from('layers')
        .insert(constructionLayers);
      
      if (layersError) throw layersError;
    }

    return constructionData;
  } catch (err) {
    console.error('Failed to update construction:', err);
    throw err;
  }
};

// Scenarios
export const getScenarios = async (): Promise<Scenario[]> => {
  const { data, error } = await supabase
    .from('scenarios')
    .select(`
      *,
      scenario_constructions (
        *,
        construction:construction_id (name)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createScenario = async (
  scenario: ScenarioInsert, 
  constructions: { constructionId: string, elementType: string }[]
): Promise<Scenario> => {
  // First, insert the scenario
  const { data: scenarioData, error: scenarioError } = await supabase
    .from('scenarios')
    .insert(scenario)
    .select()
    .single();

  if (scenarioError) throw scenarioError;

  if (constructions.length > 0) {
    // Then, insert the scenario_constructions
    const scenarioConstructions = constructions.map(c => ({
      scenario_id: scenarioData.id,
      construction_id: c.constructionId,
      element_type: c.elementType
    }));

    const { error: constructionsError } = await supabase
      .from('scenario_constructions')
      .insert(scenarioConstructions);

    if (constructionsError) throw constructionsError;
  }

  return scenarioData;
};

export const updateScenario = async (
  id: string,
  scenario: Partial<ScenarioInsert>,
  constructions: { constructionId: string, elementType: string }[]
): Promise<void> => {
  // First, update the scenario
  const { error: scenarioError } = await supabase
    .from('scenarios')
    .update(scenario)
    .eq('id', id);

  if (scenarioError) throw scenarioError;

  // Then, delete existing scenario_constructions
  const { error: deleteError } = await supabase
    .from('scenario_constructions')
    .delete()
    .eq('scenario_id', id);

  if (deleteError) throw deleteError;

  if (constructions.length > 0) {
    // Finally, insert new scenario_constructions
    const scenarioConstructions = constructions.map(c => ({
      scenario_id: id,
      construction_id: c.constructionId,
      element_type: c.elementType
    }));

    const { error: constructionsError } = await supabase
      .from('scenario_constructions')
      .insert(scenarioConstructions);

    if (constructionsError) throw constructionsError;
  }
};

export const deleteScenario = async (id: string): Promise<void> => {
  // Deleting the scenario will cascade to scenario_constructions
  const { error } = await supabase
    .from('scenarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const subscribeToMaterials = (callback: (materials: Material[]) => void) => {
  return supabase
    .channel('materials_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'materials' 
    }, async () => {
      const data = await getMaterials();
      if (data) callback(data);
    })
    .subscribe();
};

export const subscribeToConstructions = (callback: (constructions: Construction[]) => void) => {
  return supabase
    .channel('constructions_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'constructions' 
    }, async () => {
      const data = await getConstructions();
      if (data) callback(data);
    })
    .subscribe();
};

export const subscribeToConstructionSets = (callback: (sets: ConstructionSet[]) => void) => {
  return supabase
    .channel('construction_sets_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'construction_sets' 
    }, async () => {
      const data = await getConstructionSets();
      if (data) callback(data);
    })
    .subscribe();
};

export const subscribeToScenarios = (callback: (scenarios: Scenario[]) => void) => {
  return supabase
    .channel('scenarios_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'scenarios' 
    }, async () => {
      const data = await getScenarios();
      if (data) callback(data);
    })
    .subscribe();
};