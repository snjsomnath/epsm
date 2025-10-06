import React, { useMemo, useId, useCallback, useState } from 'react';
import {
  Box,
  Grid,
  Stack,
  Paper,
  Chip,
  Typography,
  Alert,
  Button,
  Divider,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import type { SelectChangeEvent, ChipProps } from '@mui/material';
import { Upload, Play, StopCircle, History, ChevronDown, ChevronRight } from 'lucide-react';
import SectionCard from '../SectionCard';

export type ScenarioOption = {
  id: string | number;
  name: string;
  total_simulations: number;
  description?: string | null;
};

export type SimulationStatusSummary = {
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progress: number;
  completed: number;
  total: number;
};

export type RunStatusChip = {
  label: string;
  color: ChipProps['color'];
  variant: NonNullable<ChipProps['variant']>;
};

export type QueueMetrics = {
  batchSize: number;
  totalBatches: number;
  completedBatches: number;
  remainingVariants: number;
  activeWorkers: number;
  activeStart: number | null;
  activeEnd: number | null;
  queueVariants: number;
  queuedBatches: number;
  batchProgress: number;
  nextQueuedVariant: number | null;
  idleWorkers: number;
  runningLabel: string;
  queueLabel: string;
  workerStatusLabel: string;
  hasScenario: boolean;
};

export type SimulationSetupSectionProps = {
  scenarios: ScenarioOption[];
  selectedScenarioId: string;
  activeScenario: ScenarioOption | null;
  uploadedFiles: File[];
  weatherFile: File | null;
  status: SimulationStatusSummary;
  runStatusChip: RunStatusChip;
  backendAvailable: boolean;
  queueMetrics: QueueMetrics;
  onScenarioChange: (scenarioId: string) => void;
  onManageFiles: () => void;
  onRequestStart: () => void;
  onCancelRun: () => void;
  onPrepareNewRun: () => void;
};

const SimulationSetupSection: React.FC<SimulationSetupSectionProps> = ({
  scenarios,
  selectedScenarioId,
  activeScenario,
  uploadedFiles,
  weatherFile,
  status,
  runStatusChip,
  backendAvailable,
  queueMetrics,
  onScenarioChange,
  onManageFiles,
  onRequestStart,
  onCancelRun,
  onPrepareNewRun,
}) => {
  const labelId = useId();
  const selectId = useId();
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  
  // Add dummy scenarios when backend is offline
  const dummyScenarios: ScenarioOption[] = [
    { id: 'dummy-1', name: 'Baseline Scenario', total_simulations: 12, description: 'Standard construction variants' },
    { id: 'dummy-2', name: 'High Performance', total_simulations: 24, description: 'Energy efficient materials' },
    { id: 'dummy-3', name: 'Cost Optimized', total_simulations: 18, description: 'Budget-friendly options' },
  ];
  
  const effectiveScenarios = backendAvailable ? scenarios : (scenarios.length > 0 ? scenarios : dummyScenarios);
  
  const hasScenario = Boolean(selectedScenarioId);
  const hasIdfFiles = uploadedFiles.length > 0;
  const hasWeather = Boolean(weatherFile && weatherFile.size > 0);
  const weatherNeedsReupload = Boolean(weatherFile && weatherFile.size === 0);
  const weatherDisplayName = weatherFile?.name ?? '';
  const readyToRun = hasScenario && hasIdfFiles && hasWeather;

  const blockers = useMemo(() => {
    const items: string[] = [];
    if (!hasScenario) items.push('Select a scenario');
    if (!hasIdfFiles) items.push('Upload at least one IDF file');
    if (!hasWeather) {
      items.push(
        weatherNeedsReupload
          ? 'Re-upload the EPW weather file'
          : 'Attach an EPW weather file'
      );
    }
    return items;
  }, [hasScenario, hasIdfFiles, hasWeather, weatherNeedsReupload]);

  const runStatus = runStatusChip;
  const progressValue = Math.round(status.progress);
  const filesCount = uploadedFiles.length;
  const variantCount = activeScenario?.total_simulations || 1;

  const handleScenarioSelect = useCallback((event: SelectChangeEvent<string>) => {
    onScenarioChange(event.target.value);
  }, [onScenarioChange]);

  const StepPanel: React.FC<{ step: number; title: string; done?: boolean; children: React.ReactNode }> = ({ step, title, done, children }) => (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative' }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={step} size="small" variant={done ? 'filled' : 'outlined'} color={done ? 'success' : 'default'} sx={{ fontWeight: 600 }} />
          <Typography variant="subtitle1">{title}</Typography>
        </Stack>
        {done ? <Chip size="small" label="Ready" color="success" /> : null}
      </Stack>
      {children}
    </Paper>
  );

  return (
    <SectionCard
      title="Simulation Setup"
      subtitle="Work through the checklist, then submit the batch"
    >
      <Grid container spacing={3} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Stack spacing={2.5} sx={{ overflow: 'visible' }}>
            <StepPanel step={1} title="Select scenario" done={hasScenario}>
              {effectiveScenarios.length === 0 ? (
                <Alert severity="info">Create a scenario on the Scenario Setup page to get started.</Alert>
              ) : (
                <FormControl fullWidth>
                  <InputLabel id={labelId}>Scenario</InputLabel>
                  <Select
                    labelId={labelId}
                    id={selectId}
                    value={selectedScenarioId || ''}
                    label="Scenario"
                    onChange={handleScenarioSelect}
                    MenuProps={{
                      PaperProps: { 
                        sx: { maxHeight: 400 } 
                      },
                      anchorOrigin: {
                        vertical: 'bottom',
                        horizontal: 'left',
                      },
                      transformOrigin: {
                        vertical: 'top',
                        horizontal: 'left',
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select a scenario</em>
                    </MenuItem>
                    {effectiveScenarios.map(s => (
                      <MenuItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.total_simulations} simulations)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {activeScenario?.description && (
                <Typography variant="body2" color="text.secondary">
                  {activeScenario.description}
                </Typography>
              )}
            </StepPanel>

            <StepPanel step={2} title="Attach files" done={hasIdfFiles && hasWeather}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary">IDF files</Typography>
                  {hasIdfFiles ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {uploadedFiles.slice(0, 6).map((file, index) => (
                        <Chip key={`${file.name}-${index}`} label={file.name} size="small" variant="outlined" />
                      ))}
                      {uploadedFiles.length > 6 && (
                        <Chip label={`+${uploadedFiles.length - 6} more`} size="small" variant="outlined" />
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No IDF files selected yet.
                    </Typography>
                  )}
                </Box>
                <Divider flexItem />
                <Box>
                  <Typography variant="body2" color="text.secondary">Weather file</Typography>
                  {hasWeather && weatherFile ? (
                    <Chip label={weatherFile.name} size="small" color="secondary" variant="outlined" sx={{ mt: 0.5 }} />
                  ) : weatherNeedsReupload ? (
                    <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
                      {weatherDisplayName ? `${weatherDisplayName} (re-upload required)` : 'Stored weather file needs re-upload.'}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No EPW weather file attached.
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Upload size={18} />}
                  onClick={onManageFiles}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Manage files
                </Button>
              </Stack>
            </StepPanel>

            <StepPanel step={3} title="Review inputs" done={readyToRun}>
              <Stack spacing={1.5}>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">Scenario</Typography>
                  <Typography variant="body1">{activeScenario ? activeScenario.name : 'Not selected'}</Typography>
                </Stack>
                <Stack spacing={0.5}>
                  <Typography variant="body2" color="text.secondary">Simulation count</Typography>
                  <Typography variant="body1">
                    {readyToRun ? `${filesCount * variantCount} total` : 'Waiting for inputs'}
                  </Typography>
                  {readyToRun && (
                    <Typography variant="caption" color="text.secondary">
                      {filesCount} file{filesCount === 1 ? '' : 's'} × {variantCount} variant{variantCount === 1 ? '' : 's'}
                    </Typography>
                  )}
                </Stack>
                {blockers.length > 0 && (
                  <Alert severity="warning">
                    <Stack component="ul" spacing={0.5} sx={{ pl: 2 }}>
                      {blockers.map(item => (
                        <Typography key={item} component="li" variant="body2">
                          {item}
                        </Typography>
                      ))}
                    </Stack>
                  </Alert>
                )}
                {readyToRun && !status.isRunning && !status.isPaused && !status.isComplete && (
                  <Alert severity="success">Everything looks good—start the batch when you're ready.</Alert>
                )}
              </Stack>
            </StepPanel>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={2.5} sx={{ height: '100%' }}>
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" color="text.secondary">
                  Run status & queue
                </Typography>
                <Chip size="small" label={runStatus.label} color={runStatus.color} variant={runStatus.variant} />
              </Stack>

              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
                <Typography variant="h6">
                  {status.completed} / {status.total || '—'}
                </Typography>
              </Stack>

              {(status.isRunning || status.isPaused || status.isComplete || progressValue > 0) && (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'background.default',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {progressValue}% complete
                  </Typography>
                </Box>
              )}

              {/* Worker Queue Metrics */}
              {queueMetrics.hasScenario && (
                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Chip 
                      size="small" 
                      label={`${queueMetrics.activeWorkers}/${queueMetrics.batchSize} workers`} 
                      color={queueMetrics.activeWorkers > 0 ? 'primary' : 'default'}
                      variant="outlined"
                    />
                    <Chip 
                      size="small" 
                      label={`${queueMetrics.queueVariants} queued`} 
                      color={queueMetrics.queueVariants > 0 ? 'secondary' : 'default'}
                      variant="outlined"
                    />
                  </Stack>

                  {(status.isRunning || status.isPaused) && (
                    <>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={showQueueDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        onClick={() => setShowQueueDetails(prev => !prev)}
                        sx={{ mb: 1, px: 0 }}
                      >
                        {showQueueDetails ? 'Hide queue details' : 'Show queue details'}
                      </Button>
                      
                      <Collapse in={showQueueDetails} timeout="auto" unmountOnExit>
                        <Stack spacing={1.5} sx={{ pt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {queueMetrics.workerStatusLabel}
                          </Typography>
                          <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                            <Chip size="small" color={queueMetrics.remainingVariants ? 'primary' : 'default'} label={queueMetrics.runningLabel} />
                            <Chip size="small" color={queueMetrics.queueVariants ? 'secondary' : 'default'} label={queueMetrics.queueLabel} />
                            <Chip size="small" color={queueMetrics.remainingVariants ? 'warning' : 'default'} label={`Remaining ${queueMetrics.remainingVariants}`} />
                            {queueMetrics.idleWorkers > 0 && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${queueMetrics.idleWorkers} idle`}
                              />
                            )}
                          </Stack>
                          <LinearProgress variant="determinate" value={queueMetrics.batchProgress} sx={{ height: 4, borderRadius: 2 }} />
                          <Typography variant="caption" color="text.secondary">
                            {queueMetrics.remainingVariants > 0
                              ? queueMetrics.nextQueuedVariant
                                ? `Next up: variant #${queueMetrics.nextQueuedVariant}. ${queueMetrics.queueVariants} waiting.`
                                : queueMetrics.idleWorkers > 0
                                  ? `${queueMetrics.activeWorkers} worker${queueMetrics.activeWorkers === 1 ? '' : 's'} running, ${queueMetrics.idleWorkers} idle.`
                                  : 'All available workers busy.'
                              : 'Queue empty — all tasks processed.'}
                          </Typography>
                        </Stack>
                      </Collapse>
                    </>
                  )}
                </Box>
              )}

              <Stack spacing={1.5} mt="auto">
                {!status.isRunning && !status.isPaused && !status.isComplete && (
                  <Button
                    variant="contained"
                    startIcon={<Play size={18} />}
                    onClick={onRequestStart}
                    disabled={!readyToRun}
                  >
                    Start Simulation
                  </Button>
                )}

                {(status.isRunning || status.isPaused) && !status.isComplete && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopCircle size={18} />}
                    onClick={onCancelRun}
                  >
                    Cancel run
                  </Button>
                )}

                {!status.isRunning && !status.isPaused && status.isComplete && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<History size={18} />}
                    onClick={onPrepareNewRun}
                  >
                    Prepare new run
                  </Button>
                )}

                {!status.isRunning && !status.isPaused && !status.isComplete && !readyToRun && (
                  <Typography variant="caption" color="text.secondary">
                    Complete the checklist to enable the run button.
                  </Typography>
                )}

                {(status.isRunning || status.isPaused) && (
                  <Typography variant="caption" color="text.secondary">
                    {backendAvailable
                      ? 'Cancelling stops monitoring; server workers finish in-flight variants.'
                      : 'Local dummy worker stops immediately.'}
                  </Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </SectionCard>
  );
};

// Only re-render if scenarios, selectedScenarioId, or key file states change
// Ignore frequent updates to status.progress and other polling-related props
const arePropsEqual = (
  prevProps: SimulationSetupSectionProps,
  nextProps: SimulationSetupSectionProps
) => {
  return (
    prevProps.scenarios === nextProps.scenarios &&
    prevProps.selectedScenarioId === nextProps.selectedScenarioId &&
    prevProps.activeScenario === nextProps.activeScenario &&
    prevProps.uploadedFiles === nextProps.uploadedFiles &&
    prevProps.weatherFile === nextProps.weatherFile &&
    prevProps.backendAvailable === nextProps.backendAvailable &&
    prevProps.status.isRunning === nextProps.status.isRunning &&
    prevProps.status.isComplete === nextProps.status.isComplete &&
    prevProps.status.isPaused === nextProps.status.isPaused &&
    prevProps.runStatusChip.label === nextProps.runStatusChip.label
    // Deliberately ignore status.progress, status.completed to prevent re-renders during simulation
  );
};

export default React.memo(SimulationSetupSection, arePropsEqual);
