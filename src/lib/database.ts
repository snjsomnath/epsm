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
  try {
    console.log('Fetching materials...');
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }

    console.log('Fetched materials:', data);
    return data;
  } catch (err) {
    console.error('Failed to fetch materials:', err);
    throw err;
  }
};

export const createMaterial = async (material: MaterialInsert) => {
  // First check if material already exists
  const { data: existing } = await supabase
    .from('materials')
    .select('id')
    .eq('name', material.name)
    .single();

  if (existing) {
    throw new Error(`Material "${material.name}" already exists`);
  }

  const { data, error } = await supabase
    .from('materials')
    .insert([material])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateMaterial = async (id: string, material: Partial<MaterialInsert>) => {
  try {
    // Check if new name already exists (if name is being changed)
    if (material.name) {
      const { data: existing, error: checkError } = await supabase
        .from('materials')
        .select('id')
        .eq('name', material.name)
        .neq('id', id)
        .maybeSingle(); // Use maybeSingle() instead of single()

      // Only throw error if it's not a "no rows returned" error
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // If we found an existing material with the same name
      if (existing) {
        throw new Error(`Material "${material.name}" already exists`);
      }
    }

    // Add updated_at timestamp
    const updateData = {
      ...material,
      date_modified: new Date().toISOString()
    };

    // Perform the update
    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Error updating material:', error);
      throw error;
    }

    // Check if any rows were updated
    if (!data || data.length === 0) {
      throw new Error(`Material with id ${id} not found`);
    }

    return data[0]; // Return the first (and should be only) updated record
  } catch (err) {
    console.error('Failed to update material:', err);
    throw err;
  }
};

// Window Glazing
export const getWindowGlazing = async () => {
  try {
    console.log('Fetching window glazing...');
    const { data, error } = await supabase
      .from('window_glazing')
      .select('*')
      .order('name');
    
    if (error) throw error;

    console.log('Fetched window glazing:', data);
    return data;
  } catch (err) {
    console.error('Failed to fetch window glazing:', err);
    throw err;
  }
};

export const createWindowGlazing = async (glazing: WindowGlazingInsert) => {
  // Check if glazing already exists
  const { data: existing } = await supabase
    .from('window_glazing')
    .select('id')
    .eq('name', glazing.name)
    .single();

  if (existing) {
    throw new Error(`Window glazing "${glazing.name}" already exists`);
  }

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
  try {
    console.log('Fetching constructions...');
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

    console.log('Fetched constructions:', data);
    return data;
  } catch (err) {
    console.error('Failed to fetch constructions:', err);
    throw err;
  }
};

export const createConstruction = async (
  construction: ConstructionInsert, 
  layers: Omit<LayerInsert, 'construction_id'>[]
) => {
  try {
    // Check if construction already exists
    const { data: existing } = await supabase
      .from('constructions')
      .select('id')
      .eq('name', construction.name)
      .single();

    if (existing) {
      throw new Error(`Construction "${construction.name}" already exists`);
    }

    const { data: constructionData, error: constructionError } = await supabase
      .from('constructions')
      .insert([construction])
      .select()
      .single();
    
    if (constructionError) throw constructionError;

    const layersWithConstructionId = layers.map(layer => ({
      ...layer,
      construction_id: constructionData.id
    }));

    const { error: layersError } = await supabase
      .from('layers')
      .insert(layersWithConstructionId);
    
    if (layersError) throw layersError;
    
    return constructionData;
  } catch (err) {
    console.error('Failed to create construction:', err);
    throw err;
  }
};

// Construction Sets
export const getConstructionSets = async () => {
  try {
    console.log('Fetching construction sets...');
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

    console.log('Fetched construction sets:', data);
    return data;
  } catch (err) {
    console.error('Failed to fetch construction sets:', err);
    throw err;
  }
};

export const createConstructionSet = async (constructionSet: ConstructionSetInsert) => {
  // Check if set already exists
  const { data: existing } = await supabase
    .from('construction_sets')
    .select('id')
    .eq('name', constructionSet.name)
    .single();

  if (existing) {
    throw new Error(`Construction set "${constructionSet.name}" already exists`);
  }

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