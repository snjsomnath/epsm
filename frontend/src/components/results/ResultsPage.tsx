import React, { useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '../../lib/auth-api';
import { Box, Typography, Grid, Paper, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import OverviewScatter from './OverviewScatter';
import ResultsDetailsPanel from './ResultsDetailsPanel';
import { normalizeResultMetrics } from './resultsUtils';
import ExplorerTree from './ExplorerTree';
import DrawerPane from './DrawerPane';
// IdfsPane removed
// VariantsPane removed
import { useSelectionStore } from '../../state/selectionStore';
import { useDatabase } from '../../context/DatabaseContext';

const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const selection = useSelectionStore();
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
    // initial load
    fetchResults();

    // refresh when other parts of app notify that scenarios changed
    const onChanged = (ev: Event) => {
      try {
        // If the event provides a detail with an id, try to remove matching runs in-memory
        const detail = (ev as CustomEvent)?.detail;
        const deletedId = detail?.id;
        const uuid = extractUuid(deletedId);
        if (uuid) {
          setResults(prev => prev.filter(r => {
            const candidate = extractUuid(String(r.simulation_id ?? r.scenario_id ?? r.scenario ?? ''));
            return candidate !== uuid;
          }));
          return;
        }
      } catch (e) {
        // fallthrough to full refresh
      }

      // fallback: re-fetch from server
      fetchResults();
    };
    window.addEventListener('scenarios:changed', onChanged as EventListener);
    return () => {
      window.removeEventListener('scenarios:changed', onChanged as EventListener);
    };
  }, []);

  const users = useMemo(() => {
    const m = new Map<string, any>();
    results.forEach((r) => {
      // Prefer an explicit user email if provided on the result object, then user_id, then user, else anonymous
      const email = r.user_email || (r.user && r.user.email) || null;
  const uidRaw = email || (r.user_id ?? r.user ?? 'anonymous');
      const uid = String(uidRaw);
      const displayName = email || uid;
      if (!m.has(uid)) m.set(uid, { id: uid, name: displayName, scenarios: new Map(), stats: { runs_total: 0 } });
      const u = m.get(uid);
      u.stats.runs_total += 1;
      const sid = String(r.simulation_id ?? r.scenario_id ?? r.scenario ?? 'unspecified');
      if (!u.scenarios.has(sid)) u.scenarios.set(sid, { id: sid, name: sid, runs: [] });
      u.scenarios.get(sid).runs.push(r);
    });
    return Array.from(m.values());
  }, [results]);

  if (loading) return <Box sx={{ mt: 4 }}>Loading…</Box>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Simulation Results</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <DrawerPane title="Users">
              <ExplorerTree users={users} onSelectUser={(u: any) => selection.set('user', u.id)} selectedUserId={selection.userId} />
            </DrawerPane>

            <DrawerPane title="Scenarios">
              {(() => {
                const su = users.find((x: any) => x.id === selection.userId);
                if (!su) return <Typography variant="caption">Select a user</Typography>;
                return <Box>{Array.from((su.scenarios || new Map()).values()).map((s: any) => (
                  <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button fullWidth variant={selection.scenarioId === s.id ? 'contained' : 'text'} onClick={() => selection.set('scenario', s.id)}>{s.name}</Button>
                    <IconButton size="small" color="error" onClick={() => { setToDeleteScenarioId(s.id); setConfirmOpen(true); }} aria-label={`Delete scenario ${s.name}`}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>🗑️</span>
                    </IconButton>
                  </Box>
                ))}</Box>;
              })()}
            </DrawerPane>

            <DrawerPane title="Runs">
              {(() => {
                const sc = users.find((x: any) => x.id === selection.userId)?.scenarios?.get(selection.scenarioId);
                if (!sc) return <Typography variant="caption">Select a scenario</Typography>;
                return <Box>{(sc.runs || []).slice(0, 200).map((r: any) => {
                  const nr = normalizeResultMetrics(r);
                  const label = `${r.name || r.fileName || r.id} ${nr.has_hourly ? '· hourly' : ''}`;
                  return (
                    <Button key={r.id || r.run_id} fullWidth variant={selection.runId === (r.id || r.run_id) ? 'contained' : 'text'} onClick={() => { selection.set('run', r.id || r.run_id); setSelectedResultDetail(r); }}>{label}</Button>
                  );
                })}</Box>;
              })()}
            </DrawerPane>

            {/* IdfsPane removed per UX decision */}

            {/* Variants pane removed per user request */}
          </Box>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box>
            {selection.runId ? (
              // when a specific run is selected, show detailed KPIs and hourly if present
              <Paper sx={{ p: 2 }}>
                <ResultsDetailsPanel result={selectedResultDetail} />
              </Paper>
            ) : selection.scenarioId ? (
              // when a scenario is selected but no run, show a scatter of the scenario's runs
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6">Scenario: {selection.scenarioId}</Typography>
                  <Typography variant="caption" color="text.secondary">Runs for this scenario</Typography>
                  <Box sx={{ mt: 2 }}>
                    {(() => {
                      const sc = users.find((x: any) => x.id === selection.userId)?.scenarios?.get(selection.scenarioId);
                      const runs = sc?.runs || [];
                      const data = runs.map((r: any) => ({
                        id: r.id || r.run_id,
                        eui_total: r.total_energy_use ?? r.totalEnergy ?? r.total_energy ?? 0,
                        eui_heating: r.heating_demand ?? r.heating ?? r.eui_heating ?? 0,
                        eui_cooling: r.cooling_demand ?? r.cooling ?? r.eui_cooling ?? 0,
                        eui_equipment: r.equipment_demand ?? r.equipment ?? r.eui_equipment ?? 0,
                        name: r.name || r.fileName || r.id,
                        raw: r,
                      }));
                      return (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="subtitle2">Color points by:</Typography>
                            <select
                              value={colorMetric.value}
                              onChange={(e) => {
                                const found = metricOptions.find(m => m.value === e.target.value);
                                if (found) setColorMetric(found);
                              }}
                            >
                              {metricOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </Box>
                          <OverviewScatter data={data} xKey="eui_total" yKey="eui_heating" onPointClick={(p) => {
                            const payload = (p && (p.payload || p)) as any;
                            const id = payload?.id;
                            const match = runs.find((rr: any) => String(rr.id || rr.run_id) === String(id));
                            if (match) { selection.set('run', match.id || match.run_id); setSelectedResultDetail(match); }
                          }} colorKey={colorMetric.value} colorLabel={colorMetric.label} />
                        </Box>
                      );
                    })()}
                  </Box>
                </Paper>
            ) : selection.userId ? (
              // when a user is selected (but no scenario/run), show summary info about that user's scenarios
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6">User: {(() => { const su = users.find((x: any) => x.id === selection.userId); return su ? su.name : selection.userId; })()}</Typography>
                <Typography variant="caption" color="text.secondary" gutterBottom>Summary of scenarios and runs for this user</Typography>
                {(() => {
                  const su = users.find((x: any) => x.id === selection.userId);
                  if (!su) return <Typography variant="body2">No data for this user.</Typography>;

                  const scenariosArr = Array.from((su.scenarios || new Map()).values());
                  const totalScenarios = scenariosArr.length;
                  const totalRuns = scenariosArr.reduce((acc: number, s: any) => acc + (s.runs?.length || 0), 0);
                  // earliest creation time across all runs (try created_at, created, timestamp fields)
                  const allDates = scenariosArr.flatMap((s: any) => (s.runs || []).map((r: any) => r.created_at || r.created || r.timestamp || null).filter(Boolean));
                  const earliest = allDates.length ? new Date(Math.min(...allDates.map((d: any) => new Date(d).getTime()))) : null;
                  // unique idfs across all runs (try idf_idx, idf)
                  const idfSet = new Set<string>();
                  scenariosArr.forEach((s: any) => (s.runs || []).forEach((r: any) => {
                    const idf = (r.idf_idx ?? r.idf ?? r.raw_json?.idf_idx ?? r.raw_json?.idf);
                    if (idf != null) idfSet.add(String(idf));
                  }));

                  return (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle2">Scenarios</Typography>
                          <Typography variant="h6">{totalScenarios}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">Total runs</Typography>
                          <Typography variant="h6">{totalRuns}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">Unique IDFs</Typography>
                          <Typography variant="h6">{idfSet.size}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">Earliest run</Typography>
                          <Typography variant="h6">{earliest ? earliest.toLocaleString() : '–'}</Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Scenarios</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">Name / ID</Typography>
                          <Typography variant="caption" color="text.secondary">Created</Typography>
                          <Typography variant="caption" color="text.secondary">Runs</Typography>
                          <Typography variant="caption" color="text.secondary">Unique IDFs</Typography>
                        </Box>
                        {scenariosArr.map((s: any) => {
                          const runs = s.runs || [];
                          const createds = runs.map((r: any) => r.created_at || r.created || r.timestamp).filter(Boolean);
                          const created = createds.length ? new Date(Math.min(...createds.map((d: any) => new Date(d).getTime()))) : null;
                          const sIdfSet = new Set<string>();
                          runs.forEach((r: any) => {
                            const idf = (r.idf_idx ?? r.idf ?? r.raw_json?.idf_idx ?? r.raw_json?.idf);
                            if (idf != null) sIdfSet.add(String(idf));
                          });
                          return (
                            <Box key={s.id} sx={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px 120px', gap: 1, py: 1, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                              <Box>
                                <Typography variant="body2">{s.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.id}</Typography>
                              </Box>
                              <Typography variant="body2">{created ? created.toLocaleString() : '–'}</Typography>
                              <Typography variant="body2">{runs.length}</Typography>
                              <Typography variant="body2">{sIdfSet.size}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })()}
              </Paper>
            ) : (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Overview</Typography>
                <Box sx={{ height: 640 }}>
                  <OverviewScatter data={results.map(r => ({ eui_total: r.totalEnergy ?? r.energyUse ?? 0, eui_heating: r.eui_heating ?? r.heating ?? 0, id: r.id, name: r.name }))} xKey="eui_total" yKey="eui_heating" onPointClick={(p) => {
                    const payload = (p && (p.payload || p)) as any;
                    const id = payload?.id || payload?.simulation_id;
                    const match = results.find(rr => String(rr.id || rr.simulation_id || rr.run_id) === String(id));
                    if (match) { selection.set('run', match.id || match.run_id); setSelectedResultDetail(match); }
                  }} />
                </Box>
              </Paper>
            )}
          </Box>
        </Grid>
      </Grid>
        {/* Confirmation dialog for inline delete */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Delete scenario</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this scenario? This is irreversible and will remove associated constructions from the database.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button color="error" onClick={async () => {
              if (!toDeleteScenarioId) return;
              try {
                const uuidOnly = extractUuid(toDeleteScenarioId);
                const res = await deleteScenario(String(uuidOnly));
                if (selection.scenarioId === toDeleteScenarioId || selection.scenarioId === uuidOnly) selection.set('scenario', undefined);
                if (res && res.status === 'not_found') {
                  setSnack({ open: true, message: 'Scenario had already been removed', severity: 'success' });
                } else {
                  setSnack({ open: true, message: 'Scenario deleted', severity: 'success' });
                }
              } catch (err: any) {
                setSnack({ open: true, message: err?.message || 'Failed to delete scenario', severity: 'error' });
              } finally {
                setConfirmOpen(false);
                setToDeleteScenarioId(null);
              }
            }}>Delete</Button>
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

export default ResultsPage;