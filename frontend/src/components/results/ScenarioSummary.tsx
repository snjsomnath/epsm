import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Grid, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import KpiTiles from './KpiTiles';
import { normalizeResultMetrics } from './resultsUtils';
import { useDatabase } from '../../context/DatabaseContext';
import { useSelectionStore } from '../../state/selectionStore';

interface Props { scenario?: any, onSelectRun?: (r: any) => void }

const ScenarioSummary: React.FC<Props> = ({ scenario, onSelectRun }) => {
  if (!scenario) return (
    <Paper sx={{ p: 2 }}><Typography variant="body2">Select a scenario to see a summary.</Typography></Paper>
  );

  const { deleteScenario } = useDatabase();
  const selection = useSelectionStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const scenarioId = scenario?.id || scenario?.scenario_id || scenario?.simulation_id;

  const handleDeleteConfirmed = async () => {
    if (!scenarioId) {
      setSnack({ open: true, message: 'Missing scenario id', severity: 'error' });
      setConfirmOpen(false);
      return;
    }
    setDeleting(true);
    try {
      // normalize id (some UI items include suffixes like ':1')
      const m = String(scenarioId).match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      const uuidOnly = m && m[0] ? m[0] : String(scenarioId).split(':')[0];
      const res = await deleteScenario(String(uuidOnly));
      // Clear selection for this scenario and below
      selection.set('scenario', undefined);
      if (res && res.status === 'not_found') {
        setSnack({ open: true, message: 'Scenario already removed', severity: 'success' });
      } else {
        setSnack({ open: true, message: 'Scenario deleted', severity: 'success' });
      }
    } catch (err: any) {
      setSnack({ open: true, message: err?.message || 'Failed to delete scenario', severity: 'error' });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  // produce aggregate/summary KPIs for the scenario
  const runs = scenario.runs || [];
  // simple aggregation: take mean of total EUI if available
  const euis = runs.map((rr: any) => normalizeResultMetrics(rr).eui_total).filter((v: any) => typeof v === 'number');
  const metrics = {
    eui_total: euis.length ? (euis.reduce((a: number, b: number) => a + b, 0) / euis.length) : undefined,
    runtime_s: runs.length ? runs[0].runTime ?? runs[0].runtime ?? runs[0].runtime_s : undefined,
  };

  return (
    <Box>
      <Typography variant="h6">Scenario: {scenario.name || scenario.id}</Typography>
      <Typography variant="caption" color="text.secondary">Runs: {runs.length}</Typography>

      <Box sx={{ mt: 2 }}>
        {/* show a representative KPI tiles row (could be improved to aggregated metrics later) */}
        <KpiTiles metrics={metrics} />
      </Box>

      <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
        <Button color="error" size="small" onClick={() => setConfirmOpen(true)}>Delete scenario</Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2">Runs in this scenario</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {runs.map((r: any) => (
              <Grid item xs={12} md={6} key={r.id || r.run_id || JSON.stringify(r)}>
                <Paper sx={{ p: 1 }}>
                  <Typography variant="body2">{r.name || r.fileName || r.id}</Typography>
                  {(() => {
                    const norm = normalizeResultMetrics(r);
                    return (
                      <>
                        <Typography variant="caption" color="text.secondary">EUI: {typeof norm.eui_total === 'number' ? Number(norm.eui_total).toFixed(2) : '-'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Runtime: {norm.runtime_s ?? '-'}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{norm.status ? `Status: ${norm.status}` : ''}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{norm.has_hourly ? 'Hourly ✓' : 'No hourly'}</Typography>
                      </>
                    );
                  })()}
                  <Box sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => onSelectRun && onSelectRun(r)}>View run details</Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>

      {/* Confirmation dialog for delete */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete scenario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the scenario "{scenario.name || scenario.id}"? This will remove associated scenario constructions and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteConfirmed}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ScenarioSummary;
