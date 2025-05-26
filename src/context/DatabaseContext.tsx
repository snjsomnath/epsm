import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  getMaterials, 
  getWindowGlazing, 
  getConstructions, 
  getConstructionSets,
  createMaterial,
  updateMaterial,
  createWindowGlazing,
  updateWindowGlazing,
  createConstruction,
  updateConstruction,
  createConstructionSet,
  subscribeToMaterials,
  subscribeToConstructions,
  subscribeToConstructionSets
} from '../lib/database';
import type { 
  Material, 
  WindowGlazing, 
  Construction, 
  ConstructionSet,
  MaterialInsert,
  WindowGlazingInsert,
  ConstructionInsert,
  LayerInsert,
  ConstructionSetInsert
} from '../lib/database.types';

interface DatabaseContextType {
  materials: Material[];
  windowGlazing: WindowGlazing[];
  constructions: Construction[];
  constructionSets: ConstructionSet[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addMaterial: (material: MaterialInsert) => Promise<void>;
  updateMaterial: (id: string, material: Partial<MaterialInsert>) => Promise<void>;
  addWindowGlazing: (glazing: WindowGlazingInsert) => Promise<void>;
  updateWindowGlazing: (id: string, glazing: Partial<WindowGlazingInsert>) => Promise<void>;
  addConstruction: (construction: ConstructionInsert, layers: Omit<LayerInsert, 'construction_id'>[]) => Promise<void>;
  updateConstruction: (id: string, construction: Partial<ConstructionInsert>, layers: Omit<LayerInsert, 'construction_id'>[]) => Promise<void>;
  addConstructionSet: (constructionSet: ConstructionSetInsert) => Promise<void>;
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
  updateMaterial: async () => {},
  addWindowGlazing: async () => {},
  updateWindowGlazing: async () => {},
  addConstruction: async () => {},
  updateConstruction: async () => {},
  addConstructionSet: async () => {},
});

export const useDatabase = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider = ({ children }: DatabaseProviderProps) => {
  const { isAuthenticated } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [windowGlazing, setWindowGlazing] = useState<WindowGlazing[]>([]);
  const [constructions, setConstructions] = useState<Construction[]>([]);
  const [constructionSets, setConstructionSets] = useState<ConstructionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isAuthenticated) return;

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

  const handleAddMaterial = async (material: MaterialInsert) => {
    try {
      await createMaterial(material);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add material');
      throw err;
    }
  };

  const handleUpdateMaterial = async (id: string, material: Partial<MaterialInsert>) => {
    try {
      await updateMaterial(id, material);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update material');
      throw err;
    }
  };

  const handleAddWindowGlazing = async (glazing: WindowGlazingInsert) => {
    try {
      await createWindowGlazing(glazing);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add window glazing');
      throw err;
    }
  };

  const handleUpdateWindowGlazing = async (id: string, glazing: Partial<WindowGlazingInsert>) => {
    try {
      await updateWindowGlazing(id, glazing);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update window glazing');
      throw err;
    }
  };

  const handleAddConstruction = async (construction: ConstructionInsert, layers: Omit<LayerInsert, 'construction_id'>[]) => {
    try {
      await createConstruction(construction, layers);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add construction');
      throw err;
    }
  };

  const handleUpdateConstruction = async (id: string, construction: Partial<ConstructionInsert>, layers: Omit<LayerInsert, 'construction_id'>[]) => {
    try {
      await updateConstruction(id, construction, layers);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update construction');
      throw err;
    }
  };

  const handleAddConstructionSet = async (constructionSet: ConstructionSetInsert) => {
    try {
      await createConstructionSet(constructionSet);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add construction set');
      throw err;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();

      // Set up realtime subscriptions
      const materialsSubscription = subscribeToMaterials(setMaterials);
      const constructionsSubscription = subscribeToConstructions(setConstructions);
      const setsSubscription = subscribeToConstructionSets(setConstructionSets);

      return () => {
        materialsSubscription.unsubscribe();
        constructionsSubscription.unsubscribe();
        setsSubscription.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const value = {
    materials,
    windowGlazing,
    constructions,
    constructionSets,
    loading,
    error,
    refreshData: fetchData,
    addMaterial: handleAddMaterial,
    updateMaterial: handleUpdateMaterial,
    addWindowGlazing: handleAddWindowGlazing,
    updateWindowGlazing: handleUpdateWindowGlazing,
    addConstruction: handleAddConstruction,
    updateConstruction: handleUpdateConstruction,
    addConstructionSet: handleAddConstructionSet,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};