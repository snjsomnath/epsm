import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getMaterials, 
  getWindowGlazing, 
  getConstructions, 
  getConstructionSets,
  createMaterial,
  createWindowGlazing,
  createConstruction,
  createConstructionSet
} from '../lib/database';

interface DatabaseContextType {
  materials: any[];
  windowGlazing: any[];
  constructions: any[];
  constructionSets: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addMaterial: (material: any) => Promise<void>;
  addWindowGlazing: (glazing: any) => Promise<void>;
  addConstruction: (construction: any, layers: any[]) => Promise<void>;
  addConstructionSet: (constructionSet: any) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  materials: [],
  windowGlazing: [],
  constructions: [],
  constructionSets: [],
  loading: true,
  error: null,
  refreshData: async () => {},
  addMaterial: async () => {},
  addWindowGlazing: async () => {},
  addConstruction: async () => {},
  addConstructionSet: async () => {},
});

export const useDatabase = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider = ({ children }: DatabaseProviderProps) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [windowGlazing, setWindowGlazing] = useState<any[]>([]);
  const [constructions, setConstructions] = useState<any[]>([]);
  const [constructionSets, setConstructionSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        materialsData,
        glazingData,
        constructionsData,
        setsData
      ] = await Promise.all([
        getMaterials(),
        getWindowGlazing(),
        getConstructions(),
        getConstructionSets()
      ]);

      setMaterials(materialsData);
      setWindowGlazing(glazingData);
      setConstructions(constructionsData);
      setConstructionSets(setsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addMaterial = async (material: any) => {
    try {
      await createMaterial(material);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add material');
      throw err;
    }
  };

  const addWindowGlazing = async (glazing: any) => {
    try {
      await createWindowGlazing(glazing);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add window glazing');
      throw err;
    }
  };

  const addConstruction = async (construction: any, layers: any[]) => {
    try {
      await createConstruction(construction, layers);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add construction');
      throw err;
    }
  };

  const addConstructionSet = async (constructionSet: any) => {
    try {
      await createConstructionSet(constructionSet);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add construction set');
      throw err;
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const materialsSubscription = supabase
      .channel('materials_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, fetchData)
      .subscribe();

    const glazingSubscription = supabase
      .channel('glazing_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'window_glazing' }, fetchData)
      .subscribe();

    const constructionsSubscription = supabase
      .channel('constructions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'constructions' }, fetchData)
      .subscribe();

    const setsSubscription = supabase
      .channel('sets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'construction_sets' }, fetchData)
      .subscribe();

    return () => {
      materialsSubscription.unsubscribe();
      glazingSubscription.unsubscribe();
      constructionsSubscription.unsubscribe();
      setsSubscription.unsubscribe();
    };
  }, []);

  const value = {
    materials,
    windowGlazing,
    constructions,
    constructionSets,
    loading,
    error,
    refreshData: fetchData,
    addMaterial,
    addWindowGlazing,
    addConstruction,
    addConstructionSet,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};