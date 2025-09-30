import { create } from 'zustand';

export type SelectionLevel = 'user' | 'scenario' | 'run' | 'idf' | 'variant';

export interface SelectionState {
  userId?: string;
  scenarioId?: string;
  runId?: string;
  idfId?: string;
  variantId?: string;
  set: (level: SelectionLevel, id?: string) => void;
  clearBelow: (level: SelectionLevel) => void;
  reset: () => void;
}

const levels: SelectionLevel[] = ['user', 'scenario', 'run', 'idf', 'variant'];

export const useSelectionStore = create<SelectionState>((set, get) => ({
  set: (level, id) => {
    const updates: Partial<SelectionState> = { [`${level}Id`]: id } as any;
    const idx = levels.indexOf(level);
    for (let i = idx + 1; i < levels.length; i++) {
      updates[`${levels[i]}Id` as keyof SelectionState] = undefined;
    }
    set(updates as SelectionState);
  },
  clearBelow: (level) => {
    const updates: Partial<SelectionState> = {};
    const idx = levels.indexOf(level);
    for (let i = idx + 1; i < levels.length; i++) {
      updates[`${levels[i]}Id` as keyof SelectionState] = undefined;
    }
    set(updates as SelectionState);
  },
  reset: () => set({ userId: undefined, scenarioId: undefined, runId: undefined, idfId: undefined, variantId: undefined }),
}));
