import { Database as DatabaseGenerated } from './database.generated.types';

export type Database = DatabaseGenerated;

export type Material = Database['public']['Tables']['materials']['Row'];
export type WindowGlazing = Database['public']['Tables']['window_glazing']['Row'];
export type Construction = Database['public']['Tables']['constructions']['Row'];
export type Layer = Database['public']['Tables']['layers']['Row'];
export type ConstructionSet = Database['public']['Tables']['construction_sets']['Row'];

export type MaterialInsert = Database['public']['Tables']['materials']['Insert'];
export type WindowGlazingInsert = Database['public']['Tables']['window_glazing']['Insert'];
export type ConstructionInsert = Database['public']['Tables']['constructions']['Insert'];
export type LayerInsert = Database['public']['Tables']['layers']['Insert'];
export type ConstructionSetInsert = Database['public']['Tables']['construction_sets']['Insert'];