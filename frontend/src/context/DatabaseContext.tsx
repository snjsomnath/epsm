import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  getMaterials, 
  getWindowGlazing, 
  getConstructions, 
  getConstructionSets,
  getScenarios,
  createMaterial,
  updateMaterial,
  createWindowGlazing,
  updateWindowGlazing,
  createConstruction,
  updateConstruction,
  createConstructionSet,
  updateConstructionSet,
  deleteConstructionSet,
  createScenario,
  updateScenario as updateScenarioInDb,
  deleteScenario as deleteScenarioInDb,
  subscribeToMaterials,
  subscribeToConstructions,
  subscribeToConstructionSets,
  subscribeToScenarios
} from '../lib/database-browser';
import type { 
  Material, 
  WindowGlazing, 
  Construction, 
  ConstructionSet,
  Scenario,
  MaterialInsert,
  WindowGlazingInsert,
  ConstructionInsert,
  LayerInsert,
  ConstructionSetInsert,
  ScenarioInsert
} from '../lib/database.types';

interface DatabaseContextType {
  materials: Material[];
  windowGlazing: WindowGlazing[];
  constructions: Construction[];
  constructionSets: ConstructionSet[];
  scenarios: Scenario[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addMaterial: (material: MaterialInsert) => Promise<any>;
  updateMaterial: (id: string, material: Partial<MaterialInsert>) => Promise<any>;
  addWindowGlazing: (glazing: WindowGlazingInsert) => Promise<any>;
  updateWindowGlazing: (id: string, glazing: Partial<WindowGlazingInsert>) => Promise<any>;
  addConstruction: (construction: ConstructionInsert, layers: Omit<LayerInsert, 'construction_id'>[]) => Promise<any>;
  updateConstruction: (id: string, construction: Partial<ConstructionInsert>, layers: Omit<LayerInsert, 'construction_id'>[]) => Promise<any>;
  addConstructionSet: (constructionSet: ConstructionSetInsert) => Promise<any>;
  updateConstructionSet: (id: string, constructionSet: Partial<ConstructionSetInsert>) => Promise<any>;
  deleteConstructionSet: (id: string) => Promise<any>;
  addScenario: (scenario: ScenarioInsert, constructions: { constructionId: string, elementType: string }[]) => Promise<any>;
  updateScenario: (id: string, scenario: Partial<ScenarioInsert>, constructions: { constructionId: string, elementType: string }[]) => Promise<any>;
  deleteScenario: (id: string) => Promise<any>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  materials: [],
  windowGlazing: [],
  constructions: [],
  constructionSets: [],
  scenarios: [],
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
  updateConstructionSet: async () => {},
  deleteConstructionSet: async () => {},
  addScenario: async () => {},
  updateScenario: async () => {},
  deleteScenario: async () => {},
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
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
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
        setsData,
        scenariosData
      ] = await Promise.all([
        getMaterials(),
        getWindowGlazing(),
        getConstructions(),
        getConstructionSets(),
        getScenarios()
      ]);

      setMaterials(materialsData);
      setWindowGlazing(glazingData);
      setConstructions(constructionsData);
      setConstructionSets(setsData);
      setScenarios(scenariosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (material: MaterialInsert) => {
    try {
      console.log("DatabaseContext: Adding material via API:", material);
      const result = await createMaterial(material);
      console.log("DatabaseContext: Result from createMaterial:", result);
      
      try {
        const updatedMaterials = await getMaterials();
        setMaterials(updatedMaterials);
        console.log("Materials list refreshed successfully");
      } catch (refreshError) {
        console.warn("Failed to refresh materials after adding:", refreshError);
      }
      
      return result;
    } catch (error) {
      console.error("DatabaseContext: Error in addMaterial:", error);
      setError(error instanceof Error ? error.message : 'Failed to add material');
      return { error };
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

  const handleAddConstruction = async (
    construction: ConstructionInsert,
    layers: Omit<LayerInsert, 'construction_id'>[]
  ) => {
    try {
      console.log("DatabaseContext: Adding construction to PostgreSQL:", construction);
      const result = await createConstruction(construction, layers);
      console.log("DatabaseContext: Result from createConstruction:", result);
      
      try {
        const updatedConstructions = await getConstructions();
        setConstructions(updatedConstructions);
        console.log("Constructions list refreshed successfully");
      } catch (refreshError) {
        console.warn("Failed to refresh constructions after adding:", refreshError);
      }
      
      return { data: result };
    } catch (error) {
      console.error("DatabaseContext: Error in addConstruction:", error);
      setError(error instanceof Error ? error.message : 'Failed to add construction');
      return { error };
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

  const handleUpdateConstructionSet = async (id: string, constructionSet: Partial<ConstructionSetInsert>) => {
    try {
      await updateConstructionSet(id, constructionSet);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update construction set');
      throw err;
    }
  };

  const handleDeleteConstructionSet = async (id: string) => {
    try {
      await deleteConstructionSet(id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete construction set');
      throw err;
    }
  };

  const handleAddScenario = async (
    scenario: ScenarioInsert, 
    constructions: { constructionId: string, elementType: string }[]
  ) => {
    try {
      // Ensure we only send a valid UUID for author_id (backend expects UUID).
      const isUUID = (id?: string | null) => {
        if (!id) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      };

      const scenarioToSend = { ...scenario } as any;
      if (!isUUID(scenarioToSend.author_id)) {
        delete scenarioToSend.author_id;
      }

      await createScenario(scenarioToSend, constructions);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add scenario');
      throw err;
    }
  };

  const handleUpdateScenario = async (
    id: string, 
    scenario: Partial<ScenarioInsert>, 
    constructions: { constructionId: string, elementType: string }[]
  ) => {
    try {
      const isUUID = (id?: string | null) => {
        if (!id) return false;
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      };

      const scenarioToSend = { ...scenario } as any;
      if (!isUUID(scenarioToSend.author_id)) {
        delete scenarioToSend.author_id;
      }

      await updateScenarioInDb(id, scenarioToSend, constructions);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scenario');
      throw err;
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      const res = await deleteScenarioInDb(id);
      // Refresh list regardless of whether backend reported not_found
      await fetchData();
      // Notify other components (like ResultsPage) that scenarios changed so they can refresh
      try {
        window.dispatchEvent(new CustomEvent('scenarios:changed', { detail: { id, result: res } }));
      } catch (e) {
        // ignore
      }
      return res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
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
      const scenariosSubscription = subscribeToScenarios(setScenarios);

      return () => {
        materialsSubscription.unsubscribe();
        constructionsSubscription.unsubscribe();
        setsSubscription.unsubscribe();
        scenariosSubscription.unsubscribe();
      };
    }
  }, [isAuthenticated]);

  const value = {
    materials,
    windowGlazing,
    constructions,
    constructionSets,
    scenarios,
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
    updateConstructionSet: handleUpdateConstructionSet,
    deleteConstructionSet: handleDeleteConstructionSet,
    addScenario: handleAddScenario,
    updateScenario: handleUpdateScenario,
    deleteScenario: handleDeleteScenario,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};