// Add these functions to the existing database.ts file

import { supabase } from './supabase';
import type { 
  ConstructionInsert, 
  LayerInsert,
  ScenarioInsert,
  Scenario 
} from './database.types';

// Construction functions
export const createConstruction = async (
  construction: ConstructionInsert,
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  try {
    // First create the construction
    const { data: constructionData, error: constructionError } = await supabase
      .from('constructions')
      .insert([construction])
      .select()
      .single();
    
    if (constructionError) throw constructionError;

    // Then add the layers
    if (layers.length > 0) {
      const constructionLayers = layers.map(layer => ({
        ...layer,
        construction_id: constructionData.id
      }));

      const { error: layersError } = await supabase
        .from('layers')
        .insert(constructionLayers);
      
      if (layersError) throw layersError;
    }

    return constructionData;
  } catch (err) {
    console.error('Failed to create construction:', err);
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
export const getScenarios = async () => {
  try {
    console.log('Fetching scenarios...');
    const { data, error } = await supabase
      .from('scenarios')
      .select(`
        *,
        scenario_constructions (
          *,
          construction:constructions(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Failed to fetch scenarios:', err);
    throw err;
  }
};

export const createScenario = async (
  scenario: ScenarioInsert,
  constructions: { constructionId: string, elementType: string }[]
) => {
  try {
    // First create the scenario
    const { data: scenarioData, error: scenarioError } = await supabase
      .from('scenarios')
      .insert([scenario])
      .select()
      .single();
    
    if (scenarioError) throw scenarioError;

    // Then add the constructions
    if (constructions.length > 0) {
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
  } catch (err) {
    console.error('Failed to create scenario:', err);
    throw err;
  }
};

export const updateScenario = async (
  id: string,
  scenario: Partial<ScenarioInsert>,
  constructions: { constructionId: string, elementType: string }[]
) => {
  try {
    // Update scenario
    const { data: scenarioData, error: scenarioError } = await supabase
      .from('scenarios')
      .update(scenario)
      .eq('id', id)
      .select()
      .single();
    
    if (scenarioError) throw scenarioError;

    // Delete existing constructions
    const { error: deleteError } = await supabase
      .from('scenario_constructions')
      .delete()
      .eq('scenario_id', id);
    
    if (deleteError) throw deleteError;

    // Add new constructions
    if (constructions.length > 0) {
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

    return scenarioData;
  } catch (err) {
    console.error('Failed to update scenario:', err);
    throw err;
  }
};

export const deleteScenario = async (id: string) => {
  try {
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (err) {
    console.error('Failed to delete scenario:', err);
    throw err;
  }
};

// Subscribe to scenario changes
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