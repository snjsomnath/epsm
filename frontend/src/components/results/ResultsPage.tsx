// frontend/src/components/results/ResultsPage.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  TextField,
  Autocomplete,
  Collapse,
  Tabs,
  Tab,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  LinearProgress,
  Card,
  CardContent,
  CircularProgress,
  Fade,
  Grow
} from '@mui/material';
import { 
  
  Download, 
  FileText, 
  Info, 
  Maximize2,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  Cpu,
  Thermometer,
  Snowflake,
  Droplet,
  Wind,
  Sun,
  Activity,
  Zap,
  Clock,
  Building,
  BarChart3,
  Database
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

// Fun loading animation component for EPSM
const EPSMLoadingAnimation: React.FC = () => {
  const [activeIcon, setActiveIcon] = useState(0);
  const [progress, setProgress] = useState(0);

  const simulationSteps = [
    { icon: <Building size={48} />, label: 'Loading building models...', color: '#1976d2' },
    { icon: <Database size={48} />, label: 'Fetching simulation data...', color: '#2e7d32' },
    { icon: <Thermometer size={48} />, label: 'Analyzing thermal performance...', color: '#d32f2f' },
    { icon: <Zap size={48} />, label: 'Computing energy metrics...', color: '#f57c00' },
    { icon: <Snowflake size={48} />, label: 'Calculating cooling loads...', color: '#0288d1' },
    { icon: <Sun size={48} />, label: 'Processing solar gains...', color: '#fbc02d' },
    { icon: <BarChart3 size={48} />, label: 'Preparing visualizations...', color: '#7b1fa2' },
  ];

  useEffect(() => {
    const iconInterval = setInterval(() => {
      setActiveIcon((prev) => (prev + 1) % simulationSteps.length);
    }, 1000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 400);

    return () => {
      clearInterval(iconInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: 3,
        p: 4,
        pt: 12,
      }}
    >
      {/* Animated building icon with pulsing energy */}
      <Box sx={{ position: 'relative', mb: 8 }}>
        {/* Outer energy pulse rings */}
        {[0, 1, 2].map((ring) => (
          <Box
            key={ring}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 140 + ring * 50,
              height: 140 + ring * 50,
              borderRadius: '50%',
              border: '3px solid',
              borderColor: simulationSteps[activeIcon].color,
              opacity: 0,
              animation: `pulse ${2.5}s ease-out infinite`,
              animationDelay: `${ring * 0.5}s`,
              '@keyframes pulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  opacity: 0.7,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1.5)',
                  opacity: 0,
                },
              },
            }}
          />
        ))}

        {/* Center icon container with rotation */}
        <Grow in timeout={700}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 140,
              height: 140,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              boxShadow: `0 0 40px ${simulationSteps[activeIcon].color}40`,
              transition: 'all 1s ease-in-out',
              border: '4px solid',
              borderColor: simulationSteps[activeIcon].color,
            }}
          >
            {/* Rotating icons */}
            {simulationSteps.map((step, idx) => (
              <Fade key={idx} in={activeIcon === idx} timeout={700}>
                <Box
                  sx={{
                    position: 'absolute',
                    color: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: activeIcon === idx ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(180deg)',
                    transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {step.icon}
                </Box>
              </Fade>
            ))}
          </Box>
        </Grow>
      </Box>

      {/* Animated status text */}
      <Box sx={{ textAlign: 'center', minHeight: 80, mb: 2, mt: 4 }}>
        <Fade in timeout={600} key={activeIcon}>
          <Typography
            variant="h5"
            sx={{
              color: simulationSteps[activeIcon].color,
              fontWeight: 600,
              mb: 2,
              animation: 'fadeSlide 0.8s ease-in-out',
              '@keyframes fadeSlide': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(10px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {simulationSteps[activeIcon].label}
          </Typography>
        </Fade>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
          Analyzing energy performance simulation results
        </Typography>

        {/* Progress bar */}
        <Box sx={{ width: 500, maxWidth: '90vw', mx: 'auto' }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                bgcolor: simulationSteps[activeIcon].color,
                borderRadius: 5,
                transition: 'all 0.4s ease',
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {Math.round(progress)}% complete
          </Typography>
        </Box>
      </Box>

      {/* Floating simulation metrics */}
      <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center" sx={{ mt: 2 }}>
        {[
          { icon: <Thermometer size={18} />, label: 'Thermal Analysis', color: '#d32f2f' },
          { icon: <Zap size={18} />, label: 'Energy Metrics', color: '#f57c00' },
          { icon: <Activity size={18} />, label: 'Performance Data', color: '#1976d2' },
          { icon: <BarChart3 size={18} />, label: 'Results Processing', color: '#7b1fa2' },
        ].map((metric, idx) => (
          <Fade key={idx} in timeout={1000} style={{ transitionDelay: `${idx * 250}ms` }}>
            <Chip
              icon={metric.icon}
              label={metric.label}
              size="medium"
              sx={{
                bgcolor: 'background.paper',
                borderColor: metric.color,
                color: metric.color,
                border: '2px solid',
                boxShadow: 2,
                px: 1,
                py: 2.5,
                fontSize: '0.95rem',
                animation: 'float 3.5s ease-in-out infinite',
                animationDelay: `${idx * 0.4}s`,
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-10px)' },
                },
              }}
            />
          </Fade>
        ))}
      </Stack>

      {/* Spinning loading indicator */}
      <CircularProgress
        size={32}
        thickness={3.5}
        sx={{
          color: simulationSteps[activeIcon].color,
          transition: 'color 1s ease',
          mt: 3,
        }}
      />
    </Box>
  );
};

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
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [selectedIdf, setSelectedIdf] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedWeatherKey, setExpandedWeatherKey] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'performance' | 'economics' | 'hourly'>('performance');
  const [rawJsonReady, setRawJsonReady] = useState(false);
  const [rawJsonLoading, setRawJsonLoading] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');
  const [rawJsonTotalLines, setRawJsonTotalLines] = useState(0);
  const [rawJsonLoadedLines, setRawJsonLoadedLines] = useState(0);
  const jsonLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawJsonLinesRef = useRef<string[] | null>(null);
  const rawJsonIndexRef = useRef(0);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const [layoutMode, setLayoutMode] = useState<'default' | 'wide'>('default');
  const [selectedTimeseriesKey, setSelectedTimeseriesKey] = useState<string | null>(null);
  const [selectedTimeseriesCategory, setSelectedTimeseriesCategory] = useState<string | null>(null);
  const { scenarios } = useDatabase();
  const { cachedResults, lastResults, loadResults, addToBaselineRun, history: runHistory } = useSimulation();
  const JSON_CHUNK_LINES = 200;
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

  const baseIdfName = (fn: string) => {
    if (!fn) return 'unknown-idf';
    let name = fn.replace(/\.idf$/i, '');
    name = name.replace(/(_v\d+|-v\d+|\.variant\..*|_variant.*|-variant.*|_\d{4}-\d{2}-\d{2})$/i, '');
    return name || fn;
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
  }, [paginationModel, sortModel, facet, results]);

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

  const normalizedAllResults = useMemo(() => results.map(normalizeRow), [results]);
  const normalizedResultMap = useMemo(() => {
    const map = new Map<string, any>();
    normalizedAllResults.forEach(row => {
      if (row?.id) map.set(String(row.id), row);
    });
    return map;
  }, [normalizedAllResults]);

  const runMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    (runHistory || []).forEach((run: any) => {
      if (run?.id) map.set(String(run.id), run);
    });
    return map;
  }, [runHistory]);

  const resultsByRunId = useMemo(() => {
    const map = new Map<string, any[]>();
    normalizedAllResults.forEach(row => {
      const runId = String(row.simulation_id || row.run_id || row.id || '');
      if (!runId) return;
      const arr = map.get(runId) || [];
      arr.push(row);
      map.set(runId, arr);
    });
    return map;
  }, [normalizedAllResults]);

  const runTree = useMemo(() => {
    return Array.from(resultsByRunId.entries()).map(([runId, rows]) => {
      const meta = runMetaMap.get(runId);
      const firstRow = rows[0];
      const derivedUser = deriveUser(meta || firstRow || {});
      return {
        runId,
        label: meta?.title || firstRow?.scenario || baseIdfName(firstRow?.name || firstRow?.fileName || runId),
        timestamp: meta?.ts || meta?.created_at || firstRow?.created_at,
        userName: derivedUser.userName,
        weatherNodes: Array.from(rows.reduce((acc: Map<string, any[]>, rowItem: any) => {
          const weatherKey = String(deriveWeatherKey(rowItem));
          const weatherRows = acc.get(weatherKey) || [];
          weatherRows.push(rowItem);
          acc.set(weatherKey, weatherRows);
          return acc;
        }, new Map<string, any[]>()).entries()).map(([weatherKey, weatherRows]) => ({
          weatherKey,
          rows: weatherRows.sort((a: any, b: any) => String(a.fileName || a.name || a.id).localeCompare(String(b.fileName || b.name || b.id))),
        })).sort((a, b) => a.weatherKey.localeCompare(b.weatherKey)),
        total: rows.length
      };
    }).sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [resultsByRunId, runMetaMap]);

  const filteredRunHistory = useMemo(() => {
    return (runHistory || []).filter((run: any) => {
      const runId = String(run.id);
      const rowsForRun = resultsByRunId.get(runId) || [];
      const representative = rowsForRun[0];
      const derived = deriveUser(representative || run || {});
      if (Array.isArray(facet?.userEmails) && facet.userEmails.length > 0) {
        const keys = [derived.userEmail, derived.userId, derived.userName].filter(Boolean).map(String);
        const matchedUser = facet.userEmails.some((sel: string) => keys.includes(String(sel)));
        if (!matchedUser) return false;
      }
      if (facet?.dateFrom || facet?.dateTo) {
        const created = representative?.created_at || representative?.createdAt || run?.ts || run?.created_at || run?.created || null;
        if (!created) return false;
        const ts = new Date(created);
        if (Number.isNaN(ts.getTime())) return false;
        if (facet?.dateFrom) {
          const from = new Date(facet.dateFrom);
          from.setHours(0, 0, 0, 0);
          if (ts < from) return false;
        }
        if (facet?.dateTo) {
          const to = new Date(facet.dateTo);
          to.setHours(23, 59, 59, 999);
          if (ts > to) return false;
        }
      }
      return true;
    });
  }, [runHistory, resultsByRunId, facet]);

  const selectedIdfRow = selectedIdf ? normalizedResultMap.get(selectedIdf) || null : null;

  const focusRows = useMemo(() => {
    if (selectedIdf && selectedIdfRow) return [selectedIdfRow];
    if (selectedRun?.id) {
      const runId = String(selectedRun.id);
      const runRows = normalizedAllResults.filter(row => String(row.simulation_id || row.run_id || row.id) === runId);
      if (selectedWeather) {
        return runRows.filter(row => String(deriveWeatherKey(row)).toLowerCase() === String(selectedWeather).toLowerCase());
      }
      return runRows;
    }
    return normalizedAllResults;
  }, [selectedIdf, selectedIdfRow, selectedRun, normalizedAllResults, selectedWeather]);

  const summaryStats = useMemo(() => {
    if (!focusRows || focusRows.length === 0) return null;
    const toNum = (value: any) => {
      if (value === undefined || value === null || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const totals = focusRows.reduce((acc, row) => {
      const energy = row.energyUse ?? row.totalEnergy ?? getMetric(row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']);
      const cost = row.cost ?? getMetric(row, ['cost','total_cost','annual_cost']);
      const gwp = row.gwp ?? getMetric(row, ['gwp','gwp_total','gwp_kg_co2_e']);
      const runtime = row.runTime ?? getMetric(row, ['run_time','runTime','runtime','elapsed','duration','execution_time']);
      const add = (key: 'energy' | 'cost' | 'gwp' | 'runtime', value: any) => {
        const n = toNum(value);
        if (n !== null) {
          acc[key] += n;
          acc[`${key}Count` as 'energyCount' | 'costCount' | 'gwpCount' | 'runtimeCount'] += 1;
        }
      };
      add('energy', energy);
      add('cost', cost);
      add('gwp', gwp);
      add('runtime', runtime);
      return acc;
    }, { energy: 0, energyCount: 0, cost: 0, costCount: 0, gwp: 0, gwpCount: 0, runtime: 0, runtimeCount: 0 });

    const average = (sum: number, count: number) => (count > 0 ? sum / count : null);
    return {
      count: focusRows.length,
      avgEnergy: average(totals.energy, totals.energyCount),
      avgCost: average(totals.cost, totals.costCount),
      avgGwp: average(totals.gwp, totals.gwpCount),
      avgRuntime: average(totals.runtime, totals.runtimeCount)
    };
  }, [focusRows]);

  const formatNumber = useCallback((value: any, digits = 1) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toFixed(digits);
  }, []);

  const formatNumberWithSeparator = useCallback((value: any, digits = 1) => {
    if (value === undefined || value === null || value === '') return '-';
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }, []);

  const createCleanTimeseriesLabel = useCallback((key: string): string => {
    let cleaned = key
      .replace(/_Energy_J$/g, '')
      .replace(/_Electricity_Energy_J$/g, '')
      .replace(/_Gas_Energy_J$/g, '')
      .replace(/_J$/g, '')
      .replace(/_Energy$/g, '');
    const zoneMatch = cleaned.match(/(.+?)_Zone_(.+)/);
    if (zoneMatch) {
      const zoneName = zoneMatch[1];
      const measurement = zoneMatch[2];
      let cleanZone = zoneName
        .replace(/^FLR\d+_?/gi, '')
        .replace(/^FLOOR\d+_?/gi, '')
        .replace(/^BLD\d+_?/gi, '')
        .replace(/^BUILDING\d+_?/gi, '');
      const floorMatch = cleanZone.match(/FLOOR(\d+)_?ROOM(\d+)/i);
      let zoneInfo = cleanZone;
      if (floorMatch) {
        const floor = floorMatch[1];
        const room = floorMatch[2];
        const buildingName = cleanZone.replace(/FLOOR\d+_?ROOM\d+/i, '').replace(/_+$/, '');
        zoneInfo = buildingName ? `${buildingName} Floor ${floor} Room ${room}` : `Floor ${floor} Room ${room}`;
      } else {
        zoneInfo = cleanZone.replace(/_/g, ' ').trim();
      }
      let cleanMeasurement = measurement
        .replace(/_Electricity$/i, '')
        .replace(/_Gas$/i, '')
        .replace(/_/g, ' ')
        .trim();
      const capitalize = (str: string) => str.split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      const energyType = key.includes('Electricity') ? ' (Electricity)' : key.includes('Gas') ? ' (Gas)' : '';
      return `${capitalize(zoneInfo)} - ${capitalize(cleanMeasurement)}${energyType}`;
    }
    return cleaned
      .replace(/_/g, ' ')
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const detectTimeseriesCategory = useCallback((label: string, name: string) => {
    const value = `${label} ${name}`.toLowerCase();
    if (value.includes('light')) return 'Lighting';
    if (value.includes('equipment')) return 'Equipment';
    if (value.includes('heat') || value.includes('heating')) return 'Heating';
    if (value.includes('cool')) return 'Cooling';
    if (value.includes('water')) return 'Water Systems';
    if (value.includes('vent') || value.includes('fan')) return 'Ventilation';
    if (value.includes('solar') || value.includes('pv')) return 'Solar';
    return 'Other';
  }, []);

  const getTimeseriesCategoryIcon = useCallback((category: string) => {
    switch (category) {
      case 'Lighting':
        return <Lightbulb size={16} />;
      case 'Equipment':
        return <Cpu size={16} />;
      case 'Heating':
        return <Thermometer size={16} />;
      case 'Cooling':
        return <Snowflake size={16} />;
      case 'Water Systems':
        return <Droplet size={16} />;
      case 'Ventilation':
        return <Wind size={16} />;
      case 'Solar':
        return <Sun size={16} />;
      default:
        return <Activity size={16} />;
    }
  }, []);

  const getTimeseriesCategoryColor = useCallback((category: string) => {
    switch (category) {
      case 'Lighting':
        return 'warning';
      case 'Equipment':
        return 'info';
      case 'Heating':
        return 'error';
      case 'Cooling':
        return 'primary';
      case 'Water Systems':
        return 'success';
      case 'Ventilation':
        return 'secondary';
      case 'Solar':
        return 'default';
      default:
        return 'default';
    }
  }, []);

  const activeDetailSource = selectedResultDetail || selectedResult || selectedIdfRow;

  const hourlyTimeseriesData = useMemo(() => {
    if (!activeDetailSource) return [];
    const series: Array<{ name: string; label: string; data: number[]; category: string }> = [];

    const pushSeries = (key: string, values: any) => {
      if (!Array.isArray(values)) return;
      if (values.length !== 8760 && values.length !== 8784) return;
      const numeric = values.map((v: any) => Number(v) || 0);
      const label = createCleanTimeseriesLabel(key);
      const category = detectTimeseriesCategory(label, key);
      series.push({ name: key, label, data: numeric, category });
    };

    const candidate = activeDetailSource as any;

    if (candidate?.hourly_timeseries?.series && typeof candidate.hourly_timeseries.series === 'object') {
      Object.entries(candidate.hourly_timeseries.series).forEach(([key, values]) => pushSeries(key, values));
    }

    const possibleKeys = ['hourly_data', 'hourlyData', 'timeseries', 'hourly', 'annual_hourly', 'annualHourly'];
    possibleKeys.forEach(k => {
      const block = candidate?.[k];
      if (block && typeof block === 'object') {
        Object.entries(block).forEach(([key, values]) => pushSeries(key, values));
      }
    });

    if (series.length === 0 && candidate?.results) {
      Object.values(candidate.results).forEach((value: any) => {
        if (value && typeof value === 'object') {
          Object.entries(value).forEach(([key, values]) => pushSeries(key, values));
        }
      });
    }

    return series.sort((a, b) => a.label.localeCompare(b.label));
  }, [activeDetailSource, createCleanTimeseriesLabel, detectTimeseriesCategory]);

  const groupedTimeseries = useMemo(() => {
    return hourlyTimeseriesData.reduce<Record<string, Array<{ name: string; label: string; data: number[]; category: string }>>>(
      (acc, item) => {
        const list = acc[item.category] || [];
        list.push(item);
        acc[item.category] = list;
        return acc;
      },
      {}
    );
  }, [hourlyTimeseriesData]);

  const hourlyKpis = useMemo(() => {
    if (!hourlyTimeseriesData.length) return null;
    const totalDatasets = hourlyTimeseriesData.length;
    const categories = Object.keys(groupedTimeseries).length;
    let peakLoad = 0;
    let totalEnergy = 0;
    hourlyTimeseriesData.forEach(ts => {
      ts.data.forEach(value => { if (value > peakLoad) peakLoad = value; });
      totalEnergy += ts.data.reduce((sum, value) => sum + value, 0);
    });
    const avgDailyEnergy = totalEnergy / hourlyTimeseriesData.length / 365;
    return { totalDatasets, categories, peakLoad, avgDailyEnergy };
  }, [hourlyTimeseriesData, groupedTimeseries]);

  useEffect(() => {
    if (!hourlyTimeseriesData.length) {
      if (selectedTimeseriesKey !== null) setSelectedTimeseriesKey(null);
      if (selectedTimeseriesCategory !== null) setSelectedTimeseriesCategory(null);
      // Reset to 'performance' tab if currently on 'hourly' tab but no hourly data available
      if (chartTab === 'hourly') setChartTab('performance');
      return;
    }
    const categories = Object.keys(groupedTimeseries);
    if (!categories.length) {
      if (selectedTimeseriesCategory !== null) setSelectedTimeseriesCategory(null);
      if (selectedTimeseriesKey !== null) setSelectedTimeseriesKey(null);
      return;
    }
    const nextCategory = selectedTimeseriesCategory && categories.includes(selectedTimeseriesCategory)
      ? selectedTimeseriesCategory
      : categories[0];
    if (nextCategory !== selectedTimeseriesCategory) setSelectedTimeseriesCategory(nextCategory);
    const items = groupedTimeseries[nextCategory] || [];
    const nextKey = selectedTimeseriesKey && items.some(item => item.name === selectedTimeseriesKey)
      ? selectedTimeseriesKey
      : (items[0]?.name ?? null);
    if (nextKey !== selectedTimeseriesKey) setSelectedTimeseriesKey(nextKey);
  }, [groupedTimeseries, hourlyTimeseriesData.length, selectedTimeseriesCategory, selectedTimeseriesKey, chartTab]);

  const selectedTimeseries = useMemo(() => {
    if (!selectedTimeseriesKey) return null;
    return hourlyTimeseriesData.find(ts => ts.name === selectedTimeseriesKey) || null;
  }, [hourlyTimeseriesData, selectedTimeseriesKey]);

  const dailyAveragedSeries = useMemo(() => {
    if (!selectedTimeseries) return [];
    const { data } = selectedTimeseries;
    const daily: Array<{ day: string; value: number }> = [];
    const dayCount = Math.floor(data.length / 24);
    for (let day = 0; day < dayCount; day += 1) {
      const offset = day * 24;
      const slice = data.slice(offset, offset + 24);
      const avg = slice.reduce((sum, value) => sum + value, 0) / slice.length;
      daily.push({ day: `Day ${day + 1}`, value: Number(avg.toFixed(3)) });
    }
    return daily;
  }, [selectedTimeseries]);

  const hourlyChartOption = useMemo(() => {
    if (!selectedTimeseries || !dailyAveragedSeries.length) return null;
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number) => `${value.toFixed(2)} kWh`
      },
      xAxis: {
        type: 'category',
        data: dailyAveragedSeries.map(item => item.day),
        axisLabel: { showMaxLabel: false, interval: Math.max(1, Math.floor(dailyAveragedSeries.length / 12)) }
      },
      yAxis: {
        type: 'value',
        name: 'kWh (daily avg)'
      },
      grid: { left: 60, right: 24, top: 30, bottom: 60 },
      series: [{
        type: 'line',
        smooth: true,
        data: dailyAveragedSeries.map(item => item.value),
        areaStyle: { opacity: 0.15 }
      }]
    };
  }, [dailyAveragedSeries, selectedTimeseries]);

  const cancelChunkLoad = useCallback(() => {
    if (jsonLoadTimeoutRef.current !== null) {
      clearTimeout(jsonLoadTimeoutRef.current);
      jsonLoadTimeoutRef.current = null;
    }
  }, []);

  const scheduleChunkLoad = useCallback(function load() {
    const lines = rawJsonLinesRef.current;
    if (!lines) {
      setRawJsonLoading(false);
      return;
    }
    const startIndex = rawJsonIndexRef.current;
    if (startIndex >= lines.length) {
      jsonLoadTimeoutRef.current = null;
      setRawJsonLoading(false);
      return;
    }
    const chunk = lines.slice(startIndex, startIndex + JSON_CHUNK_LINES);
    const chunkText = chunk.join('\n');
    setRawJsonText(prev => (prev ? `${prev}\n${chunkText}` : chunkText));
    setRawJsonLoadedLines(prev => {
      const nextCount = startIndex + chunk.length;
      return nextCount > prev ? nextCount : prev;
    });
    rawJsonIndexRef.current = startIndex + chunk.length;
    if (rawJsonIndexRef.current < lines.length) {
      jsonLoadTimeoutRef.current = setTimeout(() => load(), 40);
    } else {
      jsonLoadTimeoutRef.current = null;
      setRawJsonLoading(false);
    }
  }, [JSON_CHUNK_LINES]);

  const handleLoadRawJson = useCallback(() => {
    if (rawJsonReady) return;
    const target = selectedResultDetail || selectedResult;
    if (!target) return;
    cancelChunkLoad();
    const jsonString = JSON.stringify(target, null, 2);
    const lines = jsonString.split('\n');
    rawJsonLinesRef.current = lines;
    rawJsonIndexRef.current = 0;
    setRawJsonReady(true);
    setRawJsonLoading(true);
    setRawJsonText('');
    setRawJsonTotalLines(lines.length);
    setRawJsonLoadedLines(0);
    scheduleChunkLoad();
  }, [rawJsonReady, selectedResultDetail, selectedResult, cancelChunkLoad, scheduleChunkLoad]);

  const finishLoadingJson = useCallback(() => {
    const lines = rawJsonLinesRef.current;
    if (!lines) return;
    cancelChunkLoad();
    const startIndex = rawJsonIndexRef.current;
    if (startIndex >= lines.length) return;
    const remainingText = lines.slice(startIndex).join('\n');
    setRawJsonText(prev => (prev ? `${prev}\n${remainingText}` : remainingText));
    rawJsonIndexRef.current = lines.length;
    setRawJsonLoadedLines(lines.length);
    setRawJsonLoading(false);
  }, [cancelChunkLoad]);

  useEffect(() => () => {
    cancelChunkLoad();
  }, [cancelChunkLoad]);

  useEffect(() => {
    cancelChunkLoad();
    setRawJsonReady(false);
    setRawJsonLoading(false);
    setRawJsonText('');
    setRawJsonTotalLines(0);
    setRawJsonLoadedLines(0);
    rawJsonLinesRef.current = null;
    rawJsonIndexRef.current = 0;
  }, [selectedResultDetail, selectedResult, detailsOpen, cancelChunkLoad]);

  useEffect(() => {
    const node = pageContainerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      const width = entry.contentRect.width;
      setLayoutMode(width >= 1400 ? 'wide' : 'default');
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const resetPagination = useCallback(() => {
    setPaginationModel((prev: any) => ({ ...prev, page: 0 }));
  }, []);

  const buildRunSummary = useCallback((runNode: any) => {
    if (!runNode) return null;
    const meta = runMetaMap.get(runNode.runId);
    if (meta) {
      return {
        ...meta,
        id: runNode.runId,
        title: meta.title || runNode.label,
        ts: meta.ts || meta.created_at || runNode.timestamp,
        userName: meta.userName || runNode.userName
      };
    }
    return {
      id: runNode.runId,
      title: runNode.label,
      ts: runNode.timestamp,
      userName: runNode.userName
    };
  }, [runMetaMap]);

  const focusRunNode = useCallback((runNode: any) => {
    if (!runNode) return;
    setExpandedRunId(runNode.runId);
    const summary = buildRunSummary(runNode);
    setSelectedRun(summary);
    setSelectedWeather(null);
    setSelectedIdf(null);
    setExpandedWeatherKey(null);
    const ids = runNode.weatherNodes.flatMap((weather: any) => weather.rows.map((row: any) => String(row.id || ''))).filter(Boolean);
    setFacet(prev => ({ ...prev, selectedIds: ids, weather: undefined } as any));
    resetPagination();
  }, [buildRunSummary, resetPagination, setFacet]);

  const clearSelections = useCallback(() => {
    setSelectedRun(null);
    setSelectedWeather(null);
    setSelectedIdf(null);
    setExpandedRunId(null);
    setExpandedWeatherKey(null);
    setSelectedResult(null);
    setSelectedResultDetail(null);
    setFacet(prev => ({ ...prev, selectedIds: [], weather: undefined } as any));
    resetPagination();
  }, [resetPagination, setFacet]);

  const handleRunToggle = useCallback((runNode: any) => {
    if (!runNode) return;
    if (expandedRunId === runNode.runId) {
      setExpandedRunId(null);
      setSelectedRun(null);
      setSelectedWeather(null);
      setSelectedIdf(null);
      setExpandedWeatherKey(null);
      setFacet(prev => ({ ...prev, selectedIds: [], weather: undefined } as any));
      resetPagination();
    } else {
      focusRunNode(runNode);
    }
  }, [expandedRunId, focusRunNode, resetPagination, setFacet]);

  const handleWeatherToggle = useCallback((runNode: any, weatherNode: any) => {
    if (!runNode || !weatherNode) return;
    const compositeKey = `${runNode.runId}::${weatherNode.weatherKey}`;
    const nextExpanded = expandedWeatherKey === compositeKey ? null : compositeKey;
    setExpandedWeatherKey(nextExpanded);
    const summary = buildRunSummary(runNode);
    setSelectedRun(summary);
    if (nextExpanded) {
      setSelectedWeather(weatherNode.weatherKey);
      setSelectedIdf(null);
      const ids = weatherNode.rows.map((row: any) => String(row.id || '')).filter(Boolean);
      setFacet(prev => ({ ...prev, selectedIds: ids, weather: weatherNode.weatherKey } as any));
    } else {
      setSelectedWeather(null);
      const ids = runNode.weatherNodes.flatMap((w: any) => w.rows.map((row: any) => String(row.id || ''))).filter(Boolean);
      setFacet(prev => ({ ...prev, selectedIds: ids, weather: undefined } as any));
    }
    resetPagination();
  }, [buildRunSummary, expandedWeatherKey, resetPagination, setFacet]);

  const handleIdfSelect = useCallback(async (runNode: any, weatherNode: any, row: any) => {
    if (!row) return;
    const summary = buildRunSummary(runNode);
    setSelectedRun(summary);
    setSelectedWeather(weatherNode?.weatherKey || null);
    const id = String(row.id || row.simulation_id || row.run_id || '');
    if (!id) return;
    setSelectedIdf(id);
    setFacet(prev => ({ ...prev, selectedIds: [id], weather: weatherNode?.weatherKey } as any));
    resetPagination();
    if (typeof loadResults === 'function') {
      try {
        const detail = await loadResults(id);
        if (detail) setSelectedResultDetail(detail);
      } catch (e) {
        // ignore load errors here, details dialog can handle fallback
      }
    }
  }, [buildRunSummary, loadResults, resetPagination, setFacet]);

  const chartRows = selectedIdfRow ? focusRows : displayRows;
  const economicsChartData = useMemo(() => chartRows.map(row => ({
    name: row.name || row.id,
    gwp: Number(row.gwp ?? getMetric(row, ['gwp','gwp_total','gwp_kg_co2_e']) ?? 0) || 0,
    cost: Number(row.cost ?? getMetric(row, ['cost','total_cost','annual_cost']) ?? 0) || 0
  })), [chartRows]);

  // ECharts options for Energy vs Runtime
  const echartsEnergyData = chartRows.map(r => ({ name: r.name || r.id, value: [r.energyUse ?? r.totalEnergy ?? 0, r.runTime ?? r.runtime ?? r.elapsed ?? 0, r.id] }));
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
        const selectedIds = indices.map(i => chartRows[i]?.id || chartRows[i]?.simulation_id || chartRows[i]?.run_id).filter(Boolean);
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
  { field: 'user', headerName: '', width: 50, sortable: false, renderCell: (params: any) => {
    const info = deriveUser(params?.row || {});
    return (
      <Tooltip title={`${info.userName}${info.userEmail ? ` (${info.userEmail})` : ''}`} placement="right">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <UserAvatar name={info.userName} size={28} />
        </Box>
      </Tooltip>
    );
  } },
  { field: 'energy', headerName: 'Energy', type: 'number', width: 85,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.energyUse ?? params.row.totalEnergy ?? getMetric(params.row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']);
      return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'heating', headerName: 'Heat', type: 'number', width: 75,
    valueGetter: (params: any) => params?.row ? (params.row.heatingDemand ?? params.row.heating_demand ?? getMetric(params.row, ['heating_demand','heatingDemand','heating'])) : undefined,
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['heating_demand','heatingDemand','heating']);
      return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'cooling', headerName: 'Cool', type: 'number', width: 75,
    valueGetter: (params: any) => params?.row ? (params.row.coolingDemand ?? params.row.cooling_demand ?? getMetric(params.row, ['cooling_demand','coolingDemand','cooling'])) : undefined,
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['cooling_demand','coolingDemand','cooling']);
      return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'cost', headerName: 'Cost', type: 'number', width: 75, valueGetter: (params: any) => params?.row ? params.row.cost : undefined,
    renderCell: (params: any) => <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{params?.value === undefined ? '-' : formatNumberWithSeparator(params.value)}</Typography>
  },
  { field: 'gwp', headerName: 'GWP', type: 'number', width: 75, valueGetter: (params: any) => params?.row ? params.row.gwp : undefined,
    renderCell: (params: any) => <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{params?.value === undefined ? '-' : formatNumberWithSeparator(params.value)}</Typography>
  },
  { field: 'variant', headerName: 'Var', width: 60, valueGetter: (params: any) => params?.row ? (params.row.variant_idx ?? params.row.variant) : undefined,
    renderCell: (params: any) => <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{params?.value === undefined ? '-' : params.value}</Typography>
  },
  { field: 'area', headerName: 'Area', type: 'number', width: 75,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.totalArea ?? params.row.total_area ?? params.row.total_area_m2 ?? getMetric(params.row, ['total_area','totalArea','area','floor_area']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['total_area','totalArea','area','floor_area']);
      return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'runtime', headerName: 'Time', type: 'number', width: 70,
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      return params.row.runTime ?? params.row.run_time ?? getMetric(params.row, ['run_time','runTime','runtime','elapsed','duration','execution_time']);
    },
    renderCell: (params: any) => {
      const v = params?.value ?? getMetric(params?.row, ['run_time','runTime','runtime','elapsed','duration','execution_time']);
      return <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{v === undefined ? '-' : v}</Typography>;
    }
  },
  { field: 'created_at', headerName: 'Created', width: 140, type: 'dateTime',
    valueGetter: (params: any) => {
      if (!params?.row) return undefined;
      const raw = params.row.created_at ?? params.row.createdAt ?? params.row.ts ?? params.row.timestamp ?? getMetric(params.row, ['created_at','createdAt','ts','timestamp']);
      const t = raw ? (typeof raw === 'number' ? raw : Date.parse(String(raw))) : undefined;
      return Number.isFinite(t) ? t : undefined;
    },
    renderCell: (params: any) => {
      const v = params?.value;
      return <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{v ? new Date(v).toLocaleString() : '-'}</Typography>;
    }
  },
    {
      field: 'actions', headerName: 'Actions', width: 110, sortable: false,
      renderCell: (params: any) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View Details"><IconButton size="small" onClick={() => openDetails(params?.row)}><Info size={16} /></IconButton></Tooltip>
          <Tooltip title="Download"><IconButton size="small" onClick={() => downloadRow(params?.row)}><Download size={16} /></IconButton></Tooltip>
          <Tooltip title="Set Baseline"><IconButton size="small" onClick={() => addToBaseline(params?.row)}><FileText size={16} /></IconButton></Tooltip>
        </Stack>
      )
    },
    // small KPI column to ensure status helpers are used
    {
      field: 'kpi', headerName: 'KPI', width: 80, sortable: false,
  valueGetter: (p: any) => p?.row ? (p.row.energyUse ?? p.row.totalEnergy) : undefined,
      renderCell: (p: any) => {
        const v = p?.value ?? 0;
        const icon = getStatusIcon(v, 100);
        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {icon}
            <Chip size="small" label={v} color={getStatusColor(v, 'energy') as any} sx={{ fontSize: '0.7rem', height: 20 }} />
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
  function getMetric(row: any, keys: string[]) {
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
  }

  // only show global loading when initial results are being fetched and there are no results yet
  if (loading && (!results || results.length === 0)) return <EPSMLoadingAnimation />;

  const isWideLayout = layoutMode === 'wide';

  return (
    <Box ref={pageContainerRef}>
      <Typography variant="h4" gutterBottom>Simulation Results</Typography>
      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        <Grid item xs={12} md={isWideLayout ? 1.5 : 2}>
          <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.75, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>Runs</Typography>
              <IconButton size="small" onClick={() => setFiltersOpen(v => !v)} aria-label="Toggle filters">
                <Filter size={16} />
              </IconButton>
            </Box>
            <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ pt: 0.5 }}>
                <Autocomplete
                  multiple
                  options={Array.from(new Set(results.map((r: any) => deriveUser(r).userEmail).filter(Boolean)))}
                  value={facet.userEmails || []}
                  onChange={(e, v) => { if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault(); setFacet(prev => ({ ...prev, userEmails: v } as any)); }}
                  renderInput={(params) => <TextField {...params} label="Users" size="small" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  label="Date from"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={facet.dateFrom || ''}
                  onChange={(e) => setFacet(prev => ({ ...prev, dateFrom: e.target.value } as any))}
                  sx={{ minWidth: 130 }}
                />
                <TextField
                  label="Date to"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={facet.dateTo || ''}
                  onChange={(e) => setFacet(prev => ({ ...prev, dateTo: e.target.value } as any))}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  sx={{ minWidth: 130 }}
                />
                <Button size="small" onClick={() => setFacet(prev => ({ ...prev, userEmails: [], dateFrom: undefined, dateTo: undefined, selectedIds: [] } as any))}>Reset</Button>
              </Stack>
            </Collapse>
            <Divider />
            <List dense disablePadding sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
              {filteredRunHistory.map(run => {
                const runId = String(run.id);
                const rowsForRun = resultsByRunId.get(runId) || [];
                const uniqueWeathers = new Set(rowsForRun.map(r => deriveWeatherKey(r))).size;
                const derived = deriveUser(rowsForRun[0] || run || {});
                const runNode = runTree.find(node => node.runId === runId);
                return (
                  <ListItemButton
                    key={`history-${runId}-${run.ts || ''}`}
                    onClick={() => runNode && focusRunNode(runNode)}
                    selected={selectedRun?.id && String(selectedRun.id) === runId}
                    sx={{ alignItems: 'flex-start', py: 0.5, borderRadius: 1, mb: 0.3, minWidth: 0, px: 1 }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ width: '100%', minWidth: 0 }}>
                      <UserAvatar name={derived.userName} size={20} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: '0.8rem', lineHeight: 1.3 }}>{run.title || runId}</Typography>
                        {run.ts && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-word', fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {new Date(run.ts).toLocaleDateString()}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ wordBreak: 'break-word', fontSize: '0.65rem', lineHeight: 1.2 }}>
                          {uniqueWeathers}w • {rowsForRun.length} IDFs
                        </Typography>
                      </Box>
                    </Stack>
                  </ListItemButton>
                );
              })}
              {filteredRunHistory.length === 0 && (
                <Box sx={{ py: 2 }}>
                  <Typography variant="caption" color="text.secondary">No runs match the current filters.</Typography>
                </Box>
              )}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={isWideLayout ? 10.5 : 10}>
          <Stack spacing={2} sx={{ height: '100%' }}>
            <Paper sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>Browse Results</Typography>
                {(selectedRun || selectedWeather || selectedIdf) && (
                  <Button size="small" variant="outlined" onClick={clearSelections}>Clear</Button>
                )}
              </Box>
              <List dense disablePadding sx={{ maxHeight: { xs: 280, md: isWideLayout ? 320 : 300 }, overflowY: 'auto' }}>
                {runTree.map(runNode => {
                  const compositeSelected = selectedRun?.id && String(selectedRun.id) === runNode.runId;
                  return (
                    <Box key={`run-${runNode.runId}`} sx={{ mb: 0.5, border: '1px solid', borderColor: compositeSelected ? 'primary.main' : 'divider', borderRadius: 1, bgcolor: compositeSelected ? 'action.selected' : 'transparent' }}>
                      <ListItemButton
                        onClick={() => handleRunToggle(runNode)}
                        selected={compositeSelected}
                        sx={{ py: 0.5, px: 1, minHeight: 'auto', alignItems: 'flex-start', '&.Mui-selected': { bgcolor: 'transparent' } }}
                      >
                        <Box sx={{ mr: 0.75, mt: 0.25 }}>
                          {expandedRunId === runNode.runId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </Box>
                        <ListItemText
                          primary={runNode.label}
                          primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.3, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                          secondary={`${runNode.userName} • ${runNode.total} IDFs`}
                          secondaryTypographyProps={{ sx: { fontSize: '0.7rem', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                        />
                      </ListItemButton>
                      <Collapse in={expandedRunId === runNode.runId} timeout="auto" unmountOnExit>
                        <List dense disablePadding sx={{ pl: 1.5, pr: 0.5, py: 0.5, borderLeft: '2px solid', borderColor: 'divider' }}>
                          {runNode.weatherNodes.map(weatherNode => {
                            const compositeKey = `${runNode.runId}::${weatherNode.weatherKey}`;
                            const weatherSelected = expandedWeatherKey === compositeKey;
                            const isSelected = !!(selectedWeather && String(selectedWeather).toLowerCase() === String(weatherNode.weatherKey).toLowerCase());
                            return (
                              <Box key={compositeKey} sx={{ mb: 0.3, ml: 0.5, bgcolor: isSelected ? 'action.hover' : 'transparent', borderRadius: 0.5 }}>
                                <ListItemButton
                                  onClick={() => handleWeatherToggle(runNode, weatherNode)}
                                  selected={isSelected}
                                  sx={{ py: 0.4, px: 0.75, minHeight: 'auto', alignItems: 'flex-start', borderRadius: 0.5, '&.Mui-selected': { bgcolor: 'transparent' } }}
                                >
                                  <Box sx={{ mr: 0.5, mt: 0.2 }}>
                                    {weatherSelected ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </Box>
                                  <ListItemText
                                    primary={weatherNode.weatherKey}
                                    primaryTypographyProps={{ sx: { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                                    secondary={`${weatherNode.rows.length} IDFs`}
                                    secondaryTypographyProps={{ sx: { fontSize: '0.65rem', lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                                  />
                                </ListItemButton>
                                <Collapse in={weatherSelected} timeout="auto" unmountOnExit>
                                  <List dense disablePadding sx={{ pl: 1.5, pr: 0.5, py: 0.3, ml: 0.5, borderLeft: '2px solid', borderColor: 'action.disabled' }}>
                                    {weatherNode.rows.map((row: any) => {
                                      const rowId = String(row.id);
                                      const isIdfSelected = selectedIdf === rowId;
                                      return (
                                        <ListItemButton
                                          key={rowId}
                                          selected={isIdfSelected}
                                          onClick={() => handleIdfSelect(runNode, weatherNode, row)}
                                          sx={{ 
                                            borderRadius: 0.5, 
                                            mb: 0.2, 
                                            py: 0.4, 
                                            px: 0.75, 
                                            minHeight: 'auto', 
                                            alignItems: 'flex-start', 
                                            bgcolor: isIdfSelected ? 'primary.light' : 'transparent',
                                            '&.Mui-selected': { bgcolor: 'primary.light', color: 'primary.contrastText' },
                                            '&.Mui-selected:hover': { bgcolor: 'primary.main' }
                                          }}
                                        >
                                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isIdfSelected ? 'primary.main' : 'text.disabled', mr: 0.75, mt: 0.5, flexShrink: 0 }} />
                                          <ListItemText
                                            primary={row.fileName || row.name || rowId}
                                            primaryTypographyProps={{ sx: { fontSize: '0.7rem', fontWeight: isIdfSelected ? 600 : 400, lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                                            secondary={`E: ${formatNumber(row.energyUse ?? row.totalEnergy ?? getMetric(row, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']))} kWh/m²`}
                                            secondaryTypographyProps={{ sx: { fontSize: '0.65rem', lineHeight: 1.1, whiteSpace: 'normal', wordBreak: 'break-word' } }}
                                          />
                                        </ListItemButton>
                                      );
                                    })}
                                  </List>
                                </Collapse>
                              </Box>
                            );
                          })}
                        </List>
                      </Collapse>
                    </Box>
                  );
                })}
                {runTree.length === 0 && (
                  <Box sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary">No simulation results available yet.</Typography>
                  </Box>
                )}
              </List>
            </Paper>

            {summaryStats && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Summary</Typography>
                  {(selectedRun || selectedWeather || selectedIdf) && (
                    <Typography variant="caption" color="text.secondary">
                      Focus: {selectedRun?.title || selectedRun?.id || 'All runs'}{selectedWeather ? ` • Weather ${selectedWeather}` : ''}{selectedIdf ? ` • IDF ${selectedIdf}` : ''}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Items: ${summaryStats.count}`} />
                  {summaryStats.avgEnergy !== null && <Chip label={`Avg energy: ${formatNumber(summaryStats.avgEnergy)} kWh/m²`} />}
                  {summaryStats.avgCost !== null && <Chip label={`Avg cost: ${formatNumberWithSeparator(summaryStats.avgCost)} SEK/m²`} />}
                  {summaryStats.avgGwp !== null && <Chip label={`Avg GWP: ${formatNumberWithSeparator(summaryStats.avgGwp)} kgCO₂e/m²`} />}
                  {summaryStats.avgRuntime !== null && <Chip label={`Avg runtime: ${formatNumber(summaryStats.avgRuntime, 0)} s`} />}
                </Stack>
              </Paper>
            )}

            {selectedIdfRow && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Simulation Results</Typography>
                
                {/* Simulation Results Card - similar to baseline page */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                          {selectedIdfRow.fileName || selectedIdfRow.name || selectedIdfRow.id}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Zap size={16} /> Total Energy:
                            </Typography>
                            <Typography variant="h5">
                              {formatNumber(selectedIdfRow.energyUse ?? selectedIdfRow.totalEnergy ?? getMetric(selectedIdfRow, ['total_energy_use','totalEnergy','totalEnergyUse','total_energy','energy','energy_kwh']))} kWh/m²
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Thermometer size={16} /> Heating:
                            </Typography>
                            <Typography variant="h6" color="error.main">
                              {formatNumber(selectedIdfRow.heatingDemand ?? getMetric(selectedIdfRow, ['heating_demand','heatingDemand','heating']))} kWh/m²
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Snowflake size={16} /> Cooling:
                            </Typography>
                            <Typography variant="h6" color="info.main">
                              {formatNumber(selectedIdfRow.coolingDemand ?? getMetric(selectedIdfRow, ['cooling_demand','coolingDemand','cooling']))} kWh/m²
                            </Typography>
                          </Grid>
                          <Grid item xs={6} md={3}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Clock size={16} /> Runtime:
                            </Typography>
                            <Typography variant="h6">
                              {formatNumber(selectedIdfRow.runTime ?? getMetric(selectedIdfRow, ['run_time','runTime','runtime','elapsed','duration','execution_time']), 0)} s
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Tabbed interface for Summary, Energy Use, Hourly Data */}
                <Paper>
                  <Tabs value={chartTab} onChange={(_, value) => setChartTab(value)} textColor="primary" indicatorColor="primary">
                    <Tab label="Summary" value="performance" />
                    <Tab label="Energy Use" value="economics" />
                    {hourlyTimeseriesData.length > 0 && <Tab label="Hourly Data" value="hourly" />}
                  </Tabs>
                  <Box sx={{ p: 2 }}>
                    {chartTab === 'performance' && (
                      <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Energy Performance Summary</Typography>
                        {chartRows.length > 0 ? (
                          <Box sx={{ mt: 2, height: { xs: 260, md: 340 } }}>
                            <ReactECharts option={energyOpts} onChartReady={onChartReady} style={{ height: '100%', width: '100%' }} />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No chart data available.</Typography>
                        )}
                      </Box>
                    )}
                    
                    {chartTab === 'economics' && (
                      <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Economics & Environmental Impact</Typography>
                        {chartRows.length > 0 ? (
                          <Box sx={{ mt: 2, height: { xs: 260, md: 340 } }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={economicsChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="gwp" name="GWP (kg CO₂e/m²)" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="cost" name="Cost (SEK/m²)" tick={{ fontSize: 12 }} />
                                <RechartsTooltip />
                                <Scatter data={economicsChartData} fill="#1976d2" />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No economics data available.</Typography>
                        )}
                      </Box>
                    )}
                    
                    {chartTab === 'hourly' && hourlyTimeseriesData.length > 0 && (
                      <Box>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>Hourly Energy Profiles</Typography>
                        {hourlyKpis && (
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                            <Chip size="small" color="primary" label={`Datasets: ${hourlyKpis.totalDatasets}`} />
                            <Chip size="small" color="secondary" label={`Categories: ${hourlyKpis.categories}`} />
                            <Chip size="small" color="warning" label={`Peak: ${formatNumber(hourlyKpis.peakLoad)} kWh`} />
                            <Chip size="small" color="success" label={`Avg daily: ${formatNumber(hourlyKpis.avgDailyEnergy)} kWh`} />
                          </Stack>
                        )}
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
                              {Object.entries(groupedTimeseries).map(([category, items]) => (
                                <Box key={category} sx={{ mb: 1 }}>
                                  <ListItemButton
                                    selected={selectedTimeseriesCategory === category}
                                    onClick={() => {
                                      setSelectedTimeseriesCategory(category);
                                      const first = items[0]?.name ?? null;
                                      if (first) setSelectedTimeseriesKey(first);
                                    }}
                                    sx={{ borderRadius: 1, alignItems: 'flex-start', minWidth: 0 }}
                                  >
                                    <ListItemText
                                      primary={category}
                                      primaryTypographyProps={{ sx: { fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 } }}
                                      secondary={`${items.length} profiles`}
                                    />
                                    {getTimeseriesCategoryIcon(category)}
                                  </ListItemButton>
                                  {selectedTimeseriesCategory === category && (
                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                      {items.map(item => (
                                        <Chip
                                          key={item.name}
                                          label={item.label}
                                          size="small"
                                          color={selectedTimeseriesKey === item.name ? getTimeseriesCategoryColor(category) : 'default'}
                                          onClick={() => setSelectedTimeseriesKey(item.name)}
                                          sx={{ maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden' }}
                                        />
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              ))}
                            </List>
                          </Grid>
                          <Grid item xs={12} md={8}>
                            {hourlyChartOption ? (
                              <Box sx={{ height: { xs: 260, md: 320 } }}>
                                <ReactECharts option={hourlyChartOption} style={{ height: '100%', width: '100%' }} />
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Select a profile to visualize daily averages.</Typography>
                            )}
                            {selectedTimeseries && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Showing daily average load for <strong>{selectedTimeseries.label}</strong>
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Paper>
            )}

            {!selectedIdfRow && (
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>Charts</Typography>
                  <Tabs value={chartTab} onChange={(_, value) => setChartTab(value)} textColor="primary" indicatorColor="primary">
                    <Tab label="Performance" value="performance" />
                    <Tab label="Economics" value="economics" />
                  </Tabs>
                </Box>
                {chartRows.length > 0 ? (
                  <Box sx={{ mt: 2, height: { xs: 260, md: 340 } }}>
                    {chartTab === 'performance' ? (
                      <ReactECharts option={energyOpts} onChartReady={onChartReady} style={{ height: '100%', width: '100%' }} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={economicsChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="gwp" name="GWP (kg CO₂e/m²)" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="cost" name="Cost (SEK/m²)" tick={{ fontSize: 12 }} />
                          <RechartsTooltip />
                          <Scatter data={economicsChartData} fill="#1976d2" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No chart data available for this selection.</Typography>
                )}
              </Paper>
            )}

            {selectedIdfRow && hourlyTimeseriesData.length > 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Hourly Profiles</Typography>
                {hourlyKpis && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Chip size="small" color="primary" label={`Datasets: ${hourlyKpis.totalDatasets}`} />
                    <Chip size="small" color="secondary" label={`Categories: ${hourlyKpis.categories}`} />
                    <Chip size="small" color="warning" label={`Peak hour: ${formatNumber(hourlyKpis.peakLoad)} kWh`} />
                    <Chip size="small" color="success" label={`Avg daily: ${formatNumber(hourlyKpis.avgDailyEnergy)} kWh`} />
                  </Stack>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
                      {Object.entries(groupedTimeseries).map(([category, items]) => (
                        <Box key={category} sx={{ mb: 1 }}>
                          <ListItemButton
                            selected={selectedTimeseriesCategory === category}
                            onClick={() => {
                              setSelectedTimeseriesCategory(category);
                              const first = items[0]?.name ?? null;
                              if (first) setSelectedTimeseriesKey(first);
                            }}
                            sx={{ borderRadius: 1, alignItems: 'flex-start', minWidth: 0 }}
                          >
                            <ListItemText
                              primary={category}
                              primaryTypographyProps={{ sx: { fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 } }}
                              secondary={`${items.length} profiles`}
                            />
                            {getTimeseriesCategoryIcon(category)}
                          </ListItemButton>
                          {selectedTimeseriesCategory === category && (
                            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                              {items.map(item => (
                                <Chip
                                  key={item.name}
                                  label={item.label}
                                  size="small"
                                  color={selectedTimeseriesKey === item.name ? getTimeseriesCategoryColor(category) : 'default'}
                                  onClick={() => setSelectedTimeseriesKey(item.name)}
                                  sx={{ maxWidth: '100%', textOverflow: 'ellipsis', overflow: 'hidden' }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      ))}
                      {hourlyTimeseriesData.length === 0 && (
                        <Typography variant="caption" color="text.secondary">No hourly timeseries were found in this result.</Typography>
                      )}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    {hourlyChartOption ? (
                      <Box sx={{ height: { xs: 260, md: 320 } }}>
                        <ReactECharts option={hourlyChartOption} style={{ height: '100%', width: '100%' }} />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Select a profile to visualize daily averages.</Typography>
                    )}
                    {selectedTimeseries && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Showing daily average load for <strong>{selectedTimeseries.label}</strong>
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>
            )}

            <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Showing {displayRows.length} of {rowCount || displayRows.length} rows • Fallback: {String(usingFallback)}</Typography>
                <Typography variant="caption" color="text.secondary">Page {Number(paginationModel?.page || 0) + 1} • {paginationModel?.pageSize || ''} per page</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <DataGrid
                  rows={displayRows}
                  columns={cols as any}
                  rowCount={rowCount}
                  loading={gridLoading}
                  paginationMode="server"
                  paginationModel={paginationModel}
                  sortingMode="server"
                  sortModel={sortModel}
                  filterMode="server"
                  onPaginationModelChange={(m: any) => setPaginationModel(m)}
                  onSortModelChange={(m: any) => setSortModel(m)}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 400 } } as any }}
                  getRowId={(r: any) => String(r?.id)}
                  disableRowSelectionOnClick
                  disableColumnFilter={false}
                  density="compact"
                />
              </Box>
            </Paper>
          </Stack>
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
                  <Chip label={`Cost: ${formatNumberWithSeparator(selectedResult.cost)}`} />
                  <Chip label={`GWP: ${formatNumberWithSeparator(selectedResult.gwp)}`} />
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
                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {!rawJsonReady ? (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Raw payloads can be large. Load on demand to avoid freezing the browser.
                      </Typography>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleLoadRawJson}
                        disabled={rawJsonLoading || !(selectedResultDetail || selectedResult)}
                      >
                        Load raw JSON
                      </Button>
                    </Stack>
                  ) : (
                    <>
                      <Box sx={{ flex: 1, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre', fontFamily: 'monospace', fontSize: 12 }}>{rawJsonText}</pre>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Loaded {rawJsonLoadedLines} of {rawJsonTotalLines} lines
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {rawJsonLoading && (
                            <Button size="small" onClick={finishLoadingJson}>Load remaining</Button>
                          )}
                          <Button size="small" variant="outlined" onClick={() => {
                            setRawJsonReady(false);
                            setRawJsonText('');
                            setRawJsonTotalLines(0);
                            setRawJsonLoadedLines(0);
                            setRawJsonLoading(false);
                            rawJsonLinesRef.current = null;
                            rawJsonIndexRef.current = 0;
                            cancelChunkLoad();
                          }}>Clear</Button>
                        </Stack>
                      </Stack>
                      {rawJsonLoading && (
                        <LinearProgress
                          variant={rawJsonTotalLines ? 'determinate' : 'indeterminate'}
                          value={rawJsonTotalLines ? Math.min(100, (rawJsonLoadedLines / rawJsonTotalLines) * 100) : undefined}
                        />
                      )}
                    </>
                  )}
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
