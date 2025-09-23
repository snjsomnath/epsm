import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Card, CardContent, Button, Alert, LinearProgress, Stack, Tooltip, Tabs, Tab, IconButton, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { Play, FileText, AlertCircle, BarChart2, Edit3, Trash2, Zap, Thermometer, Snowflake, Clock } from 'lucide-react';
import IdfUploadArea from './IdfUploadArea';
import EpwUploadArea from './EpwUploadArea';
import AssignmentsTab from './AssignmentsTab';
import ResultsTab from './ResultsTab';
import { parseIdfFiles } from '../../utils/api';
import { useSimulation } from '../../context/SimulationContext';
import type { ParsedData } from '../../types/simulation';

const BaselinePage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [simulationResults, setSimulationResults] = useState<any>(null);

  const { uploadedFiles, parsedData, setUploadedFiles, setParsedData, addToBaselineRun, updateBaselineRun, baselineHistory, removeBaselineRun, loadResults } = useSimulation();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // hydrate last baseline run when returning to page
  useEffect(() => {
    const tryHydrate = async () => {
      if (!simulationResults && baselineHistory && baselineHistory.length > 0) {
        const last = baselineHistory[0];
        try {
          if (typeof loadResults === 'function') {
            const data = await loadResults(last.id);
            if (data) {
              setSimulationResults(data);
              setSimulationComplete(true);
              setSelectedRunId(last.id);
            }
          }
        } catch (e) { /* ignore hydrate errors */ }
      }
    };
    tryHydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIdfFilesUploaded = async (files: File[]) => {
    if (files.length === 0) {
      setParsedData(null);
      setParseError(null);
      setUploadedFiles([]);
      return;
    }

    try {
      setParsing(true);
      setParseError(null);
      setParsedData(null);
      setUploadedFiles(files);
      const { data, error } = await parseIdfFiles(files);
      if (error) throw new Error(error);
      setParsedData(data as any as ParsedData);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse IDF files');
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleWeatherFileUploaded = (file: File | null) => setWeatherFile(file);

  const handleRunSimulation = async () => {
    if (!weatherFile || uploadedFiles.length === 0) return;
    try {
      setSimulating(true);
      setProgress(0);
      setSimulationComplete(false);
      setParseError(null);

      const formData = new FormData();
      uploadedFiles.forEach(file => formData.append('idf_files', file));
      formData.append('weather_file', weatherFile as File);

      const backendUrl = 'http://localhost:8000';

      // start run
      const response = await fetch(`${backendUrl}/api/simulation/run/`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      const simulation_id = data.simulation_id;
      if (!simulation_id) throw new Error('No simulation ID returned from server');
      if (typeof addToBaselineRun === 'function') addToBaselineRun(simulation_id, uploadedFiles[0]?.name || 'run');

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${backendUrl}/api/simulation/${simulation_id}/status/`);
          if (!statusResponse.ok) { clearInterval(pollInterval); throw new Error(`Status error ${statusResponse.status}`); }
          const statusData = await statusResponse.json();
          setProgress(statusData.progress ?? 0);

          // persist lightweight KPI/progress updates to baseline history
          if (simulation_id && typeof updateBaselineRun === 'function') {
            try {
              const lightweight: any = { progress: statusData.progress, status: statusData.status };
              const asNumber = (v: any) => {
                if (typeof v === 'number' && Number.isFinite(v)) return v;
                if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
                return undefined;
              };

              const totalCandidates = ['estimatedTotalEnergy','estimated_total_energy','totalEnergyEstimate','total_energy_estimate','totalSiteEnergy','total_site_energy','totalEnergy','total_energy','totalEnergyUse','totalEnergyUse_kwh'];
              for (const k of totalCandidates) {
                const n = asNumber(statusData?.[k]); if (typeof n === 'number') { lightweight.totalEnergy = n; break; }
              }
              const heatingCandidates = ['estimatedHeating','estimated_heating','heatingEstimate','heating_estimate','heating','heatingDemand','heating_demand'];
              for (const k of heatingCandidates) { const n = asNumber(statusData?.[k]); if (typeof n === 'number') { lightweight.heating = n; break; } }
              const coolingCandidates = ['estimatedCooling','estimated_cooling','coolingEstimate','cooling_estimate','cooling','coolingDemand','cooling_demand'];
              for (const k of coolingCandidates) { const n = asNumber(statusData?.[k]); if (typeof n === 'number') { lightweight.cooling = n; break; } }
              const timeCandidates = ['elapsedSeconds','elapsed_seconds','runTime','run_time','elapsed'];
              for (const k of timeCandidates) { const n = asNumber(statusData?.[k]); if (typeof n === 'number') { lightweight.runTime = n; break; } }

              updateBaselineRun(simulation_id, { kpis: lightweight });
            } catch (e) { /* ignore persistence errors */ }
          }

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            try {
              // try cached loader first
              let resultsData: any = null;
              if (typeof loadResults === 'function') resultsData = await loadResults(simulation_id);
              if (!resultsData) {
                const resultsResponse = await fetch(`${backendUrl}/api/simulation/${simulation_id}/results/`);
                if (!resultsResponse.ok) {
                  setSimulationResults({ error: `Failed to fetch results: ${resultsResponse.statusText}`, simulationId: simulation_id, fileName: uploadedFiles[0]?.name || 'Unknown file', totalEnergy: 0, heating: 0, cooling: 0, runTime: 0 });
                  setSimulationComplete(true); setSimulating(false); setTabIndex(0); return;
                }
                resultsData = await resultsResponse.json();
              }

              // ensure array/object shape and attach fileName if missing
              if (Array.isArray(resultsData)) {
                resultsData.forEach((r: any) => { r.simulationId = simulation_id; if (!r.fileName && uploadedFiles.length > 0) r.fileName = uploadedFiles[0].name; });
              } else if (resultsData && typeof resultsData === 'object') {
                resultsData.simulationId = simulation_id; if (!resultsData.fileName && uploadedFiles.length > 0) resultsData.fileName = uploadedFiles[0].name;
              }

              setSimulationResults(resultsData);

              const computeKpiSummary = (data: any) => {
                if (!data) return {};
                const rows = Array.isArray(data) ? data : [data];
                const totalEnergy = rows.reduce((s, r) => s + (Number(r.totalEnergy) || Number(r.totalEnergyUse) || 0), 0);
                const heating = rows.reduce((s, r) => s + (Number(r.heating) || Number(r.heatingDemand) || 0), 0);
                const cooling = rows.reduce((s, r) => s + (Number(r.cooling) || Number(r.coolingDemand) || 0), 0);
                const runTime = rows.reduce((s, r) => s + (Number(r.runTime) || 0), 0);
                return { totalEnergy, heating, cooling, runTime };
              };

              const kpiSummary = computeKpiSummary(resultsData);
              if (simulation_id && typeof updateBaselineRun === 'function') updateBaselineRun(simulation_id, { kpis: kpiSummary, metadata: { fileName: uploadedFiles[0]?.name || null } });

              setSimulationComplete(true);
              setSimulating(false);
              setTabIndex(0);
            } catch (resultError: any) {
              console.error('Error fetching results:', resultError);
              setSimulationResults({ error: `Error fetching results: ${resultError?.message || String(resultError)}`, simulationId: simulation_id });
              setSimulationComplete(true); setSimulating(false);
            }
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(statusData.error_message || 'Simulation failed');
          }
        } catch (err) { clearInterval(pollInterval); throw err; }
      }, 2000);

    } catch (err) {
      setSimulating(false);
      setParseError(err instanceof Error ? err.message : 'An error occurred during simulation');
      console.error('Simulation error:', err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Baseline Modeling</Typography>
      <Typography variant="body1" paragraph>Upload baseline IDF files, analyze components, and run simulations.</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FileText size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} /> IDF Files
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>Upload one or more IDF files to analyze their components</Typography>
              <IdfUploadArea onFilesUploaded={handleIdfFilesUploaded} />
              {parsing && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>Analyzing IDF components...</Typography>
                </Box>
              )}
              {parseError && <Alert severity="error" sx={{ mt: 2 }}>{parseError}</Alert>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper>
            <CardContent>
              <Typography variant="h6" gutterBottom>Component Analysis</Typography>
              <AssignmentsTab uploadedFiles={uploadedFiles} parsedData={parsedData} />
            </CardContent>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FileText size={20} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} /> Weather File
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>Upload a weather file (EPW format) for the simulation</Typography>
              <EpwUploadArea onFileUploaded={handleWeatherFileUploaded} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ opacity: uploadedFiles.length === 0 ? 0.7 : 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">Simulation Setup</Typography>
                {uploadedFiles.length === 0 && (
                  <Tooltip title="Upload IDF files first to enable simulation setup"><AlertCircle size={18} color="#666" /></Tooltip>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>Configure and run the baseline simulation</Typography>
              <Stack spacing={3}>
                <Box>
                  <Tooltip title={uploadedFiles.length === 0 ? 'Upload IDF files first' : !weatherFile ? 'Upload weather file to enable simulation' : ''}>
                    <span>
                      <Button variant="contained" color="primary" fullWidth startIcon={<Play size={18} />} disabled={uploadedFiles.length === 0 || !weatherFile || simulating} onClick={handleRunSimulation} size="large">Run Baseline Simulation</Button>
                    </span>
                  </Tooltip>
                  {simulating && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress variant="determinate" value={progress} />
                      <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>Simulating... {Math.round(progress)}%</Typography>
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          {baselineHistory && baselineHistory.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Baseline Runs</Typography>
                <TableContainer component={Paper} sx={{ mt: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sim Name</TableCell>
                        <TableCell>IDF File</TableCell>
                        <TableCell>KPIs</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {baselineHistory.map((run: any) => {
                        const simName = run.metadata?.generatedWord || (typeof run.title === 'string' ? String(run.title).split('-').slice(-1)[0] : run.id.slice(0, 8));
                        const idfFile = run.metadata?.fileName || (typeof run.title === 'string' && run.title.includes('-') ? run.title.split('-').slice(0, -1).join('-') : run.metadata?.fileBase || '—');
                        const ts = new Date(run.ts).toLocaleString();
                        const prog = typeof run.kpis?.progress === 'number' ? Math.min(Math.max(run.kpis.progress, 0), 100) : null;
                        const kpis = run.kpis || {};
                        const isSelected = selectedRunId === run.id;
                        return (
                          <TableRow key={run.id} sx={{ backgroundColor: isSelected ? 'action.selected' : undefined }}>
                            <TableCell sx={{ fontWeight: 600 }}>{simName}</TableCell>
                            <TableCell>{idfFile}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Zap size={12} /> {(Number(kpis.totalEnergy ?? kpis.total ?? 0)).toFixed(1)} kWh</Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Thermometer size={12} /> {(Number(kpis.heating ?? 0)).toFixed(1)}</Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Snowflake size={12} /> {(Number(kpis.cooling ?? 0)).toFixed(1)}</Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Clock size={12} /> {(Number(kpis.runTime ?? 0)).toFixed(0)}s</Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ minWidth: 180 }}>
                              {prog !== null ? (
                                <Box>
                                  <LinearProgress variant="determinate" value={prog} />
                                  <Typography variant="caption">{Math.round(prog)}%</Typography>
                                </Box>
                              ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                            </TableCell>
                            <TableCell><Typography variant="caption" color="text.secondary">{ts}</Typography></TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button size="small" onClick={async () => {
                                  try {
                                    setSelectedRunId(run.id);
                                    let data = null;
                                    if (typeof loadResults === 'function') data = await loadResults(run.id);
                                    if (!data) {
                                      const res = await fetch(`/api/simulation/${run.id}/results/`);
                                      if (res.ok) data = await res.json();
                                    }
                                    if (data) {
                                      setSimulationResults(data);
                                      setSimulationComplete(true);
                                      setTabIndex(0);
                                    }
                                  } catch (e) { console.error(e); }
                                }}>View</Button>
                                <IconButton size="small" onClick={() => { const newTitle = prompt('Rename baseline run', run.metadata?.title || run.title || 'run'); if (newTitle && typeof updateBaselineRun === 'function') updateBaselineRun(run.id, { metadata: { title: newTitle } }); }}><Edit3 size={14} /></IconButton>
                                <IconButton size="small" onClick={() => { if (typeof removeBaselineRun === 'function') removeBaselineRun(run.id); }}><Trash2 size={14} /></IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          <Paper>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabIndex} onChange={(_, newValue) => setTabIndex(newValue)} sx={{ px: 2, pt: 2 }}>
                <Tab icon={<BarChart2 size={18} />} iconPosition="start" label="Results" disabled={!simulationComplete} />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {!simulationComplete && <Alert severity="info">Run the baseline simulation to view results</Alert>}
              {simulationComplete && <ResultsTab uploadedFiles={uploadedFiles} simulationComplete={simulationComplete} simulationResults={simulationResults} />}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BaselinePage;