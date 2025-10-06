import React from 'react';
import {
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  Collapse,
  Alert,
  LinearProgress,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SectionCard from '../SectionCard';

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

export type QueueOverviewSectionProps = {
  queueMetrics: QueueMetrics;
  selectedScenarioPresent: boolean;
  runStatus: {
    label: string;
    color: ChipProps['color'];
    variant: NonNullable<ChipProps['variant']>;
  };
  completedSimulations: number;
  totalSimulations: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
};

const QueueOverviewSection: React.FC<QueueOverviewSectionProps> = ({
  queueMetrics,
  selectedScenarioPresent,
  runStatus,
  completedSimulations,
  totalSimulations,
  isRunning,
  isPaused,
  isComplete,
  showDetails,
  onToggleDetails,
}) => {
  const showDetailToggle = selectedScenarioPresent && queueMetrics.hasScenario;

  return (
    <SectionCard
      title="Worker Queue"
      subtitle={queueMetrics.hasScenario ? 'Quick snapshot of Celery utilisation' : 'Select a scenario to view queue statistics'}
      actions={selectedScenarioPresent ? (
        <Chip
          size="small"
          label={runStatus.label}
          color={runStatus.color}
          variant={runStatus.variant}
        />
      ) : undefined}
    >
      {!queueMetrics.hasScenario ? (
        <Alert severity="info">Select a scenario to see real-time queue statistics.</Alert>
      ) : (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Completed</Typography>
                <Typography variant="h6">{completedSimulations} / {totalSimulations || '—'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Active workers</Typography>
                <Typography variant="h6">{queueMetrics.activeWorkers} / {queueMetrics.batchSize}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">In queue</Typography>
                <Typography variant="h6">{queueMetrics.queueVariants}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {showDetailToggle && (
            <Button
              size="small"
              variant="text"
              startIcon={showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              onClick={onToggleDetails}
              sx={{ alignSelf: 'flex-start' }}
            >
              {showDetails ? 'Hide detailed metrics' : 'Show detailed metrics'}
            </Button>
          )}

          <Collapse in={showDetails && showDetailToggle} timeout="auto" unmountOnExit>
            <Stack spacing={2}>
              <Typography variant="caption" color="text.secondary">
                {queueMetrics.workerStatusLabel}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" color={queueMetrics.remainingVariants ? 'primary' : 'default'} label={queueMetrics.runningLabel} />
                <Chip size="small" color={queueMetrics.queueVariants ? 'secondary' : 'default'} label={queueMetrics.queueLabel} />
                <Chip size="small" color={queueMetrics.remainingVariants ? 'warning' : 'default'} label={`Remaining ${queueMetrics.remainingVariants}`} />
                {queueMetrics.idleWorkers > 0 && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${queueMetrics.idleWorkers} idle worker${queueMetrics.idleWorkers === 1 ? '' : 's'}`}
                  />
                )}
              </Stack>
              <LinearProgress variant="determinate" value={queueMetrics.batchProgress} sx={{ height: 6, borderRadius: 3 }} />
              <Typography variant="caption" color="text.secondary">
                {queueMetrics.remainingVariants > 0
                  ? queueMetrics.nextQueuedVariant
                    ? `Next up: variant #${queueMetrics.nextQueuedVariant}. ${queueMetrics.queueVariants} waiting.`
                    : queueMetrics.idleWorkers > 0
                      ? `${queueMetrics.activeWorkers} worker${queueMetrics.activeWorkers === 1 ? '' : 's'} running, ${queueMetrics.idleWorkers} idle. No queue.`
                      : 'All available workers are busy.'
                  : queueMetrics.idleWorkers === queueMetrics.batchSize
                    ? 'Queue empty — all workers idle and ready.'
                    : 'Queue empty — awaiting new tasks.'}
              </Typography>
            </Stack>
          </Collapse>

          {!isRunning && !isPaused && !isComplete && (
            <Typography variant="body2" color="text.secondary">
              Start a batch to populate live queue metrics.
            </Typography>
          )}
        </Stack>
      )}
    </SectionCard>
  );
};

export default QueueOverviewSection;
