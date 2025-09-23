import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Stack,
  Chip,
  Grid,
  IconButton,
  Collapse,
  Tooltip
} from '@mui/material';
import { FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

interface SimulationResultsViewProps {
  results: any[];
}

const SimulationResultsView = ({ results }: SimulationResultsViewProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [openCS, setOpenCS] = useState<Record<string, boolean>>({});
  const [openResult, setOpenResult] = useState<Record<string, boolean>>({});

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Normalize incoming results to support both snake_case and camelCase
  const normalizedResults = useMemo(() => (results || []).map((r: any) => {
    const raw = r.raw_json || {};
    const fileName = r.fileName || r.file_name || raw.fileName || raw.file_name || r.originalFileName || r.file || 'Unknown';
    const totalEnergyUse = Number(
      r.totalEnergyUse ?? r.total_energy_use ?? raw.totalEnergyUse ?? raw.total_energy_use ?? r.total_energy_use
    ) || 0;
    const heatingDemand = Number(
      r.heatingDemand ?? r.heating_demand ?? raw.heatingDemand ?? raw.heating_demand
    ) || 0;
    const coolingDemand = Number(
      r.coolingDemand ?? r.cooling_demand ?? raw.coolingDemand ?? raw.cooling_demand
    ) || 0;
    const runTime = Number(r.runTime ?? r.run_time ?? raw.runTime ?? raw.run_time ?? r.run_time) || 0;
    const totalArea = Number(r.totalArea ?? r.total_area ?? raw.totalArea ?? raw.total_area ?? r.total_area) || 0;
    const constructionSet = r.construction_set ?? r.constructionSet ?? raw.construction_set ?? raw.constructionSet ?? null;
    return {
      ...r,
      fileName,
      totalEnergyUse,
      heatingDemand,
      coolingDemand,
      runTime,
      totalArea,
      constructionSet
    };
  }), [results]);

  // Compute per-area metrics (kWh/m²) when area is available — chart expects kWh/m²
  const resultsWithPerArea = useMemo(() => normalizedResults.map((r: any) => {
    const perArea = r.totalArea > 0 ? r.totalEnergyUse / r.totalArea : r.totalEnergyUse;
    const heatingPerArea = r.totalArea > 0 ? r.heatingDemand / r.totalArea : r.heatingDemand;
    const coolingPerArea = r.totalArea > 0 ? r.coolingDemand / r.totalArea : r.coolingDemand;
    return {
      ...r,
      totalEnergyPerArea: perArea,
      heatingPerArea,
      coolingPerArea
    };
  }), [normalizedResults]);

  // Format data for chart (use normalized results)
  const chartData = useMemo(() => ({
    labels: resultsWithPerArea.map(r => r.fileName),
    datasets: [
      {
        label: 'Total Energy Use',
        data: resultsWithPerArea.map(r => r.totalEnergyPerArea),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: 'Heating Demand',
        data: resultsWithPerArea.map(r => r.heatingPerArea),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      },
      {
        label: 'Cooling Demand',
        data: resultsWithPerArea.map(r => r.coolingPerArea),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
      }
    ]
  }), [resultsWithPerArea]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        position: 'nearest' as const
      },
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Energy Performance Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energy (kWh/m²)'
        }
      }
    }
  }), [resultsWithPerArea]);

  const fmt = (v: any, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
    return Number(v).toFixed(digits);
  };

  return (
    <Box>
      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Summary" />
          <Tab label="Details" />
          <Tab label="Raw Data" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Simulation Results Summary
              </Typography>
              {!resultsWithPerArea || resultsWithPerArea.length === 0 ? (
                <Alert severity="info">No simulation results to display.</Alert>
              ) : (
                <Box sx={{ height: '400px', mb: 4 }}>
                  <Bar data={chartData} options={chartOptions} />
                </Box>
              )}

              {/* Quick debug summary so users can see data present without opening Raw Data */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Found <strong>{resultsWithPerArea.length}</strong> result(s). First file: <strong>{resultsWithPerArea[0]?.fileName ?? '—'}</strong>
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell align="right">Total Energy (kWh/m²)</TableCell>
                      <TableCell align="right">Heating (kWh/m²)</TableCell>
                      <TableCell align="right">Cooling (kWh/m²)</TableCell>
                      <TableCell align="right">Runtime (s)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultsWithPerArea.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.fileName}</TableCell>
                        <TableCell align="right">{fmt(result.totalEnergyPerArea)}</TableCell>
                        <TableCell align="right">{fmt(result.heatingPerArea)}</TableCell>
                        <TableCell align="right">{fmt(result.coolingPerArea)}</TableCell>
                        <TableCell align="right">{fmt(result.runTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detailed Results
              </Typography>
              <Stack spacing={2}>
                {resultsWithPerArea.map((result, index) => {
                  // Build a key that will be unique even when simulation_id is duplicated
                  const baseId = result.simulation_id ?? result.run_id ?? result.id ?? 'res';
                  const variantPart = result.variant_idx ?? result.variantIdx ?? 0;
                  const resKey = `${baseId}-${variantPart}-${index}`;
                  const expanded = !!openResult?.[resKey];
                  return (
                    <Paper key={resKey} variant="outlined" sx={{ p: 0, mb: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, height: 48, minHeight: 48 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem' }} title={result.fileName}>
                            {result.fileName} {result.variant_idx !== undefined ? `(variant ${result.variant_idx})` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {fmt(result.totalEnergyPerArea)} kWh/m² • {fmt(result.runTime)}s
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => setOpenResult(prev => ({ ...prev, [resKey]: !prev[resKey] }))} sx={{ p: 0.25 }}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </IconButton>
                        </Box>
                      </Box>

                      <Collapse in={expanded} timeout="auto">
                        <Box sx={{ p: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Building: {result.building || '-'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Area: {fmt(result.totalArea)} m²
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary" component="div">
                                <span>Status: </span>
                                {result.status === 'error'
                                  ? <Chip size="small" label="error" color="error" />
                                  : <Chip size="small" label={result.status} color="success" />
                                }
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Runtime: {fmt(result.runTime)} seconds
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Construction set (roof / floor / window) */}
                          {result.constructionSet ? (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2">Construction Set</Typography>
                              <Grid container spacing={1} sx={{ mt: 1 }}>
                                {['roof', 'floor', 'window'].map((k) => {
                                  const cs = result.constructionSet[k];
                                  if (!cs) return null;
                                  const key = `${index}-${k}`;
                                  const isOpenCS = !!openCS[key];
                                  return (
                                    <Grid item xs={12} sm={4} key={`${index}-cs-${k}`}>
                                      <Paper variant="outlined" sx={{ p: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={cs.name}>{k.toUpperCase()}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={cs.name}>{cs.name}</Typography>
                                          </Box>
                                          <Box>
                                            <Tooltip title={isOpenCS ? 'Collapse' : 'Expand'}>
                                              <IconButton size="small" onClick={() => setOpenCS(prev => ({ ...prev, [key]: !prev[key] }))}>
                                                {isOpenCS ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </Box>
                                        <Collapse in={isOpenCS} timeout="auto">
                                          <Box sx={{ mt: 1 }}>
                                            {Array.isArray(cs.layers) && cs.layers.length > 0 ? (
                                              cs.layers.map((layer: string, li: number) => (
                                                <Typography key={li} variant="caption" display="block">- {layer}</Typography>
                                              ))
                                            ) : (
                                              <Typography variant="caption" color="text.secondary">No layers</Typography>
                                            )}
                                          </Box>
                                        </Collapse>
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No construction set available.</Typography>
                          )}
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Raw Data
              </Typography>
              <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto' }}>
                <pre>{JSON.stringify(resultsWithPerArea, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<FileDown />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
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
    </Box>
  );
};

export default SimulationResultsView;