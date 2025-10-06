export interface ComponentItem {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  existsInDatabase: boolean;
}

export interface ElementQuantities {
  wall_area: number;
  roof_area: number;
  floor_area: number;
  window_area: number;
}

export interface ParsedData {
  materials: ComponentItem[];
  constructions: ComponentItem[];
  zones: ComponentItem[];
  element_quantities?: ElementQuantities;
}

export interface SimulationResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  error?: string;
}