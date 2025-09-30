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
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { 
  
  Download, 
  FileText, 
  Info, 
  Maximize2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search
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

const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  // DataGrid / server-driven state
  const [rows, setRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState<any>({ page: 0, pageSize: 100 });
  const [sortModel, setSortModel] = useState<any>([{ field: 'energy', sort: 'asc' }]);
  // quickFilter removed — server toolbar quick filter is used directly
  const [facet, setFacet] = useState<{scenario?: string; energy?: [number, number]; cost?: [number, number]; gwp?: [number, number]}>({});
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState<any>(null);
  const { deleteScenario } = useDatabase();
  // Helper to extract a UUID-like substring from scenario ids that may include suffixes like ':1'
  const extractUuid = (s?: string | null) => {
    if (!s) return undefined;
    const m = String(s).match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (m && m[0]) return m[0];
    // fallback: split on colon and take first part
    return String(s).split(':')[0];
  };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDeleteScenarioId, setToDeleteScenarioId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const metricOptions = [
    { value: 'eui_total', label: 'Total EUI' },
    { value: 'eui_heating', label: 'Heating EUI' },
    { value: 'eui_cooling', label: 'Cooling EUI' },
    { value: 'eui_equipment', label: 'Equipment EUI' },
  ];
  const [colorMetric, setColorMetric] = useState(metricOptions[0]);

  // Extracted fetch so we can re-use it when scenarios change elsewhere
  const fetchResults = async () => {
    let mounted = true;
    try {
      setLoading(true);
      const base = (import.meta as any).env?.VITE_API_BASE_URL || '';
      const apiUrl = base ? `${base.replace(/\/$/, '')}/api/simulation/results/` : '/api/simulation/results/';
      // Use authenticatedFetch so cookies/CSRF/auth headers are handled uniformly
      const res = await authenticatedFetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      } as RequestInit);
      if (!res.ok) throw new Error('no api');
      const json = await res.json();
      if (!mounted) return;
      setResults(Array.isArray(json) ? json : []);
    } catch (e) {
      const fallback: any[] = [];
      const uniq = new Map<string, any>();
      fallback.forEach(item => uniq.set(String(item?.id ?? item?.simulation_id ?? Math.random()), item));
      setResults(Array.from(uniq.values()));
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
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
          setResults(Array.from(uniq.values()));
          return;
        }

  const data = await response.json();
  // normalize server response: accept either an array or a paginated object { items, total }
  const items = Array.isArray(data) ? data : (data?.items || []);
  console.debug('[ResultsPage] fetched results count:', items.length, 'rawType=', typeof data, 'hasItems=', !!data?.items);
  setResults(items);
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
        setResults(Array.from(uniq.values()));
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // Derived filtered list
  const filteredResults = results.filter(r => {
    if (scenarioFilter && String(r.scenario_id || r.scenario || '').indexOf(scenarioFilter) === -1) return false;
    if (!filterText) return true;
    const t = filterText.toLowerCase();
    return (String(r.name || r.fileName || r.file || '')?.toLowerCase().indexOf(t) !== -1) ||
      (String(r.id || '')?.toLowerCase().indexOf(t) !== -1) ||
      (String(r.scenario || r.scenario_id || '')?.toLowerCase().indexOf(t) !== -1);
  });

  // server-driven fetch for grid
  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        page_size: String(paginationModel.pageSize),
        sort: sortModel[0]?.field || 'energy',
        dir: sortModel[0]?.sort || 'asc',
        q: '',
        scenario: facet.scenario || '',
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
      console.debug('[ResultsPage] server returned items=', json?.items?.length ?? 0, 'total=', json?.total);
      const serverItems = json.items || [];
      setRows(serverItems);
      setRowCount(json.total || (serverItems ? serverItems.length : 0));
      setUsingFallback(!(serverItems && serverItems.length > 0));
    } catch (e) {
      const slice2 = filteredResults.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize);
      console.debug('[ResultsPage] fetchGrid error — using fallback slice length=', slice2.length, e);
      setRows(slice2);
      setRowCount(filteredResults.length);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, sortModel, facet, results]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  // If server-driven `rows` is empty, fall back to client-side `filteredResults` page slice
  const normalizeRow = (r: any) => {
    // ensure stable id field (DataGrid expects `id` or we supply getRowId)
    const id = r?.id || r?.simulationId || r?.simulation_id || r?.run_id || r?.runId || r?.simulationId || r?.simulation_id || (r?.simulation_id ? String(r.simulation_id) : undefined) || undefined;
    const energyUse = r?.energyUse ?? r?.totalEnergy ?? r?.totalEnergyUse ?? (typeof r?.energy_use === 'object' ? (
      // try to compute a simple total from energy_use totals if present
      Object.values(r.energy_use).reduce((acc: number, v: any) => acc + (v?.total ?? 0), 0)
    ) : undefined);
    const scenario = r?.scenario_name || r?.scenario || r?.scenario_id || r?.scenarioId || r?.building || r?.originalFileName || r?.fileName || '';
    const totalEnergy = r?.totalEnergy ?? r?.totalEnergyUse ?? energyUse;
    return {
      ...r,
      id: id || String(r?.simulationId || r?.simulation_id || r?.originalFileName || Math.random()),
      simulation_id: r?.simulationId || r?.simulation_id,
      energyUse,
      totalEnergy,
      scenario,
      name: r?.name || r?.fileName || r?.originalFileName || r?.building || r?.simulationId
    };
  };

  const rawPage = (rows && rows.length > 0)
    ? rows
    : filteredResults.slice((paginationModel.page || 0) * (paginationModel.pageSize || 100), ((paginationModel.page || 0) + 1) * (paginationModel.pageSize || 100));
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
    setSelectedResult(row);
    setDetailsOpen(true);
    if (typeof loadResults === 'function') {
      const id = row.simulation_id || row.id || row.run_id;
      try {
        const detail = await loadResults(String(id));
        setSelectedResultDetail(detail || row);
      } catch (e) {
        setSelectedResultDetail(row);
      }
    } else {
      setSelectedResultDetail(row);
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
  { field: 'scenario', headerName: 'Scenario', flex: 1, minWidth: 160, valueGetter: (params: any) => params?.row ? (params.row.scenario_name || params.row.scenario || params.row.scenario_id) : undefined },
  { field: 'energy', headerName: 'Energy (kWh/m²)', type: 'number', width: 160, valueGetter: (params: any) => params?.row ? (params.row.energyUse ?? params.row.totalEnergy) : undefined },
  { field: 'cost', headerName: 'Cost (SEK/m²)', type: 'number', width: 150, valueGetter: (params: any) => params?.row ? params.row.cost : undefined },
  { field: 'gwp', headerName: 'GWP (kgCO₂e/m²)', type: 'number', width: 170, valueGetter: (params: any) => params?.row ? params.row.gwp : undefined },
  { field: 'variant', headerName: 'Variant', width: 110, valueGetter: (params: any) => params?.row ? (params.row.variant_idx ?? params.row.variant) : undefined },
  { field: 'weather', headerName: 'Weather', flex: 1, minWidth: 160, valueGetter: (params: any) => params?.row ? (params.row.weather_file || params.row.epw) : undefined },
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

  if (loading) return <Box sx={{ mt: 4 }}>Loading…</Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Simulation Results</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Run History</Typography>
            <Stack spacing={1} sx={{ mt: 1, maxHeight: 420, overflow: 'auto' }}>
              {(runHistory || []).map(h => (
                <Box key={String(h.id) + '-' + String(h.ts)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2">{h.title || h.id}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(h.ts).toLocaleString()}</Typography>
                  </Box>
                  <Box>
                    <Button size="small" variant="text" onClick={async () => {
                      const found = results.find(r => String(r.id) === String(h.id) || String(r.simulation_id) === String(h.id));
                      if (found) {
                        setSelectedResult(found);
                        setDetailsOpen(true);
                        if (typeof loadResults === 'function') {
                          const detail = await loadResults(String(h.id));
                          setSelectedResultDetail(detail || found);
                        }
                      } else if (typeof loadResults === 'function') {
                        const detail = await loadResults(String(h.id));
                        setSelectedResult(detail || { id: h.id });
                        setSelectedResultDetail(detail || { id: h.id });
                        setDetailsOpen(true);
                      }
                    }}>Open</Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Stack spacing={2} sx={{ mb: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  variant="outlined"
                  size="small"
                  placeholder="Search results by name, id, or scenario"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment> }}
                />

                <FormControl size="small" sx={{ width: 240 }}>
                  <InputLabel id="scenario-select-label">Scenario</InputLabel>
                  <Select
                    labelId="scenario-select-label"
                    label="Scenario"
                    value={scenarioFilter}
                    onChange={(e) => setScenarioFilter(String(e.target.value))}
                  >
                    <MenuItem value="">All scenarios</MenuItem>
                    {scenarios.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>

              <Grid container spacing={3}>
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

              <Grid item xs={12} sx={{ mt: 2 }}>
                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
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
                        loading={loading}
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
                  <Chip label={`Energy: ${selectedResult.energyUse ?? selectedResult.totalEnergy ?? '-'}`} />
                  <Chip label={`Cost: ${selectedResult.cost ?? '-'}`} />
                  <Chip label={`GWP: ${selectedResult.gwp ?? '-'}`} />
                  <Chip label={`Runtime: ${selectedResult.runTime ?? selectedResult.elapsed ?? '-'}`} />
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