export interface ComponentItem {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  existsInDatabase: boolean;
}

export interface ParsedData {
  materials: ComponentItem[];
  constructions: ComponentItem[];
  zones: ComponentItem[];
}

export interface SimulationResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  error?: string;
}