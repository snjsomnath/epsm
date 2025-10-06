import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { authenticatedFetch } from '../../lib/auth-api';
import { 
  Box, 
  Typography, 
  Grid, 
  Button,
  Alert,
  Stack,
  Snackbar,
} from '@mui/material';
import { 
  Cpu, 
  Clock, 
  BarChart3, 
  Info,
} from 'lucide-react';
// history-related icons removed; history UI moved to Baseline page
import { useDatabase } from '../../context/DatabaseContext';
import { useSimulation } from '../../context/SimulationContext';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { useTheme } from '@mui/material/styles';
import type { AlertColor } from '@mui/material/Alert';
import SimulationSetupSection, {
  SimulationStatusSummary,
  ScenarioOption,
  RunStatusChip,
  QueueMetrics,
} from './sections/SimulationSetupSection';
import ResultsSection from './sections/ResultsSection';
import ResourcePanel, { SummaryMetric } from './sections/ResourcePanel';
import HistorySection from './sections/HistorySection';
import UploadDialog from './sections/UploadDialog';
import StartSimulationDialog from './sections/StartSimulationDialog';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: AlertColor;
};

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
  const scenarioOptions = useMemo<ScenarioOption[]>(() => (
    scenarios.map(s => ({
      id: s.id,
      name: s.name,
      total_simulations: s.total_simulations,
      description: s.description ?? null,
    }))
  ), [scenarios]);

  const activeScenario = useMemo(() => {
    if (!selectedScenario) return null;
    return scenarioOptions.find(s => String(s.id) === String(selectedScenario)) || null;
  }, [scenarioOptions, selectedScenario]);

  // Debug logging for scenarios
  useEffect(() => {
    console.log('Scenarios available:', scenarioOptions.length);
    if (scenarioOptions.length > 0) {
      console.log('Scenarios:', scenarioOptions.map(s => ({ id: s.id, name: s.name, total_simulations: s.total_simulations })));
    }
  }, [scenarioOptions]);

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
  const userStartedNewSimRef = useRef(false);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const weatherPlaceholderAlertShownRef = useRef(false);

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
          // Results not ready yet
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
        
        // SAFEGUARD 6: Analyze results for errors
        const errorResults = resultsArray.filter(r => 
          r.status === 'error' || 
          r.raw_json?.status === 'error' ||
          r.raw_json?.error
        );
        const successResults = resultsArray.filter(r => 
          r.status !== 'error' && 
          r.total_energy_use !== null
        );
        
        console.log(`📊 RESULTS FETCHED:`, {
          simulation_id: simulationId,
          total: resultsArray.length,
          success: successResults.length,
          errors: errorResults.length,
          success_rate: resultsArray.length > 0 
            ? `${Math.round((successResults.length / resultsArray.length) * 100)}%`
            : 'N/A',
        });
        
        // Log first error if any exist
        if (errorResults.length > 0) {
          console.error('⚠️ SIMULATION ERRORS DETECTED:', {
            error_count: errorResults.length,
            first_error: errorResults[0].raw_json?.error || errorResults[0].error_message,
            affected_variants: errorResults.map(r => r.variant_idx).slice(0, 5),
          });
        }
        
        // Update results state and ref atomically
        setResults(resultsArray);
        resultsCountRef.current = resultsArray.length;

        // Calculate progress based on total simulations
        const total = totalSimulationsRef.current || 0;
        if (total > 0) {
          const computedProgress = Math.min(100, Math.round((resultsArray.length / total) * 100));
          if (computedProgress > progressRef.current || force) {
            setProgress(computedProgress);
            progressRef.current = computedProgress;
          }
        }
        
        // Update completed count
        setCompletedSimulations(resultsArray.length);
        
        // Update active run with latest info
        updateActiveRun?.({
          completedSimulations: resultsArray.length,
          progress: progressRef.current,
          // Don't persist totalSimulations
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
      
      // Fetch final results first to get accurate count AND the actual results array
      let finalResults: any[] = [];
      try {
        const response = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
        if (response.ok) {
          const data = await response.json();
          finalResults = Array.isArray(data) ? data : [data];
          // Update state with final results
          setResults(finalResults);
          resultsCountRef.current = finalResults.length;
        }
      } catch (err) {
        console.error('Error fetching final results:', err);
      }
      
      // Wait a brief moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      stopMonitoring();
      setIsComplete(true);
      setIsRunning(false);
      setIsPaused(false);
      
      // Use the latest resultsCountRef which was updated above
      const finalResultCount = resultsCountRef.current;
      
      // SAFEGUARD 7: Check for errors in final results (use finalResults, not stale state)
      const errorResults = finalResults.filter(r => 
        r.status === 'error' || 
        r.raw_json?.status === 'error' ||
        r.raw_json?.error ||
        !r.total_energy_use
      );
      const successResults = finalResults.filter(r => 
        r.status !== 'error' && 
        r.total_energy_use !== null
      );
      
      const hasErrors = errorResults.length > 0;
      const allFailed = errorResults.length === finalResultCount;
      
      console.log('🏁 SIMULATION FINALIZED:', {
        simulation_id: simulationId,
        total_results: finalResultCount,
        successful: successResults.length,
        failed: errorResults.length,
        expected: totalSimulationsRef.current,
        match: finalResultCount === totalSimulationsRef.current,
      });
      
      // Update status based on results
      const finalStatus = allFailed ? 'failed' : 'completed';
      
      updateActiveRun?.({
        status: finalStatus,
        progress: 100,
        completedSimulations: finalResultCount,
        // Don't persist totalSimulations
      });
      
      // Add to history with error indicator if needed
      try {
        const historyTitle = hasErrors
          ? `${successResults.length}/${finalResultCount} successful`
          : `${finalResultCount} result${finalResultCount !== 1 ? 's' : ''}`;
        addToHistory?.(String(simulationId), historyTitle);
        console.log(`Added to history: ${simulationId} - ${historyTitle}`);
      } catch (e) {
        console.error('Failed to add to history:', e);
      }
      
      // Show appropriate notification
      if (allFailed) {
        openSnackbar(
          `Simulation completed but all ${finalResultCount} variants failed. Check logs.`,
          'error'
        );
      } else if (hasErrors) {
        openSnackbar(
          `Simulation completed: ${successResults.length} successful, ${errorResults.length} failed`,
          'warning'
        );
      } else {
        openSnackbar(
          `Simulation completed successfully: ${finalResultCount} results`,
          'success'
        );
      }
      
      clearActiveRun?.();
      setCurrentSimulationId(null);
      
      // Scroll to results section after a short delay
      setTimeout(() => {
        resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 500);
    },
    [authenticatedFetch, stopMonitoring, updateActiveRun, clearActiveRun, addToHistory, openSnackbar]
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

          // Calculate completed based on actual progress and total
          const total = totalSimulationsRef.current || 0;
          const estimatedCompleted = Math.max(
            resultsCountRef.current,
            total > 0 ? Math.floor((total * progressValue) / 100) : 0
          );
          setCompletedSimulations(estimatedCompleted);

          const nextStatus = statusData.status === 'failed' ? 'failed' : 'running';
          updateActiveRun?.({
            status: nextStatus,
            progress: progressValue,
            completedSimulations: estimatedCompleted,
            // Don't persist totalSimulations
          });
          
          console.log(`Status poll: ${progressValue}% (${estimatedCompleted}/${total})`);

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
                
                const total = totalSimulationsRef.current || 0;
                const estimatedCompleted = Math.max(
                  resultsCountRef.current,
                  total > 0 ? Math.floor((total * pct) / 100) : 0
                );
                setCompletedSimulations(estimatedCompleted);
                
                updateActiveRun?.({
                  progress: pct,
                  completedSimulations: estimatedCompleted,
                  // Don't persist totalSimulations
                });
                
                console.log(`WebSocket update: ${pct}% (${estimatedCompleted}/${total})`);
                
                // Fetch results if progress jumped or we think there are new results
                if (
                  pct - lastFetchProgressRef.current >= 5 ||
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
    // Don't resume if user just clicked 'Start New Simulation'
    if (userStartedNewSimRef.current) {
      return;
    }
    if (!activeRun) {
      resumeAttemptedRef.current = false;
      return;
    }
    if (!backendAvailable) {
      return;
    }
    if (activeRun.status === 'completed' || activeRun.status === 'failed') {
      // If simulation was already marked as completed/failed, don't resume monitoring
      // but do restore the UI state
      resumeAttemptedRef.current = true;
      setCurrentSimulationId(activeRun.simulationId);
      setIsComplete(true);
      setIsRunning(false);
      setIsPaused(false);
      if (typeof activeRun.progress === 'number') {
        setProgress(activeRun.progress);
        progressRef.current = activeRun.progress;
      }
      if (typeof activeRun.completedSimulations === 'number') {
        setCompletedSimulations(activeRun.completedSimulations);
        resultsCountRef.current = Math.max(resultsCountRef.current, activeRun.completedSimulations);
      }
      // DO NOT restore totalSimulations from activeRun - let it be recalculated from scenario
      // This prevents showing stale counts like "8/3" when only 3 simulations were requested
      
      // Fetch results one last time to ensure we have the latest
      fetchSimulationResults(activeRun.simulationId, { force: true });
      return;
    }
    if (resumeAttemptedRef.current && currentSimulationId === activeRun.simulationId) {
      return;
    }
    resumeAttemptedRef.current = true;
    
    // SAFEGUARD 8: Validate scenario on resume
    if (activeRun.scenarioId) {
      const scenarioExists = scenarios.find(s => String(s.id) === String(activeRun.scenarioId));
      if (scenarioExists) {
        // Only restore scenario if user hasn't already selected a different one
        // This prevents overriding user's new selection with old activeRun data
        if (!selectedScenario || selectedScenario === String(activeRun.scenarioId)) {
          setSelectedScenario(String(activeRun.scenarioId));
          console.log('📋 RESUMING SIMULATION:', {
            simulation_id: activeRun.simulationId,
            scenario: scenarioExists.name,
            expected_variants: scenarioExists.total_simulations,
            status: activeRun.status,
          });
        } else {
          console.warn(`⚠️ User selected different scenario (${selectedScenario}) than activeRun (${activeRun.scenarioId})`);
          console.log('   Clearing activeRun to prevent scenario mismatch');
          clearActiveRun?.();
          return; // Don't resume with wrong scenario
        }
      } else {
        console.warn(`⚠️ Scenario ${activeRun.scenarioId} not found on resume`);
        clearActiveRun?.();
        return;
      }
    }
    
    setCurrentSimulationId(activeRun.simulationId);
    
    // Check if simulation might have completed while we were away
    // If progress is 100%, verify status
    const mightBeComplete = (activeRun.progress === 100);
    
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
    // DO NOT restore totalSimulations from activeRun on resume
    // The scenario-based useEffect will set the correct value
    // This prevents incorrect counts like "8/3" after page refresh
    
    // Fetch results first to get current state
    fetchSimulationResults(activeRun.simulationId, { force: true }).then(() => {
      // If we suspected completion, verify with backend status
      if (mightBeComplete) {
        authenticatedFetch(`http://localhost:8000/api/simulation/${activeRun.simulationId}/status/`)
          .then(async (statusResponse) => {
            if (statusResponse && statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.status === 'completed') {
                // Simulation completed while we were away, finalize it
                await finalizeSimulation(activeRun.simulationId);
                return;
              } else if (statusData.status === 'failed') {
                handleSimulationFailure(activeRun.simulationId, statusData.error_message);
                return;
              }
            }
            // Not complete yet, start monitoring normally
            startMonitoring(activeRun.simulationId, true);
          })
          .catch(() => {
            // If status check fails, assume still running and start monitoring
            startMonitoring(activeRun.simulationId, true);
          });
      } else {
        // Definitely still running, start monitoring
        startMonitoring(activeRun.simulationId, true);
      }
    });
  }, [activeRun, fetchSimulationResults, startMonitoring, finalizeSimulation, handleSimulationFailure, currentSimulationId, backendAvailable, authenticatedFetch]);

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
  const queueMetrics: QueueMetrics = useMemo(() => {
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

  // Dynamically update totalSimulations based on scenario
  // This must run AFTER activeRun is loaded to override any stale persisted values
  useEffect(() => {
    // The scenario's total_simulations already represents the total count of all variants
    // It should NOT be multiplied by file count since the backend handles batching
    if (selectedScenario) {
      const scenario = scenarioOptions.find(s => String(s.id) === String(selectedScenario));
      const scenarioTotal = scenario?.total_simulations || 0;
      
      // Only set totalSimulations if we have a valid scenario with simulations
      if (scenarioTotal > 0) {
        setTotalSimulations(scenarioTotal);
        totalSimulationsRef.current = scenarioTotal;
        console.log(`Total simulations set to ${scenarioTotal} from scenario (ID: ${selectedScenario})`);
      } else if (uploadedFiles.length > 0) {
        // Fallback: if no scenario or total is 0, use file count
        setTotalSimulations(uploadedFiles.length);
        totalSimulationsRef.current = uploadedFiles.length;
        console.log(`Total simulations set to ${uploadedFiles.length} from file count`);
      }
    } else if (uploadedFiles.length > 0) {
      // No scenario selected, just use file count
      setTotalSimulations(uploadedFiles.length);
      totalSimulationsRef.current = uploadedFiles.length;
    } else {
      setTotalSimulations(0);
      totalSimulationsRef.current = 0;
    }
  }, [uploadedFiles.length, selectedScenario, scenarioOptions]); // Use scenarioOptions (memoized) and length (primitive)

  // Reset state when scenario changes (but not just because a run finished)
  const prevScenarioRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isRunning && !isPaused) {
      const prevScenario = prevScenarioRef.current;
      if (prevScenario !== selectedScenario) {
        setIsComplete(false);
        setResults([]);
        setProgress(0);
        setCompletedSimulations(0);
      }
    }
    prevScenarioRef.current = selectedScenario ?? null;
  }, [selectedScenario, isRunning, isPaused]);

  const handleScenarioChange = useCallback((scenarioId: string) => {
    if (currentSimulationId && (isRunning || isPaused)) {
      openSnackbar('Simulation in progress. Stop it before switching scenarios.', 'warning');
      return;
    }

    console.log('🔄 Scenario changed to:', scenarioId);
    
    // Note: Don't include activeRun/clearActiveRun in dependencies - they're from context
    // and including them causes infinite re-renders
    
    setSelectedScenario(scenarioId);
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCompletedSimulations(0);
    setIsComplete(false);
    setResults([]);
  }, [currentSimulationId, isRunning, isPaused, openSnackbar]);

  const resetSimulationState = useCallback(() => {
    userStartedNewSimRef.current = true;
    setIsComplete(false);
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCompletedSimulations(0);
    setResults([]);
    setCurrentSimulationId(null);
    progressRef.current = 0;
    resultsCountRef.current = 0;
    totalSimulationsRef.current = 0;
    clearActiveRun?.();
    completionHandledRef.current = false;
    resumeAttemptedRef.current = false;
  }, [clearActiveRun]);

  const handleStartSimulation = async () => {
    const filesAvailable = uploadedFiles;

    const weatherNeedsReupload = Boolean(weatherFile && weatherFile.size === 0);

    if (filesAvailable.length === 0 || !weatherFile || weatherNeedsReupload) {
      setUploadDialogOpen(true);
      const missingReasons: string[] = [];
      if (filesAvailable.length === 0) {
        missingReasons.push('Upload at least one IDF file.');
      }
      if (!weatherFile) {
        missingReasons.push('Attach an EPW weather file.');
      } else if (weatherNeedsReupload) {
        missingReasons.push('Re-upload the EPW weather file.');
      }
      if (missingReasons.length > 0) {
        openSnackbar(missingReasons.join(' '), 'warning');
      }
      return;
    }

    // SAFEGUARD 1: Validate scenario is selected and matches totalSimulations
    if (!selectedScenario) {
      reportError('Please select a scenario before starting simulation');
      return;
    }

    const activeScenarioData = scenarios.find(s => String(s.id) === String(selectedScenario));
    if (!activeScenarioData) {
      reportError('Selected scenario not found. Please refresh and try again.');
      return;
    }

    // SAFEGUARD 2: Verify totalSimulations matches the scenario
    if (totalSimulations !== activeScenarioData.total_simulations) {
      console.warn(
        `⚠️ MISMATCH DETECTED: totalSimulations (${totalSimulations}) != scenario.total_simulations (${activeScenarioData.total_simulations})`,
        '\nForcing update to match scenario...'
      );
      setTotalSimulations(activeScenarioData.total_simulations);
      totalSimulationsRef.current = activeScenarioData.total_simulations;
    }

    // SAFEGUARD 3: Log what we're about to send
    console.log('🚀 STARTING SIMULATION:', {
      scenario: {
        id: selectedScenario,
        name: activeScenarioData.name,
        expected_variants: activeScenarioData.total_simulations,
      },
      files: {
        idf_count: filesAvailable.length,
        weather: weatherFile.name,
      },
      state: {
        totalSimulations,
        totalSimulationsRef: totalSimulationsRef.current,
      },
    });

    if (!backendAvailable) {
      stopMonitoring();
      const fallbackId = currentSimulationId ?? `dev-${Date.now()}`;
      setCurrentSimulationId(fallbackId);
      setActiveRun?.({
        simulationId: fallbackId,
        scenarioId: selectedScenario || undefined,
        status: 'running',
        startedAt: Date.now(),
        // Don't persist totalSimulations - let it be recalculated from scenario
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
      userStartedNewSimRef.current = false;

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
      
      // SAFEGUARD 4: Log backend response
      console.log('✅ BACKEND RESPONSE:', {
        simulation_id: simulationId,
        file_count: data.file_count,
        task_id: data.task_id,
        expected_variants: totalSimulationsRef.current,
      });
      
      // SAFEGUARD 5: Validate response
      if (data.file_count !== filesAvailable.length) {
        console.warn(
          `⚠️ FILE COUNT MISMATCH: Sent ${filesAvailable.length} files, backend received ${data.file_count}`
        );
      }
      
      setCurrentSimulationId(simulationId);
      setActiveRun?.({
        simulationId,
        scenarioId: selectedScenario || undefined,
        status: 'running',
        startedAt: Date.now(),
        // Don't persist totalSimulations - let it be recalculated from scenario
        completedSimulations: 0,
        progress: 0,
      });
      resumeAttemptedRef.current = true;
      openSnackbar(
        `Simulation started: ${activeScenarioData?.name} (${totalSimulationsRef.current} variants)`,
        'info'
      );
      startMonitoring(simulationId, true);
    } catch (err) {
      reportError(err instanceof Error ? err.message : 'Failed to run simulation');
      setIsRunning(false);
      clearActiveRun?.();
      setCurrentSimulationId(null);
    }
  };

  const simulateDummyProgress = () => {
    const totalEstimate = totalSimulationsRef.current || totalSimulations || uploadedFiles.length || 1;
    setIsRunning(true);
    setProgress(0);
    setCompletedSimulations(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 5;
        updateActiveRun?.({ progress: Math.min(100, next), status: 'running' });
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
          updateActiveRun?.({ status: 'completed', progress: 100, completedSimulations: totalEstimate });
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

  const handleStopSimulation = () => {
    stopMonitoring();
    setIsRunning(false);
    setIsPaused(false);
    updateActiveRun?.({ status: 'failed' });
    clearActiveRun?.();
    setCurrentSimulationId(null);
    openSnackbar('Monitoring stopped. Currently queued tasks will continue on the server.', 'warning');
  };

  const handleIdfFilesSelected = (files: File[]) => {
    try {
      if (typeof updateUploadedFiles === 'function') {
        updateUploadedFiles(files);
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
    if (weatherFile && weatherFile.size === 0 && !weatherPlaceholderAlertShownRef.current) {
      weatherPlaceholderAlertShownRef.current = true;
      setUploadDialogOpen(true);
    }
    if (weatherFile && weatherFile.size > 0) {
      weatherPlaceholderAlertShownRef.current = false;
    }
  }, [weatherFile]);

  // Improve the EPW file upload handler
  // Add a function to handle EPW file drag & drop
  
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

  const metrics: SummaryMetric[] = useMemo(() => [
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
      icon: <Info size={18} color={theme.palette.warning.main} />,
      value: resourceStats?.disk ? `${clampPercent(resourceStats.disk.usage_percent)}%` : '—',
      detail: resourceStats?.disk
        ? `${toNumber(resourceStats.disk.free_gb).toFixed(1)} GB free`
        : 'Awaiting data',
    },
    {
      key: 'network',
      label: 'Network',
      icon: <Clock size={18} color={theme.palette.info.main} />,
      value: resourceStats?.network
        ? `${Math.round((toNumber(resourceStats.network.bytes_sent_per_sec) + toNumber(resourceStats.network.bytes_recv_per_sec)) / 1024)} KB/s`
        : '—',
      detail: resourceStats?.network
        ? `↑ ${Math.round(toNumber(resourceStats.network.bytes_sent_per_sec) / 1024)} KB/s · ↓ ${Math.round(toNumber(resourceStats.network.bytes_recv_per_sec) / 1024)} KB/s`
        : 'Awaiting data',
    },
  ], [resourceStats, theme]);

  const simulationStatus: SimulationStatusSummary = useMemo(() => ({
    isRunning,
    isPaused,
    isComplete,
    progress,
    completed: completedSimulations,
    total: totalSimulations,
  }), [isRunning, isPaused, isComplete, progress, completedSimulations, totalSimulations]);

  const runStatusChip: RunStatusChip = useMemo(() => {
    if (isComplete) {
      return { label: 'Complete', color: 'success', variant: 'filled' };
    }
    if (isPaused) {
      return { label: 'Paused', color: 'warning', variant: 'filled' };
    }
    if (isRunning) {
      return { label: 'Running', color: 'primary', variant: 'filled' };
    }
    return { label: 'Idle', color: 'default', variant: 'outlined' };
  }, [isComplete, isPaused, isRunning]);

  const handleManageFiles = useCallback(() => setUploadDialogOpen(true), []);
  const handleRequestStart = useCallback(() => setConfirmDialogOpen(true), []);
  const handlePrepareNewRun = useCallback(() => {
    resetSimulationState();
    openSnackbar('Ready for another batch', 'success');
  }, [resetSimulationState, openSnackbar]);

  const handleWeatherSelected = useCallback((file: File) => {
    setWeatherFile(file);
  }, [setWeatherFile]);

  const handleWeatherCleared = useCallback(() => {
    setWeatherFile(null);
  }, [setWeatherFile]);

  const handleUploadDialogClose = useCallback(() => setUploadDialogOpen(false), []);

  const handleConfirmStart = useCallback(() => {
    setConfirmDialogOpen(false);
    handleStartSimulation();
  }, [handleStartSimulation]);

  const handleCancelStart = useCallback(() => setConfirmDialogOpen(false), []);

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
            <SimulationSetupSection
              scenarios={scenarioOptions}
              selectedScenarioId={selectedScenario}
              activeScenario={activeScenario}
              uploadedFiles={uploadedFiles}
              weatherFile={weatherFile}
              status={simulationStatus}
              runStatusChip={runStatusChip}
              backendAvailable={backendAvailable}
              queueMetrics={queueMetrics}
              onScenarioChange={handleScenarioChange}
              onManageFiles={handleManageFiles}
              onRequestStart={handleRequestStart}
              onCancelRun={handleStopSimulation}
              onPrepareNewRun={handlePrepareNewRun}
            />
            <div ref={resultsSectionRef}>
              <ResultsSection
                isComplete={isComplete}
                isRunning={isRunning}
                results={results}
                error={error}
              />
            </div>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <ResourcePanel
              backendAvailable={backendAvailable}
              wsConnected={wsConnected}
              monitorStale={monitorStale}
              showDetails={showResourceDetails}
              onToggleDetails={() => setShowResourceDetails(prev => !prev)}
              metrics={metrics}
              resourceStats={resourceStats}
              cpuHistory={cpuHistory}
              memoryHistory={memoryHistory}
              diskHistory={diskHistory}
              networkHistory={networkHistory}
              maxHistoryPoints={MAX_HISTORY_POINTS}
              totalSimulations={totalSimulations}
              cpuLogical={cpuLogical}
              completedSimulations={completedSimulations}
              progress={progress}
            />
            <HistorySection
              items={historyItems}
              loadingId={historyLoading}
              onRecall={handleRecallHistory}
              onRemove={typeof removeHistoryEntry === 'function' ? removeHistoryEntry : undefined}
              onToggleFavorite={typeof toggleFavorite === 'function' ? toggleFavorite : undefined}
              onTogglePin={typeof togglePin === 'function' ? togglePin : undefined}
              onClear={typeof clearHistory === 'function' ? clearHistory : undefined}
              formatTimestamp={formatTimestamp}
            />
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

      <UploadDialog
        open={uploadDialogOpen}
        onClose={handleUploadDialogClose}
        uploadedFiles={uploadedFiles}
        weatherFile={weatherFile}
        onFilesUploaded={handleIdfFilesSelected}
        onWeatherSelected={handleWeatherSelected}
        onWeatherCleared={handleWeatherCleared}
      />

      <StartSimulationDialog
        open={confirmDialogOpen}
        onCancel={handleCancelStart}
        onConfirm={handleConfirmStart}
        activeScenario={activeScenario}
        uploadedFilesCount={uploadedFiles.length}
        weatherFile={weatherFile}
        totalSimulations={totalSimulations}
        suggestedParallel={suggestedParallel}
        cpuLogical={cpuLogical}
        backendAvailable={backendAvailable}
      />
    </Box>
  );
};

export default SimulationPage;
