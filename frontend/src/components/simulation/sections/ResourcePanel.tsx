import React from 'react';
import {
  Alert,
  Box,
  Chip,
  Collapse,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import SectionCard from '../SectionCard';
import CoreLaneView from '../CoreLaneView';

export type SummaryMetric = {
  key: string;
  label: string;
  icon: ReactNode;
  value: string;
  detail: string;
};

export type ResourceHistoryDatum = {
  index: number;
  value: number;
  time: string;
};

export type ResourceSnapshot = {
  cpu?: {
    usage_percent?: number;
    physical_cores?: number;
    logical_cores?: number;
  };
  memory?: {
    total_gb?: number;
    available_gb?: number;
    usage_percent?: number;
  };
  disk?: {
    total_gb?: number;
    free_gb?: number;
    usage_percent?: number;
  };
  network?: {
    bytes_sent_per_sec?: number;
    bytes_recv_per_sec?: number;
  };
  received_at?: string;
};

export type ResourcePanelProps = {
  backendAvailable: boolean;
  wsConnected: boolean;
  monitorStale: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
  metrics: SummaryMetric[];
  resourceStats: ResourceSnapshot | null;
  cpuHistory: ResourceHistoryDatum[];
  memoryHistory: ResourceHistoryDatum[];
  diskHistory: ResourceHistoryDatum[];
  networkHistory: ResourceHistoryDatum[];
  maxHistoryPoints: number;
  totalSimulations: number;
  cpuLogical: number;
  completedSimulations: number;
  progress: number;
};

const ResourcePanel: React.FC<ResourcePanelProps> = ({
  backendAvailable,
  wsConnected,
  monitorStale,
  showDetails,
  onToggleDetails,
  metrics,
  resourceStats,
  cpuHistory,
  memoryHistory,
  diskHistory,
  networkHistory,
  maxHistoryPoints,
  totalSimulations,
  cpuLogical,
  completedSimulations,
  progress,
}) => (
  <SectionCard
    title="Live System Health"
    subtitle="Resource telemetry from the simulation host"
    actions={
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          size="small"
          label={backendAvailable ? 'Backend online' : 'Backend offline'}
          color={backendAvailable ? 'success' : 'error'}
          variant={backendAvailable ? 'filled' : 'outlined'}
        />
        <Chip
          size="small"
          label={wsConnected ? 'WebSocket live' : 'Polling'}
          color={wsConnected ? 'primary' : 'warning'}
          variant={monitorStale ? 'outlined' : 'filled'}
        />
        <Tooltip title={showDetails ? 'Hide detailed telemetry' : 'Show detailed telemetry'}>
          <IconButton
            size="small"
            onClick={onToggleDetails}
            aria-label={showDetails ? 'Hide detailed telemetry' : 'Show detailed telemetry'}
          >
            {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
        </Tooltip>
      </Stack>
    }
  >
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {metrics.map(({ key, label, icon, value, detail }) => (
          <Grid item xs={12} sm={6} key={key}>
            <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {icon}
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
              </Stack>
              <Typography variant="h6">{value}</Typography>
              <Typography variant="caption" color="text.secondary">
                {detail}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {monitorStale && (
        <Alert severity="warning">Resource monitoring appears stale or disconnected.</Alert>
      )}

      <Collapse in={showDetails} timeout="auto" unmountOnExit>
        <Stack spacing={2}>
          {resourceStats ? (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Simulation assignment
                </Typography>
                <Paper variant="outlined" sx={{ p: 1, mt: 1 }}>
                  <CoreLaneView
                    totalSimulations={totalSimulations}
                    cpuCores={cpuLogical}
                    completedSimulations={completedSimulations}
                    progress={progress}
                    maxSegments={160}
                    width={900}
                    height={320}
                  />
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Usage history (last {maxHistoryPoints} samples)
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={cpuHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} tick={false} />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                          <RechartsTooltip
                            formatter={(value) => [`${value}%`, 'CPU']}
                            labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                          />
                          <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={memoryHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} tick={false} />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                          <RechartsTooltip
                            formatter={(value) => [`${value}%`, 'Memory']}
                            labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                          />
                          <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={diskHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} tick={false} />
                          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10 }} />
                          <RechartsTooltip
                            formatter={(value) => [`${value}%`, 'Disk']}
                            labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                          />
                          <Line type="monotone" dataKey="value" stroke="#ffb74d" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={networkHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="index" type="number" domain={['dataMin', 'dataMax']} tick={false} />
                          <YAxis tickFormatter={(value) => `${value} KB/s`} tick={{ fontSize: 10 }} />
                          <RechartsTooltip
                            formatter={(value) => [`${value} KB/s`, 'Throughput']}
                            labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                          />
                          <Line type="monotone" dataKey="value" stroke="#64b5f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </>
          ) : (
            <Alert severity="info">Waiting for the backend to stream system metrics…</Alert>
          )}
        </Stack>
      </Collapse>
    </Stack>
  </SectionCard>
);

export default ResourcePanel;
