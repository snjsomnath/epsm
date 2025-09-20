import { Database as DatabaseGenerated } from './database.generated.types';

export type Database = DatabaseGenerated;

export type Material = Database['public']['Tables']['materials']['Row'];
export type WindowGlazing = Database['public']['Tables']['window_glazing']['Row'];
export type Construction = Database['public']['Tables']['constructions']['Row'];
export type Layer = Database['public']['Tables']['layers']['Row'];
export type ConstructionSet = Database['public']['Tables']['construction_sets']['Row'];
export type Scenario = Database['public']['Tables']['scenarios']['Row'];
export type ScenarioConstruction = Database['public']['Tables']['scenario_constructions']['Row'];

export type MaterialInsert = Database['public']['Tables']['materials']['Insert'];
export type WindowGlazingInsert = Database['public']['Tables']['window_glazing']['Insert'];
export type ConstructionInsert = Database['public']['Tables']['constructions']['Insert'];
export type LayerInsert = Database['public']['Tables']['layers']['Insert'];
export type ConstructionSetInsert = Database['public']['Tables']['construction_sets']['Insert'];
export type ScenarioInsert = Database['public']['Tables']['scenarios']['Insert'];
export type ScenarioConstructionInsert = Database['public']['Tables']['scenario_constructions']['Insert'];

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  total_simulations: number;
  author_id: string;
  created_at: string;
  updated_at: string;
  scenario_constructions?: ScenarioConstruction[];
}

export interface ScenarioConstruction {
  id: string;
  scenario_id: string;
  construction_id: string;
  element_type: string;
  construction?: {
    id: string;
    name: string;
    // other construction properties
  };
}

export type ScenarioInsert = Omit<Scenario, 'id' | 'created_at' | 'updated_at' | 'scenario_constructions'>;