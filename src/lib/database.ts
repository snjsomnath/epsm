import { supabase } from './supabase';

// Materials
export const getMaterials = async () => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createMaterial = async (material: any) => {
  const { data, error } = await supabase
    .from('materials')
    .insert([{ ...material, author_id: (await supabase.auth.getUser()).data.user?.id }])
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

export const createWindowGlazing = async (glazing: any) => {
  const { data, error } = await supabase
    .from('window_glazing')
    .insert([{ ...glazing, author_id: (await supabase.auth.getUser()).data.user?.id }])
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

export const createConstruction = async (construction: any, layers: any[]) => {
  const { data: constructionData, error: constructionError } = await supabase
    .from('constructions')
    .insert([{ ...construction, author_id: (await supabase.auth.getUser()).data.user?.id }])
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

export const createConstructionSet = async (constructionSet: any) => {
  const { data, error } = await supabase
    .from('construction_sets')
    .insert([{ ...constructionSet, author_id: (await supabase.auth.getUser()).data.user?.id }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};