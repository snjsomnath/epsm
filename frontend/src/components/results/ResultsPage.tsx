// frontend/src/components/results/ResultsPage.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
import { useDatabase } from '../../context/DatabaseContext';
import { useSimulation } from '../../context/SimulationContext';

const ResultsPage = () => {
  const { scenarios } = useDatabase();
  const { loadResults, addToBaselineRun, cachedResults, lastResults, history: runHistory } = useSimulation();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState<string>('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        // Fetch results from your backend
        const response = await fetch('http://localhost:8000/api/simulation/results/');
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
        setResults(data);
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

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Simulation Results</Typography>
      <Typography variant="body1" paragraph>View and analyze simulation results across different scenarios.</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6">Run History</Typography>
            <Stack spacing={1} sx={{ mt: 1, maxHeight: 420, overflow: 'auto' }}>
              {(runHistory || []).map(h => (
                <Box key={String(h.id) + '-' + String(h.ts)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2">{h.title || h.id}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(h.ts).toLocaleString()}</Typography>
                  </Box>
                  <Box>
                    <Button size="small" onClick={async () => {
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
          <Stack spacing={2} sx={{ mb: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ flex: 1 }}>
                <input
                  placeholder="Search results by name, id, or scenario"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--mui-palette-divider)' }}
                />
              </Box>
              <Box sx={{ width: 240 }}>
                <select value={scenarioFilter} onChange={(e) => setScenarioFilter(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6 }}>
                  <option value="">All scenarios</option>
                  {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Box>
            </Stack>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Energy vs Runtime (scatter)</Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={results.map(r => ({ x: r.totalEnergy ?? r.energyUse ?? 0, y: r.runTime ?? r.runtime ?? r.elapsed ?? 0, name: r.name || r.fileName }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" name="Energy (kWh/m²)" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="y" name="Runtime (s)" tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Scatter data={results.map(r => ({ x: r.totalEnergy ?? r.energyUse ?? 0, y: r.runTime ?? r.runtime ?? r.elapsed ?? 0, name: r.name }))} fill="#8884d8" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>GWP vs Cost (scatter)</Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={results.map(r => ({ x: r.gwp ?? 0, y: r.cost ?? 0, name: r.name }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" name="GWP (kg CO₂e/m²)" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="y" name="Cost (SEK/m²)" tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Scatter data={results.map(r => ({ x: r.gwp ?? 0, y: r.cost ?? 0, name: r.name }))} fill="#ff7300" />
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
                    <Typography variant="h6" gutterBottom>Total Simulations</Typography>
                    <Typography variant="h3">{results.length}</Typography>
                    <Typography variant="body2" color="text.secondary">Across {scenarios.length} scenarios</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ minHeight: 140, transition: 'transform 200ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Average Energy Savings</Typography>
                    <Typography variant="h3" color="success.main">24.5%</Typography>
                    <Typography variant="body2" color="text.secondary">Compared to baseline</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ minHeight: 140, transition: 'transform 200ms ease', '&:hover': { transform: 'translateY(-4px)' } }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Best Performing Scenario</Typography>
                    <Typography variant="h5">High Performance Set</Typography>
                    <Typography variant="body2" color="text.secondary">35.2% energy reduction</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell align="right">Energy Use (kWh/m²)</TableCell>
                        <TableCell align="right">Cost (SEK/m²)</TableCell>
                        <TableCell align="right">GWP (kg CO₂e/m²)</TableCell>
                        <TableCell align="right">Variant</TableCell>
                        <TableCell align="right">Weather</TableCell>
                        <TableCell align="right">Savings vs. Baseline</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredResults.map((result) => (
                        <TableRow key={String(result.id || result.simulation_id || result.run_id || Math.random())} hover>
                          <TableCell>
                            <Stack>
                              <Typography variant="body2">{result.name || result.fileName || result.id}</Typography>
                              <Typography variant="caption" color="text.secondary">{String(result.scenario_name || result.scenario || result.scenario_id || '')}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Chip size="small" label={result.energyUse ?? result.totalEnergy ?? '-'} color={getStatusColor(result.energyUse ?? result.totalEnergy ?? 0, 'energy') as any} />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Chip size="small" label={result.cost ?? '-'} color={getStatusColor(result.cost ?? 0, 'cost') as any} />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <Chip size="small" label={result.gwp ?? '-'} color={getStatusColor(result.gwp ?? 0, 'gwp') as any} />
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{result.variant_idx ?? result.variant ?? '-'}</TableCell>
                          <TableCell align="right">{result.weather_file || result.epw || '-'}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              {result.savings ?? '-'}%
                              {getStatusIcon(result.energyUse ?? result.totalEnergy ?? 0, 150)}
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={async () => {
                                setSelectedResult(result);
                                setDetailsOpen(true);
                                if (typeof loadResults === 'function') {
                                  const id = result.simulation_id || result.id || result.run_id;
                                  try {
                                    const detail = await loadResults(String(id));
                                    setSelectedResultDetail(detail || result);
                                  } catch (e) {
                                    setSelectedResultDetail(result);
                                  }
                                } else {
                                  setSelectedResultDetail(result);
                                }
                              }}>
                                <Info size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download Results">
                              <IconButton size="small" onClick={() => {
                                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `simulation-${result.id || result.simulation_id || 'result'}.json`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}>
                                <Download size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Add to Baseline">
                              <IconButton size="small" onClick={() => {
                                const id = String(result.simulation_id || result.id || result.run_id || '');
                                if (id && typeof addToBaselineRun === 'function') addToBaselineRun(id, result.name || result.fileName || id, { source: 'resultsPage' });
                              }}>
                                <FileText size={18} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Stack>
        </Grid>
      </Grid>

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