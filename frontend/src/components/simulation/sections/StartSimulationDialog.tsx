import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { ScenarioOption } from './SimulationSetupSection';

export type StartSimulationDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  activeScenario: ScenarioOption | null;
  uploadedFilesCount: number;
  weatherFile: File | null;
  totalSimulations: number;
  suggestedParallel: number;
  cpuLogical: number;
  backendAvailable: boolean;
};

const StartSimulationDialog: React.FC<StartSimulationDialogProps> = ({
  open,
  onCancel,
  onConfirm,
  activeScenario,
  uploadedFilesCount,
  weatherFile,
  totalSimulations,
  suggestedParallel,
  cpuLogical,
  backendAvailable,
}) => {
  const hasWeather = Boolean(weatherFile && weatherFile.size > 0);
  const weatherNeedsReupload = Boolean(weatherFile && weatherFile.size === 0);
  const weatherDisplayName = weatherFile?.name ?? '';
  const startDisabled = uploadedFilesCount === 0 || !hasWeather;

  return (
    <Dialog open={open} onClose={onCancel}>
    <DialogTitle>Start Simulation</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Review your selections before launching the batch.
      </DialogContentText>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">Scenario</Typography>
          <Typography variant="body1">{activeScenario?.name || 'Not selected'}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">Inputs</Typography>
          <Typography variant="body1">
            {uploadedFilesCount} IDF file{uploadedFilesCount === 1 ? '' : 's'} · {hasWeather ? '1 EPW file' : weatherNeedsReupload ? 'EPW file needs re-upload' : 'no EPW file'}
          </Typography>
          {hasWeather && weatherFile && (
            <Typography variant="caption" color="text.secondary">{weatherFile.name}</Typography>
          )}
          {weatherNeedsReupload && (
            <Typography variant="caption" color="warning.main">{weatherDisplayName} must be re-uploaded before running.</Typography>
          )}
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">Total simulations</Typography>
          <Typography variant="body1">{totalSimulations || '—'}</Typography>
          {activeScenario && uploadedFilesCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {uploadedFilesCount} file{uploadedFilesCount === 1 ? '' : 's'} × {activeScenario.total_simulations || 1} variant{(activeScenario.total_simulations || 1) === 1 ? '' : 's'}
            </Typography>
          )}
        </Stack>
        <Alert severity="info">
          Celery runs up to {suggestedParallel} simulations in parallel ({cpuLogical} logical cores detected).
        </Alert>
        {weatherNeedsReupload && (
          <Alert severity="warning">Re-upload the EPW weather file before starting this simulation.</Alert>
        )}
        {!backendAvailable && (
          <Alert severity="warning">Backend offline detected—dummy progress will run locally.</Alert>
        )}
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel}>Cancel</Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color="primary"
        autoFocus
        disabled={startDisabled}
      >
        Start Simulation
      </Button>
    </DialogActions>
    </Dialog>
  );
};

export default StartSimulationDialog;
