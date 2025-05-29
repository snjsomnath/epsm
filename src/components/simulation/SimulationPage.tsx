import React, { useState, useEffect } from 'react';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { 
  Play, 
  Pause, 
  StopCircle, 
  Cpu, 
  Clock, 
  BarChart3, 
  Download, 
  Info,
  AlertCircle,
  FileText,
  Upload
} from 'lucide-react';
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
  ResponsiveContainer,
  Legend
} from 'recharts';

const SimulationPage = () => {
  const { scenarios } = useDatabase();
  const { uploadedFiles, parsedData } = useSimulation();
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSimulations, setCompletedSimulations] = useState(0);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resourceStats, setResourceStats] = useState<any>(null);
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
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Check backend availability
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/simulation/system-resources/');
        setBackendAvailable(response.ok);
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

    console.log("Connecting to WebSocket:", wsUrl);
    
    // Clear any previous errors
    setWsError(null);
    setWsConnected(false);

    const ws = new ReconnectingWebSocket(wsUrl, [], {
      debug: true,
      reconnectInterval: 3000,
      maxReconnectInterval: 10000,
      reconnectDecay: 1.5,
    });

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setWsConnected(true);
      setWsError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket data:", data);
        
        // Only update resource stats if we got valid data
        if (data && (data.cpu || data.memory)) {
          setResourceStats(data);
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      setWsError("Failed to connect to system monitoring service");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setWsConnected(false);
    };

    return () => {
      console.log("Closing WebSocket connection");
      ws.close();
    };
  }, [backendAvailable]);

  // Dynamically update totalSimulations based on IDFs and construction variants
  useEffect(() => {
    // Try to get number of variants from parsedData or scenario
    let numVariants = 1;
    if (parsedData && parsedData.constructionVariants) {
      numVariants = parsedData.constructionVariants.length;
    } else if (selectedScenario) {
      const scenario = scenarios.find(s => s.id === selectedScenario);
      if (scenario && scenario.total_variants) {
        numVariants = scenario.total_variants;
      }
    }
    setTotalSimulations((uploadedFiles.length || 0) * numVariants);
  }, [uploadedFiles, parsedData, selectedScenario, scenarios]);

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
    
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setTotalSimulations(scenario.total_simulations);
    } else {
      setTotalSimulations(0);
    }
    
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCompletedSimulations(0);
    setIsComplete(false);
    setResults([]);
  };

  const handleStartSimulation = async () => {
    if (!uploadedFiles.length || !weatherFile) {
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
      uploadedFiles.forEach(file => {
        formData.append('idf_files', file);
      });
      formData.append('weather_file', weatherFile);
      if (selectedScenario) {
        formData.append('scenario_id', selectedScenario);
      }

      const response = await fetch('http://localhost:8000/api/simulation/run/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const simulationId = data.simulation_id;

      // Use a slower polling interval to avoid 429 errors (Too Many Requests)
      let pollInterval: NodeJS.Timeout;
      let stopped = false;
      pollInterval = setInterval(async () => {
        if (stopped) return;
        try {
          const statusResponse = await fetch(`http://localhost:8000/api/simulation/${simulationId}/status/`);
          if (statusResponse.status === 429) {
            return;
          }
          const statusData = await statusResponse.json();

          setProgress(statusData.progress ?? 0);
          setCompletedSimulations(Math.floor(((statusData.progress ?? 0) / 100) * totalSimulations));

          if (statusData.status === 'completed') {
            clearInterval(pollInterval);
            stopped = true;
            const resultsResponse = await fetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
            const resultsData = await resultsResponse.json();
            setResults(resultsData);
            setIsComplete(true);
            setIsRunning(false);
          } else if (statusData.status === 'failed') {
            clearInterval(pollInterval);
            stopped = true;
            throw new Error(statusData.error || 'Simulation failed');
          }
        } catch (err) {
          // Optionally handle fetch errors here (network, etc)
        }
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      if (files[0].name.endsWith('.epw')) {
        setWeatherFile(files[0]);
      }
    }
  };

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
                <Typography variant="subtitle2" gutterBottom>
                  Simulation Files:
                </Typography>
                <Stack spacing={1}>
                  {uploadedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      color="primary"
                      variant="outlined"
                      icon={<FileText size={16} />}
                    />
                  ))}
                  {weatherFile && (
                    <Chip
                      label={weatherFile.name}
                      color="secondary"
                      variant="outlined"
                      icon={<FileText size={16} />}
                    />
                  )}
                  {(!uploadedFiles.length || !weatherFile) && (
                    <Button
                      variant="outlined"
                      startIcon={<Upload size={18} />}
                      onClick={() => setUploadDialogOpen(true)}
                    >
                      Upload Required Files
                    </Button>
                  )}
                </Stack>
              </Box>
              
              {selectedScenario && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Scenario Details:
                  </Typography>
                  <Box sx={{ backgroundColor: 'background.default', p: 2, borderRadius: 1, mb: 3 }}>
                    <Typography variant="body2" paragraph>
                      {scenarios.find(s => s.id === selectedScenario)?.description || "No description available"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Total Simulations:</strong> {totalSimulations}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Estimated Time:</strong> {Math.ceil(totalSimulations * 0.5)} minutes
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
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
                    
                    {isRunning && (
                      <Button 
                        variant="outlined" 
                        color="primary" 
                        startIcon={<Pause size={18} />}
                        onClick={handlePauseSimulation}
                      >
                        Pause
                      </Button>
                    )}
                    
                    {isPaused && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<Play size={18} />}
                        onClick={handleResumeSimulation}
                      >
                        Resume
                      </Button>
                    )}
                    
                    {(isRunning || isPaused) && (
                      <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<StopCircle size={18} />}
                        onClick={handleStopSimulation}
                      >
                        Stop
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Progress and Results */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Simulation Progress
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {selectedScenario ? (
              <Box>
                {(isRunning || isPaused || isComplete) && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress: {completedSimulations} of {totalSimulations} simulations ({Math.round(progress)}%)
                      </Typography>
                      <Chip 
                        size="small" 
                        label={isComplete ? "Complete" : isPaused ? "Paused" : "Running"} 
                        color={isComplete ? "success" : isPaused ? "warning" : "primary"}
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={progress || 0} // Always provide a value, fallback to 0
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                {/* Results Section */}
                {isComplete && results.length > 0 && (
                  <SimulationResultsView results={results} />
                )}

                {!isRunning && !isPaused && !isComplete && (
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Click "Run Batch Simulation" to start
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                Select a scenario to run simulations.
              </Alert>
            )}
            
            {/* System Resource Monitoring - Now always visible regardless of scenario selection */}
            <Box sx={{ mb: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <BarChart3 size={20} style={{ marginRight: 8 }} />
                System Resources Monitor
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Cpu size={18} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          CPU Usage
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {Math.round(resourceStats?.cpu?.usage_percent || 0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resourceStats?.cpu?.physical_cores || 0} cores / {resourceStats?.cpu?.logical_cores || 0} threads
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Clock size={18} style={{ marginRight: 8 }} />
                        <Typography variant="body2" color="text.secondary">
                          Memory
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {Math.round(resourceStats?.memory?.usage_percent || 0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resourceStats?.memory?.used_gb?.toFixed(1) || 0} GB / {resourceStats?.memory?.total_gb?.toFixed(1) || 0} GB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
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
                        {Math.round(resourceStats?.disk?.usage_percent || 0)}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resourceStats?.disk?.used_gb?.toFixed(1) || 0} GB / {resourceStats?.disk?.total_gb?.toFixed(1) || 0} GB
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined">
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
                        {resourceStats?.network?.bytes_sent_per_sec ? 
                          Math.round((resourceStats.network.bytes_sent_per_sec + resourceStats.network.bytes_recv_per_sec) / 1024) : 0} KB/s
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ↑ {resourceStats?.network?.bytes_sent_per_sec ? Math.round(resourceStats.network.bytes_sent_per_sec / 1024) : 0} KB/s  
                        ↓ {resourceStats?.network?.bytes_recv_per_sec ? Math.round(resourceStats.network.bytes_recv_per_sec / 1024) : 0} KB/s
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
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
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* File Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
      >
        <DialogTitle>Upload Required Files</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please upload the required files to run the simulation.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              IDF Files:
            </Typography>
            {uploadedFiles.length > 0 ? (
              <Stack spacing={1}>
                {uploadedFiles.map((file, index) => (
                  <Chip
                    key={index}
                    label={file.name}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            ) : (
              <Alert severity="warning">
                No IDF files selected. Please go to the Baseline page to upload IDF files.
              </Alert>
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Weather File (EPW):
            </Typography>
            {weatherFile ? (
              <Chip
                label={weatherFile.name}
                color="secondary"
                variant="outlined"
              />
            ) : (
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload size={18} />}
              >
                Upload EPW File
                <input
                  type="file"
                  hidden
                  accept=".epw"
                  onChange={handleFileUpload}
                />
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => setUploadDialogOpen(false)}
            disabled={!uploadedFiles.length || !weatherFile}
          >
            Continue
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
                • CPU Cores: {resourceStats?.cpu?.physical_cores || 8} of {resourceStats?.cpu?.logical_cores || 8} available
              </Typography>
              <Typography variant="body2">
                • Parallel Simulations: 4
              </Typography>
              <Typography variant="body2">
                • Estimated Memory Usage: ~4GB
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