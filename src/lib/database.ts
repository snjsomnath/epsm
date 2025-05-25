import { supabase } from './supabase';
import type { Database } from './database.types';
import type { 
  Material, 
  MaterialInsert,
  WindowGlazing,
  WindowGlazingInsert,
  Construction,
  ConstructionInsert,
  Layer,
  LayerInsert,
  ConstructionSet,
  ConstructionSetInsert
} from './database.types';

// Materials
export const getMaterials = async () => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createMaterial = async (material: MaterialInsert) => {
  const { data, error } = await supabase
    .from('materials')
    .insert([material])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Window Glazing
export const getWindowGlazing = async () => {
  const { data, error } = await supabase
    .from('window_glazing')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createWindowGlazing = async (glazing: WindowGlazingInsert) => {
  const { data, error } = await supabase
    .from('window_glazing')
    .insert([glazing])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Constructions
export const getConstructions = async () => {
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
  return data;
};

export const createConstruction = async (
  construction: ConstructionInsert, 
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  // Start a transaction
  const { data: constructionData, error: constructionError } = await supabase
    .from('constructions')
    .insert([construction])
    .select()
    .single();
  
  if (constructionError) throw constructionError;

  // Add layers with the new construction ID
  const layersWithConstructionId = layers.map(layer => ({
    ...layer,
    construction_id: constructionData.id
  }));

  const { error: layersError } = await supabase
    .from('layers')
    .insert(layersWithConstructionId);
  
  if (layersError) throw layersError;
  
  return constructionData;
};

// Construction Sets
export const getConstructionSets = async () => {
  const { data, error } = await supabase
    .from('construction_sets')
    .select(`
      *,
      wall_construction:constructions!wall_construction_id(*),
      roof_construction:constructions!roof_construction_id(*),
      floor_construction:constructions!floor_construction_id(*),
      window_construction:constructions!window_construction_id(*)
    `)
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createConstructionSet = async (constructionSet: ConstructionSetInsert) => {
  const { data, error } = await supabase
    .from('construction_sets')
    .insert([constructionSet])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Realtime subscriptions
export const subscribeToMaterials = (callback: (materials: Material[]) => void) => {
  return supabase
    .channel('materials_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'materials' 
    }, async () => {
      const { data } = await getMaterials();
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
      const { data } = await getConstructions();
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
      const { data } = await getConstructionSets();
      if (data) callback(data);
    })
    .subscribe();
};