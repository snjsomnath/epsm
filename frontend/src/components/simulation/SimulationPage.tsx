import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { authenticatedFetch } from '../../lib/auth-api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Chip,
  Collapse,
  Divider,
  Tooltip,
  Snackbar,
  Skeleton,
  CircularProgress
} from '@mui/material';
import { 
  Play, 
  Pause, 
  StopCircle, 
  Cpu, 
  Clock, 
  BarChart3, 
  Info,
  FileText,
  Upload,
  Check,
  Star,
  StarOff,
  Pin,
  PinOff,
  History,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
// history-related icons removed; history UI moved to Baseline page
import SimulationResultsView from './SimulationResultsView';
import { useDatabase } from '../../context/DatabaseContext';
import { useSimulation } from '../../context/SimulationContext';
import ReconnectingWebSocket from 'reconnecting-websocket';
import {
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material';
import type { AlertColor } from '@mui/material/Alert';
import IdfUploadArea from '../baseline/IdfUploadArea';
import CoreLaneView from './CoreLaneView';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor;
};

type SectionCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, actions, children, sx }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...(sx || {}) }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: subtitle ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
    </CardContent>
  </Card>
);

const SimulationPage = () => {
  const theme = useTheme();
  const { scenarios } = useDatabase();
  const {
    uploadedFiles,
    parsedData,
    weatherFile,
    setWeatherFile,
    updateUploadedFiles,
    loadResults: loadResultsFromHistory,
    lastResults,
    cacheLastResults,
    addToHistory,
    history = [],
    clearHistory,
    togglePin,
    toggleFavorite,
    removeHistoryEntry,
    activeRun,
    setActiveRun,
    updateActiveRun,
    clearActiveRun,
  } = useSimulation();
  // Add local state to track files for immediate UI feedback
  const [localIdfFiles, setLocalIdfFiles] = useState<File[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSimulations, setCompletedSimulations] = useState(0);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<any[]>(() => lastResults || []);
  const [error, setError] = useState<string | null>(null);
  const [resourceStats, setResourceStats] = useState<any>(null);
  const [showResourceDetails, setShowResourceDetails] = useState(false);
  const [lastResourceAt, setLastResourceAt] = useState<number | null>(null);
  const [monitorStale, setMonitorStale] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'info' });
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  // Replace timestamp-based history with index-based to prevent shifting
  const [cpuHistory, setCpuHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [memoryHistory, setMemoryHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [diskHistory, setDiskHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [networkHistory, setNetworkHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const MAX_HISTORY_POINTS = 60; // Store last 60 data points
  const [historyIndex, setHistoryIndex] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(activeRun?.simulationId ?? null);

  const totalSimulationsRef = useRef(totalSimulations);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressWsRef = useRef<WebSocket | null>(null);
  const monitorStopRef = useRef(false);
  const lastProgressRef = useRef(0);
  const lastFetchProgressRef = useRef(0);
  const resultsCountRef = useRef(Array.isArray(results) ? results.length : 0);
  const progressRef = useRef(progress);
  const resumeAttemptedRef = useRef(false);
  const completionHandledRef = useRef(false);

  useEffect(() => {
    totalSimulationsRef.current = totalSimulations;
  }, [totalSimulations]);

  useEffect(() => {
    resultsCountRef.current = Array.isArray(results) ? results.length : 0;
  }, [results]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const openSnackbar = useCallback((message: string, severity: AlertColor = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const reportError = useCallback((message: string) => {
    setError(message);
    openSnackbar(message, 'error');
  }, [openSnackbar]);

  const stopMonitoring = useCallback(() => {
    monitorStopRef.current = true;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (progressWsRef.current) {
      try {
        progressWsRef.current.close();
      } catch (e) {
        // ignore close errors
      }
      progressWsRef.current = null;
    }
  }, []);

  const fetchSimulationResults = useCallback(
    async (simulationId: string, { force = false }: { force?: boolean } = {}) => {
      if (!backendAvailable || !simulationId) {
        return;
      }
      try {
        const response = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
        if (response.status === 202) {
          return;
        }
        if (!response.ok) {
          if (force) {
            console.warn('Failed to fetch simulation results', response.status, response.statusText);
          }
          return;
        }
        const data = await response.json();
        const resultsArray = Array.isArray(data) ? data : [data];
        setResults(resultsArray);
        resultsCountRef.current = resultsArray.length;
        cacheLastResults?.(resultsArray);

        const total = Math.max(totalSimulationsRef.current || 0, resultsArray.length);
        if (total > 0) {
          const computedProgress = Math.min(100, Math.round((resultsArray.length / total) * 100));
          if (computedProgress > progressRef.current) {
            setProgress(computedProgress);
            progressRef.current = computedProgress;
          }
        }
        setCompletedSimulations(prev => Math.max(prev, resultsArray.length));
        updateActiveRun?.({
          completedSimulations: resultsArray.length,
          progress: progressRef.current,
          totalSimulations: totalSimulationsRef.current || total,
        });
        lastFetchProgressRef.current = progressRef.current;
      } catch (err) {
        if (force) {
          console.error('Error fetching simulation results', err);
        }
      }
    },
    [backendAvailable, cacheLastResults, updateActiveRun, authenticatedFetch]
  );

  const finalizeSimulation = useCallback(
    async (simulationId: string) => {
      if (completionHandledRef.current) return;
      completionHandledRef.current = true;
      await fetchSimulationResults(simulationId, { force: true });
      stopMonitoring();
      setIsComplete(true);
      setIsRunning(false);
      setIsPaused(false);
      updateActiveRun?.({
        status: 'completed',
        progress: 100,
        completedSimulations: totalSimulationsRef.current || resultsCountRef.current,
      });
      clearActiveRun?.();
      setCurrentSimulationId(null);
      try {
        addToHistory?.(String(simulationId), `Run ${simulationId}`);
      } catch (e) {
        // ignore history errors
      }
    },
    [fetchSimulationResults, stopMonitoring, updateActiveRun, clearActiveRun, addToHistory]
  );

  const handleSimulationFailure = useCallback(
    (_simulationId: string, message?: string) => {
      if (completionHandledRef.current) return;
      completionHandledRef.current = true;
      stopMonitoring();
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(true);
      reportError(message || 'Simulation failed');
      updateActiveRun?.({ status: 'failed', progress: progressRef.current });
      clearActiveRun?.();
      setCurrentSimulationId(null);
    },
    [stopMonitoring, reportError, updateActiveRun, clearActiveRun]
  );

  const startMonitoring = useCallback(
    (simulationId: string, enableWebSocket: boolean = true) => {
      if (!backendAvailable || !simulationId) return;

      stopMonitoring();
      monitorStopRef.current = false;
      completionHandledRef.current = false;
      lastProgressRef.current = 0;
      lastFetchProgressRef.current = progressRef.current;

      const poll = async () => {
        if (monitorStopRef.current) return;
        try {
          const statusResponse = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/status/`);
          if (monitorStopRef.current) return;
          if (statusResponse.status === 429) return;
          if (!statusResponse.ok) {
            console.warn('Status poll failed', statusResponse.status, statusResponse.statusText);
            return;
          }
          const statusData = await statusResponse.json();
          const progressValue = Number(statusData.progress ?? 0);
          lastProgressRef.current = progressValue;
          progressRef.current = progressValue;
          setProgress(progressValue);

          const estimatedCompleted = Math.max(
            resultsCountRef.current,
            Math.floor(((totalSimulationsRef.current || 0) * progressValue) / 100)
          );
          setCompletedSimulations(estimatedCompleted);

          const nextStatus = statusData.status === 'failed' ? 'failed' : 'running';
          updateActiveRun?.({
            status: nextStatus,
            progress: progressValue,
            completedSimulations: estimatedCompleted,
            totalSimulations: totalSimulationsRef.current || undefined,
          });

          if (statusData.status === 'completed') {
            await finalizeSimulation(simulationId);
            return;
          }

          if (statusData.status === 'failed') {
            handleSimulationFailure(simulationId, statusData.error || statusData.error_message);
            return;
          }

          if (
            progressValue - lastFetchProgressRef.current >= 1 ||
            estimatedCompleted > resultsCountRef.current
          ) {
            await fetchSimulationResults(simulationId);
          }
        } catch (err) {
          console.error('Error while polling simulation status', err);
        }
      };

      poll();
      pollTimerRef.current = setInterval(poll, 2000);

      if (!enableWebSocket) {
        return;
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const hostnameFallback = window.location.hostname || 'localhost';
      const candidateUrls = [
        `${wsProtocol}://${host}/ws/simulation-progress/${simulationId}/`,
        `${wsProtocol}://${hostnameFallback}:8000/ws/simulation-progress/${simulationId}/`,
      ];

      const connect = (index: number) => {
        if (index >= candidateUrls.length || monitorStopRef.current) {
          return;
        }
        try {
          const socket = new WebSocket(candidateUrls[index]);
          progressWsRef.current = socket;

          socket.onopen = () => {
            console.log('Connected to simulation progress WebSocket for', simulationId, 'via', candidateUrls[index]);
          };

          socket.onmessage = async (event: MessageEvent) => {
            if (monitorStopRef.current) return;
            try {
              const data = JSON.parse(event.data as string);
              if (typeof data.progress !== 'undefined') {
                const pct = Number(data.progress);
                progressRef.current = pct;
                lastProgressRef.current = pct;
                setProgress(pct);
                const estimatedCompleted = Math.max(
                  resultsCountRef.current,
                  Math.floor(((totalSimulationsRef.current || 0) * pct) / 100)
                );
                setCompletedSimulations(estimatedCompleted);
                updateActiveRun?.({
                  progress: pct,
                  completedSimulations: estimatedCompleted,
                  totalSimulations: totalSimulationsRef.current || undefined,
                });
                if (
                  pct - lastFetchProgressRef.current >= 1 ||
                  estimatedCompleted > resultsCountRef.current
                ) {
                  await fetchSimulationResults(simulationId);
                }
              }
              if (data.status === 'completed') {
                await finalizeSimulation(simulationId);
              } else if (data.status === 'failed') {
                handleSimulationFailure(simulationId, data.error || data.error_message);
              }
            } catch (err) {
              console.warn('Malformed progress WS message', err);
            }
          };

          socket.onerror = () => {
            if (progressWsRef.current === socket) {
              progressWsRef.current = null;
            }
            if (!monitorStopRef.current) {
              connect(index + 1);
            }
          };

          socket.onclose = () => {
            if (progressWsRef.current === socket) {
              progressWsRef.current = null;
            }
            if (!monitorStopRef.current) {
              connect(index + 1);
            }
          };
        } catch (err) {
          console.warn('Failed to open progress WebSocket', err);
          connect(index + 1);
        }
      };

      connect(0);
    },
    [
      backendAvailable,
      stopMonitoring,
      fetchSimulationResults,
      finalizeSimulation,
      handleSimulationFailure,
      updateActiveRun,
      authenticatedFetch,
    ]
  );

  // Cleanup effect for stopMonitoring
  useEffect(() => () => {
    stopMonitoring();
  }, [stopMonitoring]);

  // Resume active run on mount
  useEffect(() => {
    if (!activeRun) {
      resumeAttemptedRef.current = false;
      return;
    }
    if (!backendAvailable) {
      return;
    }
    if (activeRun.status === 'completed' || activeRun.status === 'failed') {
      return;
    }
    if (resumeAttemptedRef.current && currentSimulationId === activeRun.simulationId) {
      return;
    }
    resumeAttemptedRef.current = true;
    if (activeRun.scenarioId) {
      setSelectedScenario(activeRun.scenarioId);
    }
    setCurrentSimulationId(activeRun.simulationId);
    // Check status safely - activeRun.status might not include 'completed'
    setIsComplete(false);
    setIsRunning(activeRun.status === 'running');
    setIsPaused(activeRun.status === 'paused');
    if (typeof activeRun.progress === 'number') {
      setProgress(activeRun.progress);
      progressRef.current = activeRun.progress;
    }
    if (typeof activeRun.completedSimulations === 'number') {
      setCompletedSimulations(activeRun.completedSimulations);
      resultsCountRef.current = Math.max(resultsCountRef.current, activeRun.completedSimulations);
    }
    if (activeRun.totalSimulations) {
      setTotalSimulations(activeRun.totalSimulations);
    }
    fetchSimulationResults(activeRun.simulationId, { force: true });
    startMonitoring(activeRun.simulationId, true);
  }, [activeRun, fetchSimulationResults, startMonitoring, currentSimulationId, backendAvailable]);

  // Check backend availability
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await authenticatedFetch('http://localhost:8000/api/simulation/system-resources/');
        setBackendAvailable(!!(response && response.ok));
      } catch (err) {
        console.warn('Backend not available:', err);
        setBackendAvailable(false);
      }
    };
    checkBackend();
  }, []);

  // WebSocket connection for resource monitoring
  useEffect(() => {
    if (!backendAvailable) return;

    // Always use backend port (8000) for WebSocket, not window.location.port
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = window.location.hostname || 'localhost';
    const wsPort = '8000'; // <-- hardcoded backend port
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/ws/system-resources/`;

  // Clear any previous errors
  setWsError(null);
  setWsConnected(false);

    const ws = new ReconnectingWebSocket(wsUrl);

    // Keep last raw message to avoid redundant state updates
    const lastMsgRef = { current: '' } as { current: string };

    ws.onopen = () => {
      setWsConnected(true);
      setWsError(null);
    };

    ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);

        // Deduplicate identical consecutive messages
        const rawStr = JSON.stringify(raw);
        if (rawStr === lastMsgRef.current) return;
        lastMsgRef.current = rawStr;

        // Normalize numeric fields
        const cpu = raw.cpu ? {
          usage_percent: clampPercent(raw.cpu.usage_percent),
          physical_cores: toNumber(raw.cpu.physical_cores),
          logical_cores: toNumber(raw.cpu.logical_cores),
        } : undefined;

        const memory = raw.memory ? {
          total_gb: toNumber(raw.memory.total_gb),
          available_gb: toNumber(raw.memory.available_gb),
          usage_percent: clampPercent(raw.memory.usage_percent),
        } : undefined;

        const disk = raw.disk ? {
          total_gb: toNumber(raw.disk.total_gb),
          free_gb: toNumber(raw.disk.free_gb),
          usage_percent: clampPercent(raw.disk.usage_percent),
        } : undefined;

        const network = raw.network ? {
          bytes_sent_per_sec: toNumber(raw.network.bytes_sent_per_sec),
          bytes_recv_per_sec: toNumber(raw.network.bytes_recv_per_sec),
        } : undefined;

        const normalized = {
          cpu, memory, disk, network, received_at: new Date().toISOString()
        };

        // Only accept updates that contain at least one resource block
        if (!(cpu || memory || disk || network)) return;

  // Update latest snapshot
  setResourceStats(normalized);
  setLastResourceAt(Date.now());

        // Update histories using a single functional update to historyIndex
        setHistoryIndex(prevIndex => {
          const next = prevIndex + 1;
          const timeLabel = new Date().toLocaleTimeString();

          if (cpu) {
            setCpuHistory(prev => {
              const newData = [...prev, { index: next, value: cpu.usage_percent || 0, time: timeLabel }];
              return newData.slice(-MAX_HISTORY_POINTS);
            });
          }

          if (memory) {
            setMemoryHistory(prev => {
              const newData = [...prev, { index: next, value: memory.usage_percent || 0, time: timeLabel }];
              return newData.slice(-MAX_HISTORY_POINTS);
            });
          }

          if (disk) {
            setDiskHistory(prev => {
              const newData = [...prev, { index: next, value: disk.usage_percent || 0, time: timeLabel }];
              return newData.slice(-MAX_HISTORY_POINTS);
            });
          }

          if (network) {
            const netVal = network.bytes_sent_per_sec || network.bytes_recv_per_sec ? Math.round((network.bytes_sent_per_sec + network.bytes_recv_per_sec) / 1024) : 0;
            setNetworkHistory(prev => {
              const newData = [...prev, { index: next, value: netVal, time: timeLabel }];
              return newData.slice(-MAX_HISTORY_POINTS);
            });
          }

          return next;
        });

      } catch (e) {
        setWsError('Received malformed monitoring data');
      }
    };

    ws.onerror = (_error) => {
      setWsConnected(false);
      setWsError("Failed to connect to system monitoring service");
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [backendAvailable]);

  // Mark monitoring as stale if we haven't received an update recently
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastResourceAt) {
        setMonitorStale(true);
        return;
      }
      const age = Date.now() - lastResourceAt;
      setMonitorStale(age > 5000); // stale if older than 5s
    }, 2000);
    return () => clearInterval(interval);
  }, [lastResourceAt]);


  // Helpers to normalize and format resource numbers
  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const clampPercent = (v: any) => {
    const n = toNumber(v);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
  };

  // Compute suggested resource allocations for the dialog (avoid hardcoded values)
  const cpuPhysical = resourceStats?.cpu?.physical_cores ?? resourceStats?.cpu?.logical_cores ?? (navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 2) : 4);
  const cpuLogical = resourceStats?.cpu?.logical_cores ?? navigator.hardwareConcurrency ?? cpuPhysical;
  // Suggest parallel workers: leave 1 core for system; at least 1, cap to a reasonable upper bound
  const suggestedParallel = Math.max(1, Math.min( Math.max(1, (cpuLogical - 1)), 32));
  // Estimate memory usage: prefer available_gb if present, otherwise assume half of total
  const availableMem = toNumber(resourceStats?.memory?.available_gb);
  const totalMem = toNumber(resourceStats?.memory?.total_gb);
  const estMemGb = availableMem > 0 ? Math.max(1, Math.round(availableMem)) : (totalMem > 0 ? Math.max(1, Math.round(totalMem / 2)) : 4);

  // Celery worker pool size - typically configured in docker-compose or settings
  // Default to 4 workers per container, can be increased for production
  const CELERY_WORKER_POOL_SIZE = 4;

  // Celery queue metrics calculation
  const queueMetrics = useMemo(() => {
    const batchSize = backendAvailable ? CELERY_WORKER_POOL_SIZE : suggestedParallel;
    const totalBatches = totalSimulations ? Math.ceil(totalSimulations / batchSize) : 0;
    const completedBatchesRaw = totalSimulations ? completedSimulations / batchSize : 0;
    const completedBatches = Math.min(totalBatches, Math.floor(completedBatchesRaw));
    const remainingVariants = Math.max(totalSimulations - completedSimulations, 0);
    const activeWorkers = Math.min(batchSize, remainingVariants);
    const activeStart = remainingVariants > 0 ? completedSimulations + 1 : null;
    const activeEnd = remainingVariants > 0 ? Math.min(completedSimulations + activeWorkers, totalSimulations) : null;
    const queueVariants = Math.max(0, remainingVariants - activeWorkers);
    const queuedBatches = queueVariants > 0 ? Math.ceil(queueVariants / batchSize) : 0;
    const batchProgress = totalBatches ? Math.min(100, (completedBatchesRaw / totalBatches) * 100) : 0;
    const nextQueuedVariant = remainingVariants > activeWorkers ? completedSimulations + activeWorkers + 1 : null;
    const idleWorkers = Math.max(batchSize - activeWorkers, 0);
    const runningLabel = remainingVariants
      ? activeStart !== null && activeEnd !== null && activeStart !== activeEnd
        ? `Running variants #${activeStart}-${activeEnd}`
        : `Running variant #${activeStart ?? activeEnd}`
      : 'No variants in flight';
    const queueLabel = queueVariants
      ? `Queue ${queueVariants}${queuedBatches ? ` (${queuedBatches} batch${queuedBatches === 1 ? '' : 'es'})` : ''}`
      : 'Queue empty';
    const workerStatusLabel = [
      `${activeWorkers}/${batchSize} worker${activeWorkers === 1 ? '' : 's'} busy`,
      idleWorkers ? `${idleWorkers} idle` : null,
      queueVariants ? `${queuedBatches} batch${queuedBatches === 1 ? '' : 'es'} queued` : null,
    ]
      .filter(Boolean)
      .join(' • ');

    return {
      batchSize,
      totalBatches,
      completedBatches,
      remainingVariants,
      activeWorkers,
      activeStart,
      activeEnd,
      queueVariants,
      queuedBatches,
      batchProgress,
      nextQueuedVariant,
      idleWorkers,
      runningLabel,
      queueLabel,
      workerStatusLabel,
      hasScenario: !!selectedScenario || !!currentSimulationId,
    };
  }, [totalSimulations, completedSimulations, backendAvailable, selectedScenario, currentSimulationId]);

  // Dynamically update totalSimulations based on IDFs and construction variants
  useEffect(() => {
    // Try to get number of variants from parsedData or scenario
    let numVariants = 1;
    if (parsedData && (parsedData as any).constructionVariants) {
      numVariants = (parsedData as any).constructionVariants.length;
    } else if (selectedScenario) {
      const scenario = scenarios.find(s => s.id === selectedScenario);
      // Use total_simulations instead of total_variants
      numVariants = scenario?.total_simulations || 1;
    }
    
    // Use localIdfFiles.length when it's available, otherwise fall back to uploadedFiles.length
    const fileCount = localIdfFiles.length > 0 ? localIdfFiles.length : uploadedFiles.length;
    setTotalSimulations(fileCount * numVariants);
  }, [uploadedFiles, localIdfFiles, parsedData, selectedScenario, scenarios]);

  // Fix: Reset isComplete and results on scenario or file change
  useEffect(() => {
    if (currentSimulationId) {
      return;
    }
    setIsComplete(false);
    setResults([]);
    setProgress(0);
    setCompletedSimulations(0);
    setIsRunning(false);
    setIsPaused(false);
  }, [selectedScenario, uploadedFiles, weatherFile, currentSimulationId]);

  // Update resource stats history when new data arrives - ONLY when we have valid data
  useEffect(() => {
    if (!resourceStats || !resourceStats.cpu) return;
    
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    setHistoryIndex(prev => prev + 1);
    
    // Update CPU history safely
    setCpuHistory(prev => {
      const newData = [...prev, {
        index: historyIndex, 
        value: resourceStats.cpu?.usage_percent || 0,
        time: timestamp
      }];
      return newData.slice(-MAX_HISTORY_POINTS);
    });
    
    // Update memory history safely
    setMemoryHistory(prev => {
      const newData = [...prev, {
        index: historyIndex, 
        value: resourceStats.memory?.usage_percent || 0,
        time: timestamp
      }];
      return newData.slice(-MAX_HISTORY_POINTS);
    });
    
    // Only add disk history if disk data is available
    if (resourceStats.disk) {
      setDiskHistory(prev => {
        const newData = [...prev, {
          index: historyIndex, 
          value: resourceStats.disk.usage_percent || 0,
          time: timestamp
        }];
        return newData.slice(-MAX_HISTORY_POINTS);
      });
    }
    
    // Only add network history if network data is available
    if (resourceStats.network) {
      setNetworkHistory(prev => {
        const networkValue = resourceStats.network.bytes_sent_per_sec 
          ? Math.round((resourceStats.network.bytes_sent_per_sec + resourceStats.network.bytes_recv_per_sec) / 1024)
          : 0;
        const newData = [...prev, {
          index: historyIndex, 
          value: networkValue,
          time: timestamp
        }];
        return newData.slice(-MAX_HISTORY_POINTS);
      });
    }
  }, [resourceStats, historyIndex]);

  const handleScenarioChange = (event: any) => {
    const scenarioId = event.target.value;
    if (currentSimulationId && (isRunning || isPaused)) {
        openSnackbar('Simulation in progress. Stop it before switching scenarios.', 'warning');
        return;
    }
    setSelectedScenario(scenarioId);
    
    // Remove the direct setting of totalSimulations
    // Let the useEffect handle calculating totalSimulations based on
    // the selected scenario and current files
    
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCompletedSimulations(0);
    setIsComplete(false);
    setResults([]);
  };

  const handleStartSimulation = async () => {
    const filesAvailable = localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles;

    if (filesAvailable.length === 0 || !weatherFile) {
      setUploadDialogOpen(true);
      return;
    }

    if (!backendAvailable) {
      stopMonitoring();
      const fallbackId = currentSimulationId ?? `dev-${Date.now()}`;
      setCurrentSimulationId(fallbackId);
      setActiveRun?.({
        simulationId: fallbackId,
        scenarioId: selectedScenario || undefined,
        status: 'running',
        startedAt: Date.now(),
        totalSimulations: totalSimulationsRef.current || totalSimulations || filesAvailable.length,
        completedSimulations: 0,
        progress: 0,
      });
      resumeAttemptedRef.current = true;
      simulateDummyProgress();
      return;
    }

    try {
      stopMonitoring();
      setError(null);
      setResults([]);
      setIsRunning(true);
      setIsComplete(false);
      setIsPaused(false);
      setProgress(0);
      setCompletedSimulations(0);
      resultsCountRef.current = 0;
      lastFetchProgressRef.current = 0;
      progressRef.current = 0;

      const formData = new FormData();
      filesAvailable.forEach(file => {
        formData.append('idf_files', file);
      });
      formData.append('weather_file', weatherFile);
      if (selectedScenario) {
        formData.append('scenario_id', selectedScenario);
      }
      formData.append('parallel', 'true');
      formData.append('batch_mode', 'true');

      const response = await authenticatedFetch('http://localhost:8000/api/simulation/run/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const simulationId = data.simulation_id;
      setCurrentSimulationId(simulationId);
      setActiveRun?.({
        simulationId,
        scenarioId: selectedScenario || undefined,
        status: 'running',
        startedAt: Date.now(),
        totalSimulations: totalSimulationsRef.current || totalSimulations || filesAvailable.length,
        completedSimulations: 0,
        progress: 0,
      });
      resumeAttemptedRef.current = true;
      openSnackbar('Simulation dispatched to Celery workers', 'info');
      startMonitoring(simulationId, true);
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed to run simulation');
      setIsRunning(false);
      clearActiveRun?.();
      setCurrentSimulationId(null);
    }
  };
;

  const simulateDummyProgress = () => {
    const totalEstimate = totalSimulationsRef.current || totalSimulations || localIdfFiles.length || uploadedFiles.length || 1;
    setIsRunning(true);
    setProgress(0);
    setCompletedSimulations(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 5;
        updateActiveRun?.({ progress: Math.min(100, next), status: 'running', totalSimulations: totalEstimate });
        if (next >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setIsRunning(false);
          setResults([
            {
              fileName: 'simulation_1.idf',
              totalEnergyUse: 150.5,
              heatingDemand: 80.2,
              coolingDemand: 45.3,
              runTime: 12.5
            },
          ]);
          updateActiveRun?.({ status: 'completed', progress: 100, completedSimulations: totalEstimate, totalSimulations: totalEstimate });
          clearActiveRun?.();
          openSnackbar('Simulation completed with mock data', 'success');
          return 100;
        }
        const estimatedCompleted = Math.min(totalEstimate, Math.floor((next / 100) * totalEstimate));
        setCompletedSimulations(estimatedCompleted);
        return next;
      });
    }, 500);
  };

  const handlePauseSimulation = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  const handleResumeSimulation = () => {
    setIsPaused(false);
    setIsRunning(true);
  };

  const handleStopSimulation = () => {
    stopMonitoring();
    setIsRunning(false);
    setIsPaused(false);
    updateActiveRun?.({ status: 'failed' });
    clearActiveRun?.();
    setCurrentSimulationId(null);
    openSnackbar('Monitoring stopped. Currently queued tasks will continue on the server.', 'warning');
  };

  // Replace the handleIdfFilesSelected with a new version that updates both context and local state
  const handleIdfFilesSelected = (files: File[]) => {
    console.log(`Selected ${files.length} IDF files`);
    
    // Update local state immediately for UI feedback
    setLocalIdfFiles(files);
    
    try {
      // Update the context with the new files (not as a function)
      if (typeof updateUploadedFiles === 'function') {
        updateUploadedFiles(files);
        console.log('Updated files through context:', files);
      } else {
        console.warn('updateUploadedFiles function not found in context');
      }
    } catch (error) {
      console.error('Error processing IDF files:', error);
    }
  };

  // Add a useEffect to monitor uploadedFiles changes
  useEffect(() => {
    console.log('uploadedFiles state changed:', uploadedFiles);
  }, [uploadedFiles]);

  // Persist results to simulation context/localStorage so they survive tab switches
  useEffect(() => {
    if (typeof cacheLastResults === 'function') {
      try { cacheLastResults(results); } catch (e) { console.warn('cacheLastResults failed', e); }
    }
  }, [results, cacheLastResults]);

  // Add a useEffect to monitor weatherFile changes
  useEffect(() => {
    console.log('weatherFile state changed:', weatherFile);
  }, [weatherFile]);

  // Improve the EPW file upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('EPW file selected:', files[0].name);
      if (files[0].name.toLowerCase().endsWith('.epw')) {
        setWeatherFile(files[0]);
      } else {
        console.warn('Invalid file type. Please select an EPW file.');
        // Optionally show an error message to the user
      }
    }
  };
  
  // Add a function to handle EPW file drag & drop
  const [isDragging, setIsDragging] = useState(false);
  
  const handleEpwDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleEpwDragLeave = () => {
    setIsDragging(false);
  };

  const handleEpwDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.epw')) {
      setWeatherFile(files[0]);
    }
  };

  const handleRecallHistory = useCallback(async (simulationId: string) => {
    if (!simulationId || typeof loadResultsFromHistory !== 'function') {
      reportError('Unable to load saved run');
      return;
    }
    setHistoryLoading(simulationId);
    try {
      const data = await loadResultsFromHistory(simulationId);
      if (!data) {
        reportError('No results found for this simulation');
        return;
      }
      const normalized = Array.isArray(data) ? data : [data];
      setResults(normalized);
      setIsComplete(true);
      setIsRunning(false);
      setIsPaused(false);
      setProgress(100);
      setCompletedSimulations(normalized.length);
      openSnackbar('Loaded results from recent run', 'success');
    } catch (e) {
      reportError('Failed to load results from history');
    } finally {
      setHistoryLoading(null);
    }
  }, [loadResultsFromHistory, reportError, openSnackbar]);

  const historyItems = useMemo(() => (history || []).slice(0, 6), [history]);

  const formatTimestamp = useCallback((ts: number) => {
    try {
      return new Date(ts).toLocaleString();
    } catch (e) {
      return '';
    }
  }, []);

  const renderSimulationSetup = () => (
    <SectionCard
      title="Simulation Setup"
      subtitle="Upload IDF/EPW files, choose a scenario, and control the batch run"
    >
      {scenarios.length === 0 ? (
        <Alert severity="info">
          No scenarios available. Create a scenario first on the Scenario Setup page.
        </Alert>
      ) : (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Select Scenario</InputLabel>
          <Select
            value={selectedScenario}
            label="Select Scenario"
            onChange={handleScenarioChange}
            disabled={isRunning || isPaused}
          >
            <MenuItem value="">
              <em>Select a scenario</em>
            </MenuItem>
            {scenarios.map(scenario => (
              <MenuItem key={scenario.id} value={scenario.id}>
                {scenario.name} ({scenario.total_simulations} simulations)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={16} />
          Simulation Files
        </Typography>
        <Stack spacing={1}>
          {(localIdfFiles.length > 0 || uploadedFiles.length > 0) ? (
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>IDF Files ({localIdfFiles.length || uploadedFiles.length}):</strong>
              </Typography>
              <Stack spacing={0.5}>
                {(localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles).map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    color="primary"
                    variant="outlined"
                    size="small"
                    onDelete={() => {
                      const newFiles = (localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles).filter((_, i) => i !== index);
                      setLocalIdfFiles(newFiles);
                      if (typeof updateUploadedFiles === 'function') updateUploadedFiles(newFiles);
                    }}
                  />
                ))}
              </Stack>
            </Box>
          ) : (
            <Alert severity="info" icon={<Upload size={18} />}>
              No IDF files selected. Upload files to continue.
            </Alert>
          )}

          {weatherFile ? (
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Weather File:</strong>
              </Typography>
              <Chip
                label={weatherFile.name}
                color="secondary"
                variant="outlined"
                size="small"
                onDelete={() => setWeatherFile(null)}
              />
            </Box>
          ) : (
            <Alert severity="info" icon={<Upload size={18} />}>
              No weather file selected. Upload an EPW file to continue.
            </Alert>
          )}

          <Button
            variant="outlined"
            startIcon={<Upload size={18} />}
            onClick={() => setUploadDialogOpen(true)}
            fullWidth
          >
            {uploadedFiles.length === 0 && !weatherFile ? 'Upload Files' : 'Modify Files'}
          </Button>
        </Stack>
      </Box>

      {selectedScenario && (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info size={16} />
            Simulation Details
          </Typography>
          <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Description:
                </Typography>
                <Typography variant="body2">
                  {scenarios.find(s => s.id === selectedScenario)?.description || 'No description available'}
                </Typography>
              </Box>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Base IDF Files:
                  </Typography>
                  <Typography variant="h6">
                    {localIdfFiles.length > 0 ? localIdfFiles.length : uploadedFiles.length}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Construction Variants:
                  </Typography>
                  <Typography variant="h6">
                    {(() => {
                      const scenario = scenarios.find(s => s.id === selectedScenario);
                      return scenario?.total_simulations || 1;
                    })()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Total Simulations:
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {totalSimulations} simulations
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({localIdfFiles.length > 0 ? localIdfFiles.length : uploadedFiles.length} files × {(() => {
                      const scenario = scenarios.find(s => s.id === selectedScenario);
                      return scenario?.total_simulations || 1;
                    })()} variants)
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          </Box>

          {(isRunning || isPaused || isComplete) && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    Completed: {completedSimulations} of {totalSimulations}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Progress: {Math.round(progress)}%
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={isComplete ? 'Complete' : isPaused ? 'Paused' : 'Running'}
                  color={isComplete ? 'success' : isPaused ? 'warning' : 'primary'}
                  icon={isComplete ? <Check size={16} /> : isPaused ? <Pause size={16} /> : <Play size={16} />}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'background.default',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      <Stack spacing={2}>
        {!isRunning && !isPaused && !isComplete && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Play size={18} />}
            fullWidth
            onClick={() => setConfirmDialogOpen(true)}
          >
            Run Batch Simulation
          </Button>
        )}

        {(isRunning || isPaused) && !isComplete && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              {isPaused ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Play size={18} />}
                  onClick={handleResumeSimulation}
                >
                  Resume
                </Button>
              ) : backendAvailable ? (
                <Tooltip title="Pause/resume is coming soon for Celery batches.">
                  <span>
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<Pause size={18} />}
                      disabled
                    >
                      Pause
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Pause size={18} />}
                  onClick={handlePauseSimulation}
                  disabled={isPaused || progress >= 100}
                >
                  Pause
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                startIcon={<StopCircle size={18} />}
                onClick={handleStopSimulation}
              >
                Stop
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {backendAvailable
                ? 'Celery workers finish their current variant before stop takes effect.'
                : 'Pause and stop controls work immediately with the local dummy worker.'}
            </Typography>
          </Box>
        )}

        {!isRunning && !isPaused && !isComplete && (
          <Alert severity="info">
            Click "Run Batch Simulation" to start processing the selected scenario.
          </Alert>
        )}
      </Stack>

      {!selectedScenario && (
        <Alert severity="info">
          Select a scenario to run simulations.
        </Alert>
      )}
    </SectionCard>
  );

  const renderQueueOverview = () => (
    <SectionCard
      title="Queue & Worker Overview"
      subtitle={queueMetrics.hasScenario ? 'Track Celery worker utilisation and queue depth in real time' : 'Select a scenario to view queue statistics'}
      actions={selectedScenario ? (
        <Chip
          size="small"
          label={isComplete ? 'Complete' : isPaused ? 'Paused' : isRunning ? 'Running' : 'Idle'}
          color={isComplete ? 'success' : isPaused ? 'warning' : isRunning ? 'primary' : 'default'}
          variant={isRunning || isPaused || isComplete ? 'filled' : 'outlined'}
        />
      ) : undefined}
    >
      {!queueMetrics.hasScenario ? (
        <Alert severity="info">Select a scenario to see real-time queue statistics.</Alert>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
              <Typography variant="h5">{completedSimulations}</Typography>
              <Typography variant="caption" color="text.secondary">
                of {totalSimulations || '—'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Active Workers
              </Typography>
              <Typography variant="h5">{queueMetrics.activeWorkers}</Typography>
              <Typography variant="caption" color="text.secondary">
                of {queueMetrics.batchSize}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Waiting Variants
              </Typography>
              <Typography variant="h5">{queueMetrics.queueVariants}</Typography>
              <Typography variant="caption" color="text.secondary">
                {queueMetrics.queuedBatches ? `≈ ${queueMetrics.queuedBatches} batch${queueMetrics.queuedBatches === 1 ? '' : 'es'}` : 'Queue drains soon'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Remaining Variants
              </Typography>
              <Typography variant="h5">{queueMetrics.remainingVariants}</Typography>
              <Typography variant="caption" color="text.secondary">
                Progress {Math.round(progress)}%
              </Typography>
            </Grid>
          </Grid>

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
                ? `Queue spans ${queueMetrics.queueVariants} variant${queueMetrics.queueVariants === 1 ? '' : 's'} — next to dispatch #${queueMetrics.nextQueuedVariant}.`
                : 'All available workers are busy.'
              : queueMetrics.idleWorkers === queueMetrics.batchSize
                ? 'Queue empty — all workers idle and ready.'
                : 'Queue empty — awaiting new tasks.'}
          </Typography>

          {!isRunning && !isPaused && !isComplete && (
            <Typography variant="body2" color="text.secondary">
              Start a batch to populate live queue metrics.
            </Typography>
          )}
        </>
      )}
    </SectionCard>
  );

  const renderResultsSection = () => (
    <SectionCard
      title="Simulation Results"
      subtitle={isComplete ? 'Latest finished batch' : 'Results appear once the batch completes'}
      actions={isComplete ? (
        <Chip size="small" color="success" label="Ready" icon={<Check size={16} />} />
      ) : undefined}
    >
      {error && (
        <Alert severity="error">{error}</Alert>
      )}

      {isRunning && results.length === 0 && (
        <Stack spacing={2}>
          {[1, 2, 3].map(item => (
            <Skeleton key={item} variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
          ))}
          <Typography variant="caption" color="text.secondary">
            Crunching numbers… this updates automatically when results land.
          </Typography>
        </Stack>
      )}

      {isComplete && results.length > 0 && (
        <SimulationResultsView results={results} />
      )}

      {!isRunning && !isComplete && results.length > 0 && (
        <Alert severity="info">
          Showing cached results from your last completed run.
        </Alert>
      )}

      {!isRunning && !isComplete && results.length === 0 && (
        <Alert severity="info">
          Run a batch to view combined EnergyPlus outputs here.
        </Alert>
      )}
    </SectionCard>
  );

  const renderResourcePanel = () => {
    const metrics = [
      {
        key: 'cpu',
        label: 'CPU',
        icon: <Cpu size={18} color={theme.palette.primary.main} />,
        value: resourceStats?.cpu ? `${clampPercent(resourceStats.cpu.usage_percent)}%` : '—',
        detail: resourceStats?.cpu
          ? `${resourceStats.cpu.physical_cores || resourceStats.cpu.logical_cores || '?'} cores`
          : 'Awaiting data',
      },
      {
        key: 'memory',
        label: 'Memory',
        icon: <BarChart3 size={18} color={theme.palette.success.main} />,
        value: resourceStats?.memory ? `${clampPercent(resourceStats.memory.usage_percent)}%` : '—',
        detail: resourceStats?.memory
          ? `${toNumber(resourceStats.memory.available_gb).toFixed(1)} GB free`
          : 'Awaiting data',
      },
      {
        key: 'disk',
        label: 'Disk',
        icon: <Info size={18} color={theme.palette.warning.main} />, // using Info as placeholder icon
        value: resourceStats?.disk ? `${clampPercent(resourceStats.disk.usage_percent)}%` : '—',
        detail: resourceStats?.disk
          ? `${toNumber(resourceStats.disk.free_gb).toFixed(1)} GB free`
          : 'Awaiting data',
      },
      {
        key: 'network',
        label: 'Network',
        icon: <Clock size={18} color={theme.palette.info.main} />, // using Clock as throughput icon substitute
        value: resourceStats?.network
          ? `${Math.round((toNumber(resourceStats.network.bytes_sent_per_sec) + toNumber(resourceStats.network.bytes_recv_per_sec)) / 1024)} KB/s`
          : '—',
        detail: resourceStats?.network
          ? `↑ ${Math.round(toNumber(resourceStats.network.bytes_sent_per_sec) / 1024)} KB/s · ↓ ${Math.round(toNumber(resourceStats.network.bytes_recv_per_sec) / 1024)} KB/s`
          : 'Awaiting data',
      },
    ];

    return (
      <SectionCard
        title="Live System Health"
        subtitle="Resource telemetry streamed from the simulation host"
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
            <Tooltip title={showResourceDetails ? 'Hide system metrics' : 'Show system metrics'}>
              <IconButton
                size="small"
                onClick={() => setShowResourceDetails(prev => !prev)}
                aria-label={showResourceDetails ? 'Hide system metrics' : 'Show system metrics'}
              >
                {showResourceDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        <Collapse in={showResourceDetails} timeout="auto" unmountOnExit>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {monitorStale && (
              <Alert severity="warning">
                Resource monitoring appears stale or disconnected.
              </Alert>
            )}

            {resourceStats ? (
              <>
                <Grid container spacing={2}>
                  {metrics.map(({ key, label, icon, value, detail }) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Simulation Assignment
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
                    Usage History (last {MAX_HISTORY_POINTS} samples)
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
                            <Line type="monotone" dataKey="value" stroke="#ffc658" strokeWidth={2} dot={false} isAnimationActive={false} />
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
                              formatter={(value) => [`${value} KB/s`, 'Network']}
                              labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                            />
                            <Line type="monotone" dataKey="value" stroke="#00bcd4" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </>
            ) : (
              <Stack spacing={2}>
                {[1, 2].map(item => (
                  <Skeleton key={item} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                ))}
                <Alert severity="info">Waiting for the backend to stream system metrics…</Alert>
              </Stack>
            )}
          </Box>
        </Collapse>
      </SectionCard>
    );
  };

  const renderHistorySection = () => (
    <SectionCard
      title="Recent Runs"
      subtitle="Session-only history of the last few simulations"
      actions={historyItems.length > 0 && typeof clearHistory === 'function' ? (
        <Button size="small" color="inherit" onClick={() => clearHistory()}>
          Clear
        </Button>
      ) : undefined}
    >
      {historyItems.length === 0 ? (
        <Alert severity="info">Run a simulation to build your recent history.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {historyItems.map(item => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <History size={16} />
                    <Typography variant="subtitle2" noWrap>{item.title || item.id}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(item.ts)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  {typeof toggleFavorite === 'function' && (
                    <Tooltip title={item.favorite ? 'Unfavorite' : 'Favorite'}>
                      <IconButton size="small" onClick={() => toggleFavorite(item.id)}>
                        {item.favorite ? <Star size={16} color={theme.palette.warning.main} /> : <StarOff size={16} />}
                      </IconButton>
                    </Tooltip>
                  )}
                  {typeof togglePin === 'function' && (
                    <Tooltip title={item.pinned ? 'Unpin' : 'Pin'}>
                      <IconButton size="small" onClick={() => togglePin(item.id)}>
                        {item.pinned ? <Pin size={16} color={theme.palette.primary.main} /> : <PinOff size={16} />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleRecallHistory(item.id)}
                  startIcon={historyLoading === item.id ? <CircularProgress size={14} /> : undefined}
                  disabled={historyLoading === item.id}
                >
                  View
                </Button>
                {typeof removeHistoryEntry === 'function' && (
                  <Button size="small" color="inherit" onClick={() => removeHistoryEntry(item.id)}>
                    Remove
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </SectionCard>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Simulation Runner
      </Typography>
      <Typography variant="body1" paragraph>
        Run and monitor batch simulations for your saved scenarios.
      </Typography>

      {!backendAvailable && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          }
        >
          Backend server not available. Running in development mode with dummy data.
        </Alert>
      )}
      
      {wsError && backendAvailable && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          }
        >
          {wsError}
        </Alert>
      )}
      
      <Grid container spacing={3} alignItems="flex-start">
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            {renderSimulationSetup()}
            {renderQueueOverview()}
            {renderResultsSection()}
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            {renderResourcePanel()}
            {renderHistorySection()}
          </Stack>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* File Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Required Files</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please upload the required files to run the simulation. If IDF files are already selected (for example via the Baseline page), you only need to add or confirm an EPW weather file here.
          </DialogContentText>
          
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                IDF Files:
              </Typography>
              {/* Show existing selected IDF files (from local state or context) and allow adding more via IdfUploadArea */}
              <Box sx={{ mb: 1 }}>
                {(localIdfFiles.length > 0 || uploadedFiles.length > 0) ? (
                  <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Selected IDF Files ({localIdfFiles.length || uploadedFiles.length}):</strong>
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {(localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles).map((file, idx) => (
                        <Chip
                          key={idx}
                          label={file.name}
                          size="small"
                          onDelete={() => {
                            const base = localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles;
                            const newFiles = base.filter((_, i) => i !== idx);
                            setLocalIdfFiles(newFiles);
                            if (typeof updateUploadedFiles === 'function') updateUploadedFiles(newFiles);
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ) : (
                  <Alert severity="info" icon={<Upload size={18} />}>No IDF files selected. Upload files to continue.</Alert>
                )}
              </Box>

              {/* Use the IdfUploadArea component for adding or replacing files */}
              <IdfUploadArea onFilesUploaded={handleIdfFilesSelected} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Weather File (EPW):
              </Typography>
              <Box
                component={Paper}
                sx={{
                  p: 2,
                  border: '2px dashed',
                  borderColor: isDragging ? 'secondary.main' : 'divider',
                  backgroundColor: isDragging ? 'action.hover' : 'background.paper',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onClick={() => document.getElementById('epw-file-input')?.click()}
                onDragOver={handleEpwDragOver}
                onDragLeave={handleEpwDragLeave}
                onDrop={handleEpwDrop}
              >
                <input
                  id="epw-file-input"
                  type="file"
                  accept=".epw"
                  hidden
                  onChange={handleFileUpload}
                />
                <FileText 
                  size={30} 
                  style={{ marginBottom: '8px', color: weatherFile ? '#f50057' : '#9e9e9e' }} 
                />
                <Typography variant="subtitle1" gutterBottom>
                  {weatherFile 
                    ? `Selected: ${weatherFile.name}` 
                    : 'Drop EPW weather file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  or click to browse
                </Typography>
              </Box>
              
              {weatherFile && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    label={weatherFile.name}
                    onDelete={() => setWeatherFile(null)}
                    color="secondary"
                    variant="outlined"
                  />
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
          <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          {/* Allow continuing if either localIdfFiles or uploadedFiles exist and an EPW is present */}
          <Button
            variant="contained"
            onClick={() => setUploadDialogOpen(false)}
            disabled={(localIdfFiles.length === 0 && uploadedFiles.length === 0) || !weatherFile}
          >
            {/* Show informative label when using existing context files */}
            { (localIdfFiles.length === 0 && uploadedFiles.length > 0 && weatherFile) ? 'Continue (Using existing IDF files)' : 'Continue' }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          Confirm Simulation
          <IconButton
            aria-label="info"
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Info size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to run {totalSimulations} simulations which may take approximately {Math.ceil(totalSimulations * 0.5)} minutes to complete.
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Resource Allocation Plan:
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • CPU Cores: {cpuPhysical} of {cpuLogical} available
              </Typography>
              <Typography variant="body2">
                • Parallel Simulations: {suggestedParallel}
              </Typography>
              <Typography variant="body2">
                • Estimated Memory Usage: ~{estMemGb} GB
              </Typography>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setConfirmDialogOpen(false);
              handleStartSimulation();
            }} 
            variant="contained" 
            color="primary" 
            autoFocus
          >
            Start Simulation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SimulationPage;
