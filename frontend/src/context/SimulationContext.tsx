import { createContext, useContext, useState, ReactNode } from 'react';
import { authenticatedFetch } from '../lib/auth-api';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
const makeFriendlyName = (opts?: { separator?: string }) => {
  try {
    return uniqueNamesGenerator({ dictionaries: [adjectives, animals], separator: opts?.separator ?? '-', length: 2 });
  } catch (e) {
    // fallback simple generator
    const _adjectives = ['quick','bright','calm','brisk','bold','gentle','clever','silent','merry','quiet'];
    const _animals = ['fox','owl','hare','wolf','raven','otter','lynx','stoat'];
    return `${_adjectives[Math.floor(Math.random() * _adjectives.length)]}-${_animals[Math.floor(Math.random() * _animals.length)]}`;
  }
};
import type { ParsedData } from '../types/simulation';

interface SimulationContextType {
  uploadedFiles: File[];
  parsedData: ParsedData | null;
  setUploadedFiles: (files: File[]) => void;
  setParsedData: (data: ParsedData | null) => void;
  clearSimulationData: () => void;
  // new helper to update uploaded files (keeps API stable for components)
  updateUploadedFiles?: (files: File[]) => void;
  // cache of previously loaded simulation results (keyed by simulation id)
  cachedResults?: Record<string, any>;
  // load results from API or cache
  loadResults?: (simulationId: string) => Promise<any | null>;
  // last results shown in the UI (persisted across tabs/sessions)
  lastResults?: any[];
  cacheLastResults?: (results: any[]) => void;
  // session-scoped run history (newest first)
  history?: Array<{id: string, title?: string, pinned?: boolean, favorite?: boolean, ts: number}>;
  addToHistory?: (simulationId: string, title?: string) => void;
  clearHistory?: () => void;
  togglePin?: (simulationId: string) => void;
  toggleFavorite?: (simulationId: string) => void;
  updateHistoryTitle?: (simulationId: string, title: string) => void;
  removeHistoryEntry?: (simulationId: string) => void;
  baselineHistory?: Array<{id: string, title?: string, ts: number, kpis?: Record<string, any>, metadata?: Record<string, any>}>
  addToBaselineRun?: (simulationId: string, title?: string, metadata?: Record<string, any>) => void;
  updateBaselineRun?: (simulationId: string, patch: { kpis?: Record<string, any>, metadata?: Record<string, any> }) => void;
  removeBaselineRun?: (simulationId: string) => void;
}

const SimulationContext = createContext<SimulationContextType>({
  uploadedFiles: [],
  parsedData: null,
  setUploadedFiles: () => {},
  setParsedData: () => {},
  clearSimulationData: () => {},
});

export const useSimulation = () => useContext(SimulationContext);

interface SimulationProviderProps {
  children: ReactNode;
}

export const SimulationProvider = ({ children }: SimulationProviderProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [cachedResults, setCachedResults] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('simulation_cached_results');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });
  const [history, setHistory] = useState<Array<{id: string, title?: string, pinned?: boolean, favorite?: boolean, ts: number}>>(() => {
    try {
      const raw = localStorage.getItem('simulation_session_history');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [baselineHistory, setBaselineHistory] = useState<Array<{id: string, title?: string, ts: number, kpis?: Record<string, any>, metadata?: Record<string, any>}>>(() => {
    try {
      const raw = localStorage.getItem('baseline_recent_runs');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const clearSimulationData = () => {
    setUploadedFiles([]);
    setParsedData(null);
  };

  const [lastResults, setLastResults] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('simulation_last_results');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const cacheLastResults = (results: any[]) => {
    try {
      setLastResults(results || []);
      localStorage.setItem('simulation_last_results', JSON.stringify(results || []));
    } catch (e) {
      // ignore
    }
  };

  const updateUploadedFiles = (files: File[]) => {
    setUploadedFiles(files);
  };

  const persistCache = (next: Record<string, any>) => {
    try {
      localStorage.setItem('simulation_cached_results', JSON.stringify(next));
    } catch (e) {
      // ignore
    }
  };

  const persistHistory = (nextHistory: Array<{id: string, title?: string, pinned?: boolean, favorite?: boolean, ts: number}>) => {
    try {
      localStorage.setItem('simulation_session_history', JSON.stringify(nextHistory));
    } catch (e) {
      // ignore
    }
  };

  const persistBaselineHistory = (next: Array<{id: string, title?: string, ts: number, kpis?: Record<string, any>, metadata?: Record<string, any>}>) => {
    try {
      console.debug('persistBaselineHistory ->', next.map(n => ({id: n.id, ts: n.ts, title: n.title})));
      localStorage.setItem('baseline_recent_runs', JSON.stringify(next));
    } catch (e) {}
  };

  const addToBaselineRun = (simulationId: string, title?: string, metadata?: Record<string, any>) => {
    if (!simulationId) return;
    const now = Date.now();
    const generatedWord = makeFriendlyName();
    // include file base name if provided
    const fileBase = title ? String(title).replace(/\.[^/.]+$/, '') : null;
    const combinedTitle = fileBase ? `${fileBase}-${generatedWord}` : generatedWord;
    const entry = { id: simulationId, title: combinedTitle, ts: now, kpis: {}, metadata: { ...(metadata || {}), generatedWord, createdAt: new Date(now).toISOString() } };
    setBaselineHistory(prev => {
      const next = [entry, ...prev.filter(h => h.id !== simulationId)].slice(0, 20);
      try { persistBaselineHistory(next); console.debug('addToBaselineRun ->', entry, 'next length', next.length); } catch (e) {}
      return next;
    });
  };

  const updateBaselineRun = (simulationId: string, patch: { kpis?: Record<string, any>, metadata?: Record<string, any> }) => {
    setBaselineHistory(prev => {
      const next = prev.map(h => h.id === simulationId ? { ...h, kpis: { ...(h.kpis || {}), ...(patch.kpis || {}) }, metadata: { ...(h.metadata || {}), ...(patch.metadata || {}) } } : h);
      try { persistBaselineHistory(next); console.debug('updateBaselineRun ->', simulationId, patch, 'result length', next.length); } catch (e) {}
      return next;
    });
  };

  const removeBaselineRun = (simulationId: string) => {
    setBaselineHistory(prev => {
      const next = prev.filter(h => h.id !== simulationId);
      try { persistBaselineHistory(next); console.debug('removeBaselineRun ->', simulationId, 'remaining', next.length); } catch (e) {}
      return next;
    });
  };

  const addToHistory = (simulationId: string, title?: string) => {
    if (!simulationId) return;
  // generate a friendly title if not provided
  const fallback = title || makeFriendlyName();
  const entry = { id: simulationId, title: fallback, pinned: false, favorite: false, ts: Date.now() };
    // Prepend so newest are first, but preserve pinned items at front
    const next = [entry, ...history.filter(h => h.id !== simulationId)];
    setHistory(next);
    persistHistory(next);
  };

  const togglePin = (simulationId: string) => {
    const next = history.map(h => h.id === simulationId ? { ...h, pinned: !h.pinned } : h);
    // move pinned items to front
    next.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    setHistory(next);
    persistHistory(next);
  };

  const toggleFavorite = (simulationId: string) => {
    const next = history.map(h => h.id === simulationId ? { ...h, favorite: !h.favorite } : h);
    setHistory(next);
    persistHistory(next);
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem('simulation_session_history'); } catch (e) {}
  };

  const updateHistoryTitle = (simulationId: string, title: string) => {
    const next = history.map(h => h.id === simulationId ? { ...h, title } : h);
    setHistory(next);
    persistHistory(next);
  };

  const removeHistoryEntry = (simulationId: string) => {
    const next = history.filter(h => h.id !== simulationId);
    setHistory(next);
    persistHistory(next);
  };

  const loadResults = async (simulationId: string) => {
    if (!simulationId) return null;
    // Return cached if present
    if (cachedResults[simulationId]) return cachedResults[simulationId];

    try {
      const res = await authenticatedFetch(`/api/simulation/${simulationId}/results/`);
      if (!res || !res.ok) return null;
      const data = await res.json();
      // normalize KPI keys for consistency across the UI
      const normalize = (item: any) => {
        if (!item || typeof item !== 'object') return item;
        const asNumber = (v: any) => {
          if (typeof v === 'number' && Number.isFinite(v)) return v;
          if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
          return undefined;
        };
        const pick = (obj: any, candidates: string[]) => {
          for (const k of candidates) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
              const n = asNumber(obj[k]);
              if (typeof n === 'number') return n;
            }
          }
          return undefined;
        };

        const total = pick(item, ['totalEnergy','total_energy','totalEnergyUse','totalEnergyUse_kwh','totalSiteEnergy','total_site_energy','total_energy_kwh','energy','total','totalEnergy_kwh']);
        const heating = pick(item, ['heating','heatingDemand','heating_demand','heating_kwh']);
        const cooling = pick(item, ['cooling','coolingDemand','cooling_demand','cooling_kwh']);
        const runTime = pick(item, ['runTime','run_time','elapsedSeconds','elapsed_seconds','elapsed']);

        return { ...item, totalEnergy: total ?? item.totalEnergy ?? item.totalEnergyUse ?? 0, heating: heating ?? item.heating ?? item.heatingDemand ?? 0, cooling: cooling ?? item.cooling ?? item.coolingDemand ?? 0, runTime: runTime ?? item.runTime ?? 0 };
      };

      const normalizeData = (d: any) => {
        if (Array.isArray(d)) return d.map(normalize);
        return normalize(d);
      };

      const normalized = normalizeData(data);
      const next = { ...cachedResults, [simulationId]: data };
      setCachedResults({ ...cachedResults, [simulationId]: normalized });
      persistCache(next);
      return normalized;
    } catch (e) {
      return null;
    }
  };

  return (
    <SimulationContext.Provider 
      value={{
        uploadedFiles,
        parsedData,
        setUploadedFiles,
        setParsedData,
        clearSimulationData,
        updateUploadedFiles,
        cachedResults,
        loadResults,
        history,
    lastResults,
    cacheLastResults,
        addToHistory,
        clearHistory,
        togglePin,
        toggleFavorite,
        updateHistoryTitle,
        removeHistoryEntry,
        baselineHistory,
        addToBaselineRun,
        updateBaselineRun,
        removeBaselineRun,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};