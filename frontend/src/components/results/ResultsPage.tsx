// frontend/src/components/results/ResultsPage.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TableContainer,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  TextField,
  Autocomplete,
} from '@mui/material';
import { 
  
  Download, 
  FileText, 
  Info, 
  Maximize2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Scatter
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useDatabase } from '../../context/DatabaseContext';
import { useSimulation } from '../../context/SimulationContext';

const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  // DataGrid / server-driven state
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<any>({ page: 0, pageSize: 100 });
  const [sortModel, setSortModel] = useState<any>([{ field: 'energy', sort: 'asc' }]);
  // quickFilter removed — server toolbar quick filter is used directly
  const [facet, setFacet] = useState<{scenario?: string; energy?: [number, number]; cost?: [number, number]; gwp?: [number, number]; weather?: string; selectedIds?: string[]; dateFrom?: string; dateTo?: string; userEmails?: string[]}>({});
  const [loading, setLoading] = useState(true);
  const [gridLoading, setGridLoading] = useState(false);
  // error state intentionally omitted for now
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState<any>(null);
  // cascading selection state: run -> weather -> idf
  const [selectedRun, setSelectedRun] = useState<any>(null);
  // selectedWeather state removed (not needed)
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedIdf, setSelectedIdf] = useState<any>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const { scenarios } = useDatabase();
  const { cachedResults, lastResults, loadResults, addToBaselineRun, history: runHistory } = useSimulation();
  // (helper removed) UUID extraction not currently used
  // confirmation dialog and snack state were removed (not used here)
  // search and scenario dropdown removed — filtering is driven by facet (e.g., facet.weather)
  const [detailsOpen, setDetailsOpen] = useState(false);

  // metric selection placeholder omitted

  // Extracted fetch so we can re-use it when scenarios change elsewhere
  // primary fetching is implemented in useEffect below; previous helper removed

  // derive a stable weather key from many possible payload locations
  const deriveWeatherKey = (r: any) => {
    if (!r) return 'unknown';
    // prefer explicit _weatherKey if already normalized
    const direct = r?._weatherKey || r?.weather_file || r?.epw || r?.weather;
    if (direct) return String(direct);
    // check nested outputs or other nested containers
    if (r.outputs) return String(r.outputs.weather_file || r.outputs.epw || 'unknown');
    if (r.result && (r.result.weather_file || r.result.epw)) return String(r.result.weather_file || r.result.epw);
    return 'unknown';
  };

  // normalize user info from multiple possible payload shapes
  const deriveUser = (obj: any) => {
    if (!obj) return { userId: null, userEmail: null, userName: 'Unknown' };
    const userId = obj?.user_id || obj?.userId || obj?.user?.id || obj?.owner || obj?.created_by || obj?.initiator || obj?.username || null;
    const userEmail = obj?.user_email || obj?.email || obj?.user?.email || obj?.userEmail || null;
    // choose a display name in this order: explicit user name fields, username, email local-part, id
    const explicitName = obj?.user_name || obj?.display_name || obj?.user?.name || obj?.user?.displayName || obj?.user?.username;
    let userName = explicitName || obj?.username || (userEmail ? String(userEmail).split('@')[0] : null) || (userId ? String(userId) : null) || 'Unknown';
    userName = String(userName);
    return { userId: userId ? String(userId) : null, userEmail: userEmail ? String(userEmail) : null, userName };
  };

  // deterministic color from string (simple hash)
  // generate a pleasant pastel HSL color from a string so avatars are not black
  const stringToColor = (str: string) => {
    if (!str) return 'hsl(210, 10%, 75%)';
    // simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      // eslint-disable-next-line no-bitwise
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      // keep in 32-bit
      // eslint-disable-next-line no-bitwise
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360; // 0..359
    const saturation = 55; // percent
    const lightness = 55; // percent — pastel-ish
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const UserAvatar: React.FC<{ name?: string; size?: number }> = ({ name = 'Unknown', size = 32 }) => {
    const display = (name || 'Unknown').trim();
    const isUnknown = !display || display === 'Unknown' || display === '-';
    const initial = isUnknown ? '?' : display[0].toUpperCase();
    const bg = isUnknown ? '#bdbdbd' : stringToColor(display);
    return <Avatar sx={{ bgcolor: bg, width: size, height: size, fontSize: Math.round(size / 2) }}>{initial}</Avatar>;
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
  // Fetch results from your backend
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000';
  const response = await fetch(`${API_BASE.replace(/\/$/, '')}/api/simulation/results/`);
        if (!response.ok) {
          // If API not available, fall back to locally cached results from SimulationContext
          if (response.status === 404) {
            console.warn('Results endpoint not found; falling back to local cache');
          } else {
            console.warn('Results endpoint returned error', response.status);
          }
          const fallback: any[] = [];
          if (Array.isArray(lastResults) && lastResults.length > 0) fallback.push(...lastResults);
          // cachedResults is a map of id -> normalized result; flatten any arrays/objects
          if (cachedResults) {
            Object.values(cachedResults).forEach(v => {
              if (Array.isArray(v)) fallback.push(...v);
              else if (v) fallback.push(v);
            });
          }
          // keep unique by id
          const uniq = new Map<string, any>();
          fallback.forEach(item => {
            const id = String(item?.id || item?.simulation_id || item?.run_id || Math.random());
            if (!uniq.has(id)) uniq.set(id, item);
          });
          const deduped = Array.from(uniq.values()).map((it: any) => {
            const nid = String(it?.id || it?.simulation_id || it?.simulationId || it?.run_id || it?.runId || it?.originalFileName || Math.random());
            return ({ ...it, _weatherKey: deriveWeatherKey(it), id: nid, simulation_id: it?.simulation_id || it?.simulationId });
          });
          setResults(deduped);
          return;
        }

  const data = await response.json();
  // normalize server response: accept either an array or a paginated object { items, total }
  const items = Array.isArray(data) ? data : (data?.items || []);
  console.debug('[ResultsPage] fetched results count:', items.length, 'rawType=', typeof data, 'hasItems=', !!data?.items);
  // attach a consistent _weatherKey, id and simulation_id to each item for client-side filtering
  const withWeather = items.map((it: any) => {
    const nid = String(it?.id || it?.simulation_id || it?.simulationId || it?.run_id || it?.runId || it?.originalFileName || Math.random());
    const user = deriveUser(it);
    return ({ ...it, _weatherKey: deriveWeatherKey(it), id: nid, simulation_id: it?.simulation_id || it?.simulationId, user_id: user.userId, user_email: user.userEmail, user_name: user.userName });
  });
  console.debug('[ResultsPage] sample users from response:', withWeather.slice(0,3).map((it:any) => ({ id: it.id, user_name: it.user_name, user_email: it.user_email })));
  setResults(withWeather);
      } catch (err) {
        console.warn('Failed to fetch simulation results; falling back to local cache', err);
        const fallback: any[] = [];
        if (Array.isArray(lastResults) && lastResults.length > 0) fallback.push(...lastResults);
        if (cachedResults) {
          Object.values(cachedResults).forEach(v => {
            if (Array.isArray(v)) fallback.push(...v);
            else if (v) fallback.push(v);
          });
        }
        const uniq = new Map<string, any>();
        fallback.forEach(item => {
          const id = String(item?.id || item?.simulation_id || item?.run_id || Math.random());
          if (!uniq.has(id)) uniq.set(id, item);
        });
          const deduped = Array.from(uniq.values()).map((it: any) => {
            const nid = String(it?.id || it?.simulation_id || it?.simulationId || it?.run_id || it?.runId || it?.originalFileName || Math.random());
            const user = deriveUser(it);
            return ({ ...it, _weatherKey: deriveWeatherKey(it), id: nid, simulation_id: it?.simulation_id || it?.simulationId, user_id: user.userId, user_email: user.userEmail, user_name: user.userName });
          });
        setResults(deduped);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Derived filtered list
  const filteredResults = results.filter(r => {
    // If a weather facet is active, only include rows matching that weather key
    if (facet?.weather) {
      const weatherKey = String(deriveWeatherKey(r || {})).toLowerCase();
      if (weatherKey.indexOf(String(facet.weather).toLowerCase()) === -1) return false;
    }
    // If specific selectedIds are provided, only include those rows
    if (Array.isArray(facet?.selectedIds) && facet.selectedIds.length > 0) {
      const rid = String(r.id || r.simulation_id || r.run_id || '');
      if (!facet.selectedIds.includes(rid)) return false;
    }
    // Date filtering: created_at, ts or createdAt
    if (facet?.dateFrom || facet?.dateTo) {
      const created = r?.created_at || r?.createdAt || r?.ts || r?.timestamp || r?.created || null;
      if (!created) return false;
      const t = new Date(created);
      if (facet?.dateFrom) {
        const from = new Date(facet.dateFrom);
        // include entire day
        from.setHours(0,0,0,0);
        if (t < from) return false;
      }
      if (facet?.dateTo) {
        const to = new Date(facet.dateTo);
        to.setHours(23,59,59,999);
        if (t > to) return false;
      }
    }
    // User filtering: facet.userEmails is an array of selected user identifiers (email or id or name)
    if (Array.isArray(facet?.userEmails) && facet.userEmails.length > 0) {
      const du = deriveUser(r || {});
      const keyCandidates = [du.userEmail, du.userId, du.userName].filter(Boolean).map(String);
      const matched = facet.userEmails.some((sel: string) => keyCandidates.includes(String(sel)));
      if (!matched) return false;
    }
    // No global search or scenario dropdown — return all remaining rows
    return true;
  });

  // server-driven fetch for grid
  const fetchGrid = useCallback(async () => {
    setGridLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        page_size: String(paginationModel.pageSize),
        sort: sortModel[0]?.field || 'energy',
        dir: sortModel[0]?.sort || 'asc',
        q: '',
        scenario: facet.scenario || '',
        weather: facet.weather || '',
        energy_min: String(facet.energy?.[0] ?? ''),
        energy_max: String(facet.energy?.[1] ?? ''),
        cost_min: String(facet.cost?.[0] ?? ''),
        cost_max: String(facet.cost?.[1] ?? ''),
        gwp_min: String(facet.gwp?.[0] ?? ''),
        gwp_max: String(facet.gwp?.[1] ?? ''),
      });
      console.debug('[ResultsPage] fetchGrid params:', params.toString(), 'results.length=', results.length);
  const API_BASE = (import.meta.env?.VITE_API_BASE_URL) || 'http://localhost:8000';
  const url = `${API_BASE.replace(/\/$/, '')}/api/simulation/results/?${params.toString()}`;
  console.debug('[ResultsPage] fetchGrid url=', url);
  const res = await fetch(url);
      if (!res.ok) {
        // fallback to local results if backend missing
        const slice = filteredResults.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize);
        console.debug('[ResultsPage] backend missing — using fallback slice length=', slice.length, 'total filtered=', filteredResults.length);
        setRows(slice);
        setRowCount(filteredResults.length);
        setUsingFallback(true);
        return;
      }
      const json = await res.json();
      // The backend may return either a paginated object { items, total } or a raw array of items.
      let serverItems: any[] = [];
      let serverTotal: number | undefined = undefined;
      if (Array.isArray(json)) {
        serverItems = json;
        serverTotal = json.length;
      } else {
        serverItems = json.items || [];
        serverTotal = json.total ?? (Array.isArray(json.items) ? json.items.length : undefined);
      }
      console.debug('[ResultsPage] server returned items=', serverItems.length, 'total=', serverTotal);
      // normalize server items so DataGrid valueGetters find expected fields
      let effectiveServerItems = serverItems;
      // If the client explicitly selected IDs (variants) prefer to only show those rows
      if (Array.isArray(facet?.selectedIds) && facet.selectedIds.length > 0) {
        const selectedSet = new Set(facet.selectedIds.map(String));
        effectiveServerItems = serverItems.filter((it: any) => selectedSet.has(String(it?.id || it?.simulation_id || it?.run_id || it?.originalFileName)));
      }

      const normalizedServerItems = effectiveServerItems.map((it: any) => normalizeRow({
        ...it,
        // map common snake_case names to expected client names
        fileName: it.file_name || it.fileName || it.originalFileName,
        energyUse: it.total_energy_use ?? it.totalEnergy ?? it.totalEnergyUse ?? it.energy ?? it.total_energy,
        totalEnergy: it.total_energy_use ?? it.totalEnergy ?? it.totalEnergyUse ?? it.energy ?? it.total_energy,
        runTime: it.run_time ?? it.runTime ?? it.runtime ?? it.elapsed ?? it.duration,
        variant_idx: it.variant_idx ?? it.variant ?? it.variantIdx,
        variant: it.variant_idx ?? it.variant ?? it.variantIdx,
        gwp: it.gwp ?? it.gwp_total ?? it.gwp_kg_co2_e,
        cost: it.cost ?? it.total_cost ?? it.annual_cost,
        simulation_name: it.simulation_name || it.name,
        // preserve explicit backend fields used by columns
        created_at: it.created_at ?? it.createdAt ?? it.ts ?? it.timestamp,
        _weatherKey: it._weatherKey ?? it.weather_file ?? it.epw ?? it.weather
      }));
  setRows(normalizedServerItems);
  console.debug('[ResultsPage] normalizedServerItems sample:', normalizedServerItems.slice(0,5).map((it:any)=>({ id: it.id, energyUse: it.energyUse, totalEnergy: it.totalEnergy, keys: Object.keys(it).slice(0,10) })));
  // If serverTotal is provided use it, but don't show an inflated total if the returned items array is smaller
  // (some backends return a full-count but we requested a filtered subset). Prefer the smaller of the two
  // when serverTotal seems larger than the actual items available to display.
      let inferredTotal: number;
      if (Array.isArray(facet?.selectedIds) && facet.selectedIds.length > 0) {
        inferredTotal = facet.selectedIds.length;
      } else {
        inferredTotal = (typeof serverTotal === 'number') ? Math.min(serverTotal, normalizedServerItems.length || serverTotal) : (normalizedServerItems ? normalizedServerItems.length : 0);
      }
      setRowCount(inferredTotal);
  setUsingFallback(!(serverItems && serverItems.length > 0));
    } catch (e) {
      const slice2 = filteredResults.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize);
      console.debug('[ResultsPage] fetchGrid error — using fallback slice length=', slice2.length, e);
      setRows(slice2);
      setRowCount(filteredResults.length);
      setUsingFallback(true);
    } finally {
      setGridLoading(false);
    }
  }, [paginationModel, sortModel, facet, results, showAllResults]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  // If server-driven `rows` is empty, fall back to client-side `filteredResults` page slice
  const normalizeRow = (r: any) => {
    // ensure stable id field (DataGrid expects `id` or we supply getRowId)
    const id = r?.id || r?.simulationId || r?.simulation_id || r?.run_id || r?.runId || (r?.simulation_id ? String(r.simulation_id) : undefined) || undefined;

    // Normalize common alternate names and search nested structures for metrics
    const fileName = r?.fileName || r?.file_name || r?.originalFileName || r?.file || r?.name;
    const simName = r?.name || r?.simulation_name || r?.simulationName;
    const buildingName = r?.scenario_name || r?.scenario || r?.scenario_id || r?.building || r?.building_name;

    const getNested = (obj: any, keys: string[]) => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
      }
      // check common nested containers
      const nests = ['metrics', 'results', 'outputs', 'summary', 'totals', 'data'];
      for (const n of nests) {
        const sub = obj[n];
        if (sub && typeof sub === 'object') {
          for (const k of keys) {
            if (sub[k] !== undefined && sub[k] !== null) return sub[k];
          }
          // sometimes metrics are nested under summary inside metrics
          if (sub.summary && typeof sub.summary === 'object') {
            for (const k of keys) {
              if (sub.summary[k] !== undefined && sub.summary[k] !== null) return sub.summary[k];
            }
          }
        }
      }
      return undefined;
    };

  // energy use: check common fields, then energy_use object, then nested places
  let energyUse: number | undefined = r?.energyUse ?? r?.totalEnergy ?? r?.totalEnergyUse ?? r?.total_energy_use ?? r?.total_energy ?? r?.energy ?? r?.energy_kwh;
    if (energyUse === undefined && typeof r?.energy_use === 'object') {
      try {
        energyUse = Object.values(r.energy_use).reduce((acc: number, v: any) => acc + (v?.total ?? 0), 0);
      } catch (e) {
        energyUse = undefined;
      }
    }
    if (energyUse === undefined) energyUse = getNested(r, ['energy', 'totalEnergy', 'total_energy', 'total_energy_use', 'energy_use', 'annual_energy', 'annual_kwh']);

    // coerce numeric-like fields to numbers where possible
    const toNum = (v: any) => {
      if (v === undefined || v === null || v === '') return undefined;
      if (typeof v === 'number') return v;
      const n = Number(String(v).replace(/[^0-9.+-eE]/g, ''));
      return Number.isFinite(n) ? n : undefined;
    };

  // commonly available demand/area/runtime fields on our backend
  const heatingDemandRaw = r?.heating_demand ?? r?.heatingDemand ?? getNested(r, ['heating_demand', 'heatingDemand', 'heating']);
  const coolingDemandRaw = r?.cooling_demand ?? r?.coolingDemand ?? getNested(r, ['cooling_demand', 'coolingDemand', 'cooling']);
  const totalAreaRaw = r?.total_area ?? r?.totalArea ?? getNested(r, ['total_area', 'totalArea', 'area', 'floor_area']);
  const createdAt = r?.created_at ?? r?.createdAt ?? r?.ts ?? r?.timestamp ?? getNested(r, ['created_at', 'createdAt', 'ts', 'timestamp']);

  const scenario = buildingName || fileName || simName || '';
    // cost/gwp/runtime normalization
    const cost = r?.cost ?? r?.total_cost ?? r?.cost_total ?? r?.cost_per_m2 ?? r?.annual_cost ?? getNested(r, ['cost', 'total_cost', 'cost_total', 'annual_cost']);
    const gwp = r?.gwp ?? r?.gwp_total ?? r?.gwp_per_m2 ?? r?.gwp_kg_co2_e ?? getNested(r, ['gwp', 'gwp_total', 'embodied_carbon', 'co2e']);
    const runTime = r?.runTime ?? r?.runtime ?? r?.elapsed ?? r?.duration ?? r?.run_time ?? r?.execution_time ?? getNested(r, ['runTime', 'runtime', 'elapsed', 'duration', 'execution_time']);

    return {
      ...r,
      id: id || String(r?.simulationId || r?.simulation_id || r?.originalFileName || Math.random()),
      simulation_id: r?.simulationId || r?.simulation_id,
      created_at: createdAt,
      heatingDemand: toNum(heatingDemandRaw),
      coolingDemand: toNum(coolingDemandRaw),
      totalArea: toNum(totalAreaRaw),
      energyUse: toNum(energyUse),
      totalEnergy: toNum(r?.totalEnergy ?? r?.totalEnergyUse ?? energyUse),
      scenario,
      name: simName || fileName || r?.building || r?.simulationId,
      cost,
      gwp,
      runTime
    };
  };

  // Prefer server-provided normalized `rows` when available. Fall back to client-side `filteredResults` page slice.
  const rawPage = (rows && rows.length > 0)
    ? rows
    : (Array.isArray(facet?.selectedIds) && facet.selectedIds.length > 0
      ? filteredResults.slice((paginationModel.page || 0) * (paginationModel.pageSize || 100), ((paginationModel.page || 0) + 1) * (paginationModel.pageSize || 100))
      : filteredResults.slice((paginationModel.page || 0) * (paginationModel.pageSize || 100), ((paginationModel.page || 0) + 1) * (paginationModel.pageSize || 100)));
  const mapped = rawPage.map(normalizeRow);
  // dedupe by id to avoid duplicate React keys
  const seenIds = new Set<string>();
  const deduped: any[] = [];
  mapped.forEach((r: any) => {
    const key = String(r?.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      deduped.push(r);
    }
  });
  if (mapped.length !== deduped.length) console.debug('[ResultsPage] removed duplicate rows', mapped.length, '->', deduped.length);
  const displayRows = deduped;
  console.debug('[ResultsPage] displayRows sample:', displayRows.slice(0,5).map((r:any)=>({ id: r.id, energyUse: r.energyUse, totalEnergy: r.totalEnergy, total_energy: r.total_energy, raw: Object.keys(r).slice(0,10) })));

  // ECharts options for Energy vs Runtime
  const echartsEnergyData = rows.map(r => ({ name: r.name || r.id, value: [r.energyUse ?? r.totalEnergy ?? 0, r.runTime ?? r.runtime ?? r.elapsed ?? 0, r.id] }));
  const energyOpts = {
    grid: { left: 48, right: 16, top: 16, bottom: 36 },
    tooltip: { trigger: 'item', formatter: (p:any) => `${p.data.name}<br/>E: ${p.data.value[0]}<br/>t: ${p.data.value[1]}s` },
    xAxis: { name: 'Energy (kWh/m²)' },
    yAxis: { name: 'Runtime (s)' },
    brush: { toolbox: ['rect', 'polygon', 'clear'], throttleType: 'debounce', throttleDelay: 100 },
    series: [{
      type: 'scatter', symbolSize: 4, large: true, progressive: 4000,
      data: echartsEnergyData
    }]
  };

  const onChartReady = (chart: any) => {
    try {
      chart.on('brushSelected', (e: any) => {
        const batch = e.batch?.[0];
        const indices: number[] = (batch?.selected || []).flatMap((s: any) => s.dataIndex || []);
        const selectedIds = indices.map(i => rows[i]?.id || rows[i]?.simulation_id || rows[i]?.run_id).filter(Boolean);
        if (selectedIds.length) {
          // apply a quick filter to the grid by setting facet to include selected ids (client-side)
          setFacet(prev => ({ ...prev, selectedIds } as any));
        }
      });
    } catch (e) {}
  };

  const openDetails = async (row: any) => {
    // normalize the row so key metrics (energyUse, totalEnergy, etc.) are available
    try {
      setSelectedResult(normalizeRow(row));
    } catch (e) {
      setSelectedResult(row);
    }
    setDetailsOpen(true);
    if (typeof loadResults === 'function') {
      const id = row.simulation_id || row.id || row.run_id;
      try {
        const detail = await loadResults(String(id));
        try { setSelectedResultDetail(detail ? normalizeRow(detail) : normalizeRow(row)); } catch (e) { setSelectedResultDetail(detail || row); }
      } catch (e) {
        try { setSelectedResultDetail(normalizeRow(row)); } catch (err) { setSelectedResultDetail(row); }
      }
    } else {
      try { setSelectedResultDetail(normalizeRow(row)); } catch (e) { setSelectedResultDetail(row); }
    }
  };

  const downloadRow = (row: any) => {
    const blob = new Blob([JSON.stringify(row, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${row.id || row.simulation_id || 'result'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const addToBaseline = (row: any) => {
    const id = String(row.simulation_id || row.id || row.run_id || '');
    if (id && typeof addToBaselineRun === 'function') addToBaselineRun(id, row.name || row.fileName || id, { source: 'resultsPage' });
  };

  const cols: any[] = [
  { field: 'user', headerName: 'User', width: 190, sortable: false, renderCell: (params: any) => {
    const info = deriveUser(params?.row || {});
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <UserAvatar name={info.userName} size={28} />
        <Typography variant="body2">{info.userName}</Typography>
      </Stack>
    );
  } },
  { field: 'scenario', headerName: 'Scenario', flex: 1, minWidth: 160, valueGetter: (params: any) => params?.row ? (params.row.scenario_name || params.row.scenario || params.row.scenario_id) : undefined },
  { field: 'energy', headerName: 'Energy (kWh/m²)', type: 'number', width: 160,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.energyUse ?? params.row.totalEnergy ?? getMetric(params.row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']);
      return <Typography variant="body2">{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'heating', headerName: 'Heating (kWh/m²)', type: 'number', width: 150,
    valueGetter: (params: any) => params?.row ? (params.row.heatingDemand ?? params.row.heating_demand ?? getMetric(params.row, ['heating_demand','heatingDemand','heating'])) : undefined,
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['heating_demand','heatingDemand','heating']);
      return <Typography variant="body2">{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'cooling', headerName: 'Cooling (kWh/m²)', type: 'number', width: 150,
    valueGetter: (params: any) => params?.row ? (params.row.coolingDemand ?? params.row.cooling_demand ?? getMetric(params.row, ['cooling_demand','coolingDemand','cooling'])) : undefined,
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['cooling_demand','coolingDemand','cooling']);
      return <Typography variant="body2">{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'cost', headerName: 'Cost (SEK/m²)', type: 'number', width: 150, valueGetter: (params: any) => params?.row ? params.row.cost : undefined },
  { field: 'gwp', headerName: 'GWP (kgCO₂e/m²)', type: 'number', width: 170, valueGetter: (params: any) => params?.row ? params.row.gwp : undefined },
  { field: 'variant', headerName: 'Variant', width: 110, valueGetter: (params: any) => params?.row ? (params.row.variant_idx ?? params.row.variant) : undefined },
  { field: 'area', headerName: 'Area (m²)', type: 'number', width: 130,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.totalArea ?? params.row.total_area ?? params.row.total_area_m2 ?? getMetric(params.row, ['total_area','totalArea','area','floor_area']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['total_area','totalArea','area','floor_area']);
      return <Typography variant="body2">{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'weather', headerName: 'Weather', flex: 1, minWidth: 160,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.weather_file || params.row.epw || params.row.weather || params.row._weatherKey || (params.row.outputs && (params.row.outputs.weather_file || params.row.outputs.epw)) || undefined;
    },
    renderCell: (params: any) => <Typography variant="body2">{params?.value ?? '-'}</Typography>
  },
  { field: 'runtime', headerName: 'Run Time (s)', type: 'number', width: 130,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.runTime ?? params.row.run_time ?? getMetric(params.row, ['run_time','runTime','runtime','elapsed','duration','execution_time']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['run_time','runTime','runtime','elapsed','duration','execution_time']);
      return <Typography variant="body2">{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'created_at', headerName: 'Created', width: 170, type: 'dateTime',
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      const raw = params.row.created_at ?? params.row.createdAt ?? params.row.ts ?? params.row.timestamp ?? getMetric(params.row, ['created_at','createdAt','ts','timestamp']);
      const t = raw ? (typeof raw === 'number' ? raw : Date.parse(String(raw))) : undefined;
      return Number.isFinite(t) ? t : undefined;
    },
    renderCell: (params: any) => {
      const v = params?.value;
      return <Typography variant="body2">{v ? new Date(v).toLocaleString() : '-'}</Typography>;
    }
  },
    {
      field: 'actions', headerName: 'Actions', width: 140, sortable: false,
      renderCell: (params: any) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="View Details"><IconButton size="small" onClick={() => openDetails(params?.row)}><Info size={18} /></IconButton></Tooltip>
          <Tooltip title="Download"><IconButton size="small" onClick={() => downloadRow(params?.row)}><Download size={18} /></IconButton></Tooltip>
          <Tooltip title="Set Baseline"><IconButton size="small" onClick={() => addToBaseline(params?.row)}><FileText size={18} /></IconButton></Tooltip>
        </Stack>
      )
    },
    // small KPI column to ensure status helpers are used
    {
      field: 'kpi', headerName: 'KPI', width: 120, sortable: false,
  valueGetter: (p: any) => p?.row ? (p.row.energyUse ?? p.row.totalEnergy) : undefined,
      renderCell: (p: any) => {
        const v = p?.value ?? 0;
        const icon = getStatusIcon(v, 100);
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            {icon}
            <Chip size="small" label={v} color={getStatusColor(v, 'energy') as any} />
          </Stack>
        );
      }
    }
  ];

  const getStatusColor = (value: number, type: 'energy' | 'cost' | 'gwp') => {
    const thresholds = {
      energy: { low: 100, high: 150 },
      cost: { low: 500, high: 1000 },
      gwp: { low: 20, high: 40 }
    };

    const threshold = thresholds[type];
    if (value <= threshold.low) return 'success';
    if (value >= threshold.high) return 'error';
    return 'warning';
  };

  const getStatusIcon = (value: number, baseline: number) => {
    const percentChange = ((value - baseline) / baseline) * 100;
    if (percentChange <= -5) return <TrendingDown color="green" size={16} />;
    if (percentChange >= 5) return <TrendingUp color="red" size={16} />;
    return <Minus size={16} />;
  };

  // defensive metric resolver: check many possible keys and coerce to number
  const getMetric = (row: any, keys: string[]) => {
    if (!row) return undefined;
    for (const k of keys) {
      const v = row[k];
      if (v !== undefined && v !== null && v !== '') {
        const n = Number(String(v).replace(/[^0-9.+-eE]/g, ''));
        if (Number.isFinite(n)) return n;
      }
    }
    // also check nested 'metrics' or 'results' containers
    const nests = ['metrics','results','summary','outputs','data','totals'];
    for (const n of nests) {
      const sub = row[n];
      if (sub && typeof sub === 'object') {
        for (const k of keys) {
          const v = sub[k];
          if (v !== undefined && v !== null && v !== '') {
            const n2 = Number(String(v).replace(/[^0-9.+-eE]/g, ''));
            if (Number.isFinite(n2)) return n2;
          }
        }
      }
    }
    return undefined;
  };

  // only show global loading when initial results are being fetched and there are no results yet
  if (loading && (!results || results.length === 0)) return <Box sx={{ mt: 4 }}>Loading…</Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Simulation Results</Typography>
      <Grid container spacing={3} sx={{ alignItems: 'stretch' }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, display: 'flex', flexDirection: 'column', maxHeight: '60vh' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Run History</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <Autocomplete
                multiple
                options={Array.from(new Set(results.map((r:any) => deriveUser(r).userEmail).filter(Boolean)))}
                value={facet.userEmails || []}
                onChange={(e, v) => { if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault(); setFacet(prev => ({ ...prev, userEmails: v } as any)); }}
                renderInput={(params) => <TextField {...params} label="Users" size="small" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />}
                sx={{ minWidth: 220 }}
              />
              <TextField
                label="Date from"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                onChange={(e) => setFacet(prev => ({ ...prev, dateFrom: e.target.value } as any))}
              />
              <TextField
                label="Date to"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={facet.dateTo || ''}
                onChange={(e) => setFacet(prev => ({ ...prev, dateTo: e.target.value } as any))}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              />
              <Button size="small" onClick={() => setFacet(prev => ({ ...prev, userEmails: [], dateFrom: undefined, dateTo: undefined, selectedIds: [] } as any))}>Clear filters</Button>
            </Stack>
            <Stack spacing={1} sx={{ mt: 1, flex: 1, overflowY: 'auto',
              // scrollbar styling
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': { width: 10, height: 10 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 8 },
              '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
            }}>
              {(() => { console.debug('[ResultsPage] runHistory sample:', (runHistory || []).slice(0,5).map((hh:any)=>({ id: hh.id, user: hh.user, created_by: hh.created_by, username: hh.username, initiator: hh.initiator }))); return null; })()}
              {(() => {
                // apply simple runHistory filtering based on the active facet (userEmails, dateFrom, dateTo)
                const filteredRunHistory = (runHistory || []).filter((h: any) => {
                  const hh: any = h;
                  // try to find a matching result row for richer metadata
                  const match = results.find(r => String(r.run_id || r.simulation_id || r.id) === String(hh.id) || String(r.run_id || r.simulation_id || r.id) === String(hh.id));
                  const derived = deriveUser(match || hh);
                  // user filter
                  if (Array.isArray(facet?.userEmails) && facet.userEmails.length > 0) {
                    const keys = [derived.userEmail, derived.userId, derived.userName].filter(Boolean).map(String);
                    const matchedUser = facet.userEmails.some((sel: string) => keys.includes(String(sel)));
                    if (!matchedUser) return false;
                  }
                  // date filter: prefer runHistory ts or match.created_at
                  if (facet?.dateFrom || facet?.dateTo) {
                    const created = match?.created_at || match?.createdAt || hh?.ts || hh?.created_at || hh?.created || null;
                    if (!created) return false;
                    const t = new Date(created);
                    if (facet?.dateFrom) {
                      const from = new Date(facet.dateFrom);
                      from.setHours(0,0,0,0);
                      if (t < from) return false;
                    }
                    if (facet?.dateTo) {
                      const to = new Date(facet.dateTo);
                      to.setHours(23,59,59,999);
                      if (t > to) return false;
                    }
                  }
                  return true;
                });
                return filteredRunHistory.map(h => {
                  // derive counts for this run from the loaded results
                  const runId = String(h.id);
                  const runItems = results.filter(r => String(r.run_id || r.simulation_id || r.id) === runId || String(r.run_id || r.simulation_id || r.id) === String(h.id));
                  const uniqueWeathers = Array.from(new Set(runItems.map(r => deriveWeatherKey(r))));
                  const weatherCount = uniqueWeathers.length;
                  const idfCount = runItems.length;
                  const hh: any = h;
                  // prefer deriving user info from any matching result rows for this run (they often contain user_email)
                  const match = results.find(r => String(r.run_id || r.simulation_id || r.id) === String(hh.id));
                  const derived = deriveUser(match || hh);
                  const initiatedBy = derived.userName || hh?.user || hh?.initiator || hh?.owner || hh?.created_by || hh?.username || 'Unknown';
                  return (
                    <Box key={String(h.id) + '-' + String(h.ts)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserAvatar name={initiatedBy} size={28} />
                          <Typography variant="body2">{h.title || h.id}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{new Date(h.ts).toLocaleString()}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>User: {initiatedBy} • {weatherCount} weather files • {idfCount} IDFs</Typography>
                      </Box>
                      <Box>
                        <Button size="small" variant="text" onClick={async () => {
                          // Set the selected run for cascading navigation. Clear downstream selections.
                          setSelectedRun(h);
                          setSelectedIdf(null);
                          // attempt to pre-load results for the run if available
                          const found = results.find(r => String(r.id) === String(h.id) || String(r.simulation_id) === String(h.id));
                          if (found && typeof loadResults === 'function') {
                            const detail = await loadResults(String(h.id));
                            // keep cached detail but don't open modal yet
                            setSelectedResultDetail(detail || found);
                          }
                        }}>Open</Button>
                      </Box>
                    </Box>
                  );
                });
              })()}
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Select a run to explore its weather files, then pick an IDF to view charts and KPIs.</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2} sx={{ mb: 1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  {/* Search bar and Scenario dropdown removed — focus on cascading Run -> Weather -> IDF */}
                </Stack>

              {/* Cascading navigation: show run -> weather -> idf selection. Charts/KPIs are only shown when an IDF is selected. */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Selected Run</Typography>
                    {selectedRun ? (
                      <Box>
                        <Typography variant="body2">{selectedRun.title || selectedRun.name || selectedRun.id}</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date(selectedRun.ts || selectedRun.created_at || Date.now()).toLocaleString()}</Typography>
                        <Box sx={{ mt: 1 }}>
                          <Button size="small" onClick={() => {
                                // clear downstream selections
                                setSelectedIdf(null);
                                setFacet(prev => ({ ...prev, selectedIds: [] } as any));
                              }}>Clear selection</Button>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No run selected. Use the Run History on the left.</Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Weather Files</Typography>
                    {!selectedRun ? (
                      <Typography variant="caption" color="text.secondary">Select a run to see weather files used.</Typography>
                    ) : (
                      (() => {
                        // derive unique weather files from the run's associated results
                        const runId = String(selectedRun.id || selectedRun.simulation_id || selectedRun.run_id || selectedRun.title);
                        const runItemsRaw = results.filter(r => String(r.run_id || r.simulation_id || r.id) === runId || String(r.run_id || r.simulation_id || r.id) === String(selectedRun.id));
                        // normalize weather key for each item to ensure consistent grouping/counting
                        const runItems = runItemsRaw.map(r => ({ ...r, _weatherKey: deriveWeatherKey(r) }));
                        const weathers = Array.from(new Set(runItems.map(r => r._weatherKey)));
                        return (
                          <Stack spacing={1} sx={{ maxHeight: 260, overflow: 'auto' }}>
                            {weathers.map(w => {
                              const count = runItems.filter(r => r._weatherKey === w).length;
                              const selected = selectedWeather === String(w);
                              return (
                                <Box key={String(w)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: selected ? 'action.selected' : 'transparent', px: 1, py: 0.5, borderRadius: 1 }}>
                                  <Box sx={{ cursor: 'pointer' }} onClick={() => { setSelectedWeather(prev => prev === String(w) ? null : String(w)); setSelectedIdf(null); }}>
                                    <Typography variant="body2">{w}</Typography>
                                    <Typography variant="caption" color="text.secondary">{count} IDFs</Typography>
                                  </Box>
                                  <Box>
                                    <Button size="small" onClick={() => {
                                      // filter the main results table by weather and show
                                      setSelectedIdf(null);
                                      setShowAllResults(true);
                                      // force client-side fallback (use filteredResults) in case server returns minimal fields
                                      setRows([]);
                                      setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });
                                      const ids = runItems.filter(r => String(r._weatherKey || '') === String(w)).map(r => String(r.id || r.simulation_id || r.run_id)).filter(Boolean);
                                      setFacet(prev => ({ ...prev, scenario: selectedRun?.id || selectedRun?.simulation_id || prev.scenario, weather: String(w), selectedIds: ids } as any));
                                    }}>Show in Results</Button>
                                  </Box>
                                </Box>
                              );
                            })}
                            {weathers.length === 0 && <Typography variant="caption" color="text.secondary">No weather files found for this run.</Typography>}
                          </Stack>
                        );
                      })()
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>IDFs (unique)</Typography>
                    {!selectedRun ? (
                      <Typography variant="caption" color="text.secondary">Select a run to see IDFs.</Typography>
                    ) : (
                      (() => {
                        const runId = String(selectedRun.id || selectedRun.simulation_id || selectedRun.run_id || selectedRun.title);
                        const runItemsRaw = results.filter(r => String(r.run_id || r.simulation_id || r.id) === runId || String(r.run_id || r.simulation_id || r.id) === String(selectedRun.id));
                        // optionally filter by selected weather (from our UI) if set
                        const runItems = selectedWeather ? runItemsRaw.filter(r => String(r._weatherKey || '').toLowerCase() === String(selectedWeather).toLowerCase()) : runItemsRaw;
                        // derive a base name for IDF by stripping variant suffixes like _v1, -v2, .variant etc.
                        const baseName = (fn: string) => {
                          if (!fn) return fn;
                          // remove extension and variant-like suffixes
                          let name = fn.replace(/\.idf$/i, '');
                          name = name.replace(/(_v\d+|-v\d+|\.variant\..*|_variant.*|-variant.*|_\d{4}-\d{2}-\d{2})$/i, '');
                          return name;
                        };
                        const groups = new Map<string, any[]>();
                        runItems.forEach(r => {
                          const nr = normalizeRow(r);
                          const fn = String(nr.fileName || nr.name || nr.id || 'unknown');
                          const b = baseName(fn);
                          const arr = groups.get(b) || [];
                          arr.push(r);
                          groups.set(b, arr);
                        });
                        const entries = Array.from(groups.entries());
                        return (
                          <Stack spacing={1} sx={{ maxHeight: 260, overflow: 'auto' }}>
                            {entries.map(([b, items]) => (
                              <Box key={b} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                  <Typography variant="body2">{b}</Typography>
                                  <Typography variant="caption" color="text.secondary">{items.length} variants</Typography>
                                </Box>
                                <Box>
                                  <Button size="small" onClick={() => {
                                    // show all variants of this base in results
                                    const ids = items.map(it => String(it.id || it.simulation_id || it.run_id)).filter(Boolean);
                                    setFacet(prev => ({ ...prev, selectedIds: ids, scenario: selectedRun?.id || selectedRun?.simulation_id || prev.scenario } as any));
                                    setShowAllResults(true);
                                  }}>Show in Results</Button>
                                </Box>
                              </Box>
                            ))}
                            {entries.length === 0 && <Typography variant="caption" color="text.secondary">No IDFs found for this run.</Typography>}
                          </Stack>
                        );
                      })()
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Only show charts and KPIs when an IDF is selected */}
              {selectedIdf && (
                <>
                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>Energy vs Runtime</Typography>
                        <Box sx={{ height: { xs: 260, md: 360 } }}>
                          <ReactECharts option={energyOpts} onChartReady={onChartReady} style={{ height: '100%', width: '100%' }} />
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>GWP vs Cost</Typography>
                        <Box sx={{ height: { xs: 260, md: 360 } }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={filteredResults.map(r => ({ x: r.gwp ?? 0, y: r.cost ?? 0, name: r.name }))}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="x" name="GWP (kg CO₂e/m²)" tick={{ fontSize: 12 }} />
                              <YAxis dataKey="y" name="Cost (SEK/m²)" tick={{ fontSize: 12 }} />
                              <RechartsTooltip />
                              <Scatter data={filteredResults.map(r => ({ x: r.gwp ?? 0, y: r.cost ?? 0, name: r.name }))} fill="#1976d2" />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={4}>
                      <Card sx={{ minHeight: 140, transition: 'transform 200ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Total Simulations</Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700 }}>{filteredResults.length}</Typography>
                          <Typography variant="body2" color="text.secondary">Across {scenarios.length} scenarios</Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ minHeight: 140, transition: 'transform 200ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Average Energy Savings</Typography>
                          <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>24.5%</Typography>
                          <Typography variant="body2" color="text.secondary">Compared to baseline</Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ minHeight: 140, transition: 'transform 200ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>Best Performing Scenario</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>High Performance Set</Typography>
                          <Typography variant="body2" color="text.secondary">35.2% energy reduction</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Results table is hidden to focus on Run History and cascading selection.</Typography>
                    <Button size="small" onClick={() => setShowAllResults(v => !v)}>{showAllResults ? 'Hide full results' : 'Show all results'}</Button>
                  </Box>
                  {(showAllResults || selectedRun || selectedIdf) ? (
                  <TableContainer sx={{ px: 1, py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Rows: {rows?.length ?? 0} • RowCount: {rowCount ?? 0} • Fallback: {String(usingFallback)}</Typography>
                      <Typography variant="caption" color="text.secondary">Page {paginationModel?.page ? paginationModel.page + 1 : 1} • {paginationModel?.pageSize ?? ''} per page</Typography>
                    </Box>

                    <Box sx={{ height: { xs: 420, md: 680 }, width: '100%' }}>
                      <DataGrid
                        rows={displayRows}
                        columns={cols as any}
                        rowCount={rowCount}
                        loading={gridLoading}
                        paginationMode="server"
                        sortingMode="server"
                        filterMode="server"
                        onPaginationModelChange={(m: any) => setPaginationModel(m)}
                        onSortModelChange={(m: any) => setSortModel(m)}
                        slots={{ toolbar: GridToolbar }}
                        slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 400 } } as any }}
                        getRowId={(r: any) => String(r?.id)}
                        disableRowSelectionOnClick
                        density="compact"
                      />
                    </Box>
                    </TableContainer>
                  ) : null}
                </Paper>
              </Grid>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Download />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(results || [], null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'simulation-results.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Results
        </Button>
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Simulation Details
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Maximize2 size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  {selectedResult.name || selectedResult.fileName || selectedResult.id}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedResult.description || selectedResult.summary || ''}
                </Typography>

                <Typography variant="subtitle2">Key Metrics</Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip label={`Energy: ${selectedResult.energyUse ?? selectedResult.totalEnergy ?? getMetric(selectedResult, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']) ?? '-'}`} />
                  <Chip label={`Heating: ${selectedResult.heatingDemand ?? getMetric(selectedResult, ['heating_demand','heatingDemand','heating']) ?? '-'}`} />
                  <Chip label={`Cooling: ${selectedResult.coolingDemand ?? getMetric(selectedResult, ['cooling_demand','coolingDemand','cooling']) ?? '-'}`} />
                  <Chip label={`Cost: ${selectedResult.cost ?? '-'}`} />
                  <Chip label={`GWP: ${selectedResult.gwp ?? '-'}`} />
                  <Chip label={`Runtime: ${selectedResult.runTime ?? selectedResult.elapsed ?? getMetric(selectedResult, ['run_time','runTime','runtime','elapsed','duration']) ?? '-'}`} />
                </Stack>

                <Typography variant="subtitle2">Provenance</Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="body2">Scenario: {selectedResult.scenario_name || selectedResult.scenario || selectedResult.scenario_id || '-'}</Typography>
                  <Typography variant="body2">Variant: {selectedResult.variant_idx ?? selectedResult.variant ?? '-'}</Typography>
                  <Typography variant="body2">Weather: {selectedResult.weather_file || selectedResult.epw || '-'}</Typography>
                </Stack>

                <Typography variant="subtitle2">Materials & Constructions</Typography>
                <Paper variant="outlined" sx={{ p: 1, maxHeight: 220, overflow: 'auto' }}>
                  {selectedResultDetail && selectedResultDetail.construction_set ? (
                    Object.entries(selectedResultDetail.construction_set).map(([k, cs]: any) => (
                      <Box key={String(k)} sx={{ mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{k}</Typography>
                        <Typography variant="caption">{cs?.name || ''}</Typography>
                        {Array.isArray(cs?.layers) && (
                          <Box sx={{ mt: 0.5 }}>
                            {cs.layers.map((l: any, i: number) => <Typography key={i} variant="caption" display="block">- {l}</Typography>)}
                          </Box>
                        )}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">No construction data available in details.</Typography>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Files</Typography>
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="body2">IDF: {selectedResult.fileName || selectedResult.id || '-'}</Typography>
                  <Typography variant="body2">EPW: {selectedResult.weather_file || selectedResult.epw || '-'}</Typography>
                  <Typography variant="body2">Construction Set: {selectedResult.construction_set?.name || '-'}</Typography>
                </Stack>

                <Typography variant="subtitle2">Raw JSON</Typography>
                <Paper variant="outlined" sx={{ p: 1, maxHeight: 300, overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(selectedResultDetail || selectedResult, null, 2)}</pre>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>
            Export Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsPage;