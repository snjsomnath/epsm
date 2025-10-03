import React, { useState, useEffect, useMemo } from 'react';
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
  Divider,
  Tooltip
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
  Check
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
import IdfUploadArea from '../baseline/IdfUploadArea';
import CoreLaneView from './CoreLaneView';

const SimulationPage = () => {
  const { scenarios } = useDatabase();
  const { uploadedFiles, parsedData, updateUploadedFiles, loadResults: _loadResults, lastResults, cacheLastResults, addToHistory } = useSimulation();
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
  const [lastResourceAt, setLastResourceAt] = useState<number | null>(null);
  const [monitorStale, setMonitorStale] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  // Replace timestamp-based history with index-based to prevent shifting
  const [cpuHistory, setCpuHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [memoryHistory, setMemoryHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [diskHistory, setDiskHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const [networkHistory, setNetworkHistory] = useState<Array<{index: number, value: number, time: string}>>([]);
  const MAX_HISTORY_POINTS = 60; // Store last 60 data points
  const [historyIndex, setHistoryIndex] = useState(0);
  const [_wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

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
      hasScenario: !!selectedScenario,
    };
  }, [totalSimulations, completedSimulations, backendAvailable, selectedScenario]);

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
    setIsComplete(false);
    setResults([]);
    setProgress(0);
    setCompletedSimulations(0);
    setIsRunning(false);
    setIsPaused(false);
  }, [selectedScenario, uploadedFiles, weatherFile]);

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
    // Check localIdfFiles first, then fall back to uploadedFiles
    const filesAvailable = localIdfFiles.length > 0 ? localIdfFiles : uploadedFiles;
    
    if (filesAvailable.length === 0 || !weatherFile) {
      setUploadDialogOpen(true);
      return;
    }

    if (!backendAvailable) {
      simulateDummyProgress();
      return;
    }

    try {
      setError(null);
      setIsRunning(true);
      setIsComplete(false);
      setProgress(0);
      setCompletedSimulations(0);

      const formData = new FormData();
      // Use the files we just checked for availability
      filesAvailable.forEach(file => {
        formData.append('idf_files', file);
      });
      formData.append('weather_file', weatherFile);
      if (selectedScenario) {
        formData.append('scenario_id', selectedScenario);
      }

      // Add aditional params to formData for batch simulation
      formData.append('parallel', 'true');  // Boolean as string
      //formData.append('max_workers', '4');  // Let backend decide
      formData.append('batch_mode', 'true'); // Boolean as string

      // Log the payload (file names instead of file bodies) before calling the batch API
      try {
        const payloadLog: any = {};
        for (const pair of (formData as any).entries()) {
          const [key, value] = pair;
          if (!payloadLog[key]) payloadLog[key] = [];
          if (value instanceof File) {
            payloadLog[key].push(value.name);
          } else {
            payloadLog[key].push(value);
          }
        }
        console.log('Calling batch simulation API', { url: 'http://localhost:8000/api/simulation/run/', payload: payloadLog });
      } catch (logErr) {
        console.warn('Failed to log batch simulation payload', logErr);
      }

      const response = await authenticatedFetch('http://localhost:8000/api/simulation/run/', {
        method: 'POST',
        body: formData,
        // let authenticatedFetch add credentials and headers
      });

      console.log('Batch simulation API responded', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Batch simulation API error response', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`Server error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Batch simulation API success', data);
      const simulationId = data.simulation_id;

      // Try WebSocket first for real-time progress updates, fall back to polling
      let pollInterval: NodeJS.Timeout | null = null;
  let stopped = false;
  let progWs: WebSocket | null = null;
      let wsHandled = false;

      const startPolling = () => {
        if (pollInterval) return;
        pollInterval = setInterval(async () => {
          if (stopped) return;
            try {
            const statusResponse = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/status/`);
            if (statusResponse.status === 429) return;
            const statusData = await statusResponse.json();

            console.debug('Simulation status update (poll)', { simulationId, status: statusData.status, progress: statusData.progress });
            setProgress(statusData.progress ?? 0);
            setCompletedSimulations(Math.floor(((statusData.progress ?? 0) / 100) * totalSimulations));

            if (statusData.status === 'completed') {
              if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
              stopped = true;
              try {
                const resultsResponse = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
                if (resultsResponse.ok) {
                  const resultsData = await resultsResponse.json();
                  setResults(resultsData);
                  if (typeof cacheLastResults === 'function') { try { cacheLastResults(resultsData); } catch (e) { } }
                  if (typeof addToHistory === 'function') { try { addToHistory(String(simulationId), `Run ${simulationId}`); } catch (e) { } }
                } else {
                  const bodyText = await resultsResponse.text();
                  console.error('Failed to fetch parallel results', { simulationId, status: resultsResponse.status, body: bodyText });
                }
              } catch (e) {
                console.error('Error fetching parallel results', { simulationId, error: e });
              }
              setIsComplete(true);
              setIsRunning(false);
            } else if (statusData.status === 'failed') {
              if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
              stopped = true;
              console.error('Simulation failed', { simulationId, error: statusData.error });
              setError(statusData.error || 'Simulation failed');
              setIsRunning(false);
            }
          } catch (err) {
            console.error('Error while polling simulation status', err);
          }
        }, 2000);
      };

      // Attempt a single native WebSocket for progress updates to avoid noisy reconnect logs
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.host; // include port if present
        const hostnameFallback = window.location.hostname || 'localhost';
        const candidateUrls = [
          // 1) try same origin (works when backend is proxied)
          `${wsProtocol}://${host}/ws/simulation-progress/${simulationId}/`,
          // 2) fall back to explicit backend port (common in local dev)
          `${wsProtocol}://${hostnameFallback}:8000/ws/simulation-progress/${simulationId}/`,
        ];

        // Try the candidate URLs in order by creating a WebSocket for the first one.
        // Browser will emit its own low-level error if connection is refused; we avoid repeated warn logs.
        let firstErrorLogged = false;
        const tryUrl = (url: string) => {
          progWs = new WebSocket(url);

          progWs.onopen = () => {
            console.log('Connected to simulation progress WebSocket for', simulationId, 'via', url);
            wsHandled = true;
            if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
          };

          progWs.onmessage = (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data as string);
            if (typeof data.progress !== 'undefined') {
              setProgress(data.progress);
              setCompletedSimulations(Math.floor((data.progress / 100) * totalSimulations));
            }
            if (data.status === 'completed') {
                (async () => {
                try {
                  const resultsResponse = await authenticatedFetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
                  if (resultsResponse.ok) {
                    const resultsData = await resultsResponse.json();
                    setResults(resultsData);
                    if (typeof cacheLastResults === 'function') { try { cacheLastResults(resultsData); } catch (e) { } }
                    if (typeof addToHistory === 'function') { try { addToHistory(String(simulationId), `Run ${simulationId}`); } catch (e) { } }
                  }
                } catch (e) {
                  console.error('Failed to fetch results after WS completion', e);
                }
                setIsComplete(true);
                setIsRunning(false);
              })();
            }
            if (data.status === 'failed') {
              setIsRunning(false);
              setIsComplete(true);
              setError(data.error || 'Simulation failed');
            }
          } catch (e) {
            console.warn('Malformed progress WS message', e);
          }
        };

          progWs.onerror = (e) => {
            // Avoid logging the browser-level connection failure repeatedly. Log once and start polling.
            if (!firstErrorLogged) {
              console.warn('Progress WS error, falling back to polling', e);
              firstErrorLogged = true;
            }
            if (!wsHandled) startPolling();
          };

          progWs.onclose = () => {
            if (!wsHandled) {
              if (!firstErrorLogged) console.log('Progress WS closed, falling back to polling');
              startPolling();
            }
          };
        };

        // Start with the first candidate URL; browser-level errors will appear in console if connection fails.
        tryUrl(candidateUrls[0]);
      } catch (e) {
        console.warn('Failed to create progress websocket, using polling', e);
        startPolling();
      }

      // If WS hasn't attached within 2s, ensure polling starts
      setTimeout(() => {
        if (!wsHandled) startPolling();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run simulation');
      setIsRunning(false);
    }
  };

  const simulateDummyProgress = () => {
    setIsRunning(true);
    setProgress(0);
    setCompletedSimulations(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + (Math.random() * 5);
        if (next >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setIsRunning(false);
          // Generate dummy results
          setResults([
            {
              fileName: 'simulation_1.idf',
              totalEnergyUse: 150.5,
              heatingDemand: 80.2,
              coolingDemand: 45.3,
              runTime: 12.5
            },
            // Add more dummy results as needed
          ]);
          return 100;
        }
        setCompletedSimulations(Math.floor((next / 100) * totalSimulations));
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
    setIsRunning(false);
    setIsPaused(false);
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

  // Then in the Dialog component, replace the IDF upload section with:
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
      
      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Control
              </Typography>
              
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

              {/* Files Section */}
              <Box sx={{ mb: 3 }}>
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
                    {uploadedFiles.length === 0 && !weatherFile 
                      ? "Upload Files"
                      : "Modify Files"}
                  </Button>
                </Stack>
              </Box>

              {/* Simulation Details Section */}
              {selectedScenario && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Info size={16} />
                    Simulation Details
                  </Typography>
                  <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Description:
                        </Typography>
                        <Typography variant="body2">
                          {scenarios.find(s => s.id === selectedScenario)?.description || "No description available"}
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
                              // Use total_simulations instead of total_variants
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
                              // Use total_simulations instead of total_variants
                              return scenario?.total_simulations || 1;
                            })()} variants)
                          </Typography>
                        </Grid>
                      </Grid>
                    </Stack>
                  </Box>
                  
                  {/* Progress Section */}
                  {(isRunning || isPaused || isComplete) && (
                    <Box sx={{ mb: 3 }}>
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
                          label={isComplete ? "Complete" : isPaused ? "Paused" : "Running"} 
                          color={isComplete ? "success" : isPaused ? "warning" : "primary"}
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
                            borderRadius: 4
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>
              )}
              
              <Stack spacing={2} sx={{ mt: 3 }}>
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
                <Alert severity="info" sx={{ mt: 3 }}>
                  Select a scenario to run simulations.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Queue and Resources */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {/* Queue & Worker Overview */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Queue & Worker Overview</Typography>
                  {selectedScenario && (
                    <Chip
                      size="small"
                      label={isComplete ? 'Complete' : isPaused ? 'Paused' : isRunning ? 'Running' : 'Idle'}
                      color={isComplete ? 'success' : isPaused ? 'warning' : isRunning ? 'primary' : 'default'}
                      variant={isRunning || isPaused || isComplete ? 'filled' : 'outlined'}
                    />
                  )}
                </Box>

                {!queueMetrics.hasScenario ? (
                  <Alert severity="info">
                    Select a scenario to see real-time queue statistics.
                  </Alert>
                ) : (
                  <>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Completed
                        </Typography>
                        <Typography variant="h5">
                          {completedSimulations}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          of {totalSimulations || '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Active Workers
                        </Typography>
                        <Typography variant="h5">
                          {queueMetrics.activeWorkers}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          of {queueMetrics.batchSize}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Waiting Variants
                        </Typography>
                        <Typography variant="h5">
                          {queueMetrics.queueVariants}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {queueMetrics.queuedBatches ? `≈ ${queueMetrics.queuedBatches} batch${queueMetrics.queuedBatches === 1 ? '' : 'es'}` : 'Queue drains soon'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Remaining Variants
                        </Typography>
                        <Typography variant="h5">
                          {queueMetrics.remainingVariants}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Progress {Math.round(progress)}%
                        </Typography>
                      </Grid>
                    </Grid>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      {queueMetrics.workerStatusLabel}
                    </Typography>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        color={queueMetrics.remainingVariants ? 'primary' : 'default'}
                        label={queueMetrics.runningLabel}
                      />
                      <Chip
                        size="small"
                        color={queueMetrics.queueVariants ? 'secondary' : 'default'}
                        label={queueMetrics.queueLabel}
                      />
                      <Chip
                        size="small"
                        color={queueMetrics.remainingVariants ? 'warning' : 'default'}
                        label={`Remaining ${queueMetrics.remainingVariants}`}
                      />
                      {queueMetrics.idleWorkers > 0 && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${queueMetrics.idleWorkers} idle worker${queueMetrics.idleWorkers === 1 ? '' : 's'}`}
                        />
                      )}
                    </Stack>

                    <LinearProgress variant="determinate" value={queueMetrics.batchProgress} sx={{ height: 6, borderRadius: 3, mb: 1 }} />
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
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Start a batch to populate live queue metrics.
                      </Typography>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Results Section */}
            {isComplete && results.length > 0 && (
              <Box>
                <SimulationResultsView results={results} />
              </Box>
            )}

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {/* System Resource Monitoring */}
            <Card>
              <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <BarChart3 size={20} style={{ marginRight: 8 }} />
                System Resources Monitor
              </Typography>
              {monitorStale && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Resource monitoring appears stale or disconnected.
                </Alert>
              )}
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ minHeight: 120 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Cpu size={18} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          CPU Usage
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {clampPercent(resourceStats?.cpu?.usage_percent)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resourceStats?.cpu?.physical_cores || resourceStats?.cpu?.logical_cores || 0} cores
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ minHeight: 120 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Clock size={18} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          Memory
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {clampPercent(resourceStats?.memory?.usage_percent)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {((toNumber(resourceStats?.memory?.total_gb) - toNumber(resourceStats?.memory?.available_gb)) || 0).toFixed(1)} GB / {toNumber(resourceStats?.memory?.total_gb).toFixed(1)} GB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ minHeight: 120 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          style={{ marginRight: 8 }}
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 2a14 14 0 0 0 0 20 14 14 0 0 0 0-20"></path>
                          <path d="M2 12h20"></path>
                        </svg>
                        <Typography variant="body2" color="text.secondary">
                          Disk
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {clampPercent(resourceStats?.disk?.usage_percent)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {((toNumber(resourceStats?.disk?.total_gb) - toNumber(resourceStats?.disk?.free_gb)) || 0).toFixed(1)} GB / {toNumber(resourceStats?.disk?.total_gb).toFixed(1)} GB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ minHeight: 120 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          style={{ marginRight: 8 }}
                        >
                          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9"></path>
                        </svg>
                        <Typography variant="body2" color="text.secondary">
                          Network
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {resourceStats?.network?.bytes_sent_per_sec ? Math.round((toNumber(resourceStats.network.bytes_sent_per_sec) + toNumber(resourceStats.network.bytes_recv_per_sec)) / 1024) : 0} KB/s
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ↑ {resourceStats?.network?.bytes_sent_per_sec ? Math.round(toNumber(resourceStats.network.bytes_sent_per_sec) / 1024) : 0} KB/s  
                        ↓ {resourceStats?.network?.bytes_recv_per_sec ? Math.round(toNumber(resourceStats.network.bytes_recv_per_sec) / 1024) : 0} KB/s
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              {/* Dendrogram showing assignment of simulations to cores. Aggregates leaves when too many. */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Simulation Assignment
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <Paper sx={{ p: 1, height: 360 }} variant="outlined">
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
                  </Paper>
                </Box>
              </Grid>
              
              {/* Resource History Charts */}
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    CPU Usage History
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cpuHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="index"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={() => ''}
                          tick={false}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(value) => `${value}%`}
                          tick={{fontSize: 10}}
                        />
                        <RechartsTooltip 
                          formatter={(value) => [`${value}%`, 'CPU']}
                          labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          dot={false}
                          name="CPU"
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Memory Usage History
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={memoryHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="index"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={() => ''}
                          tick={false}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(value) => `${value}%`}
                          tick={{fontSize: 10}}
                        />
                        <RechartsTooltip 
                          formatter={(value) => [`${value}%`, 'Memory']}
                          labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          dot={false}
                          name="Memory"
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Disk Usage History
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={diskHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="index"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={() => ''}
                          tick={false}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tickFormatter={(value) => `${value}%`}
                          tick={{fontSize: 10}}
                        />
                        <RechartsTooltip 
                          formatter={(value) => [`${value}%`, 'Disk']}
                          labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#ffc658" 
                          strokeWidth={2}
                          dot={false}
                          name="Disk"
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Network Activity (KB/s)
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={networkHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="index"
                          type="number"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={() => ''}
                          tick={false}
                        />
                        <YAxis 
                          domain={[0, 'dataMax']}
                          tickFormatter={(value) => `${value}`}
                          tick={{fontSize: 10}}
                        />
                        <RechartsTooltip 
                          formatter={(value) => [`${value} KB/s`, 'Network']}
                          labelFormatter={(_, data) => `Time: ${data[0]?.payload?.time || ''}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#ff7300" 
                          strokeWidth={2}
                          dot={false}
                          name="Network"
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

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