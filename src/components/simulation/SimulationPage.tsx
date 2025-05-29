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

    const ws = new ReconnectingWebSocket('ws://localhost:8000/ws/system-resources/');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setResourceStats(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [backendAvailable]);

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
      // Use dummy data for development
      simulateDummyProgress();
      return;
    }

    try {
      setError(null);
      setIsRunning(true);
      setProgress(0);
      setCompletedSimulations(0);

      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('idf_files', file);
      });
      formData.append('weather_file', weatherFile);
      formData.append('scenario_id', selectedScenario);

      // Start simulation on backend
      const response = await fetch('http://localhost:8000/api/simulation/run/', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      const simulationId = data.simulation_id;

      // Poll for progress
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`http://localhost:8000/api/simulation/${simulationId}/status/`);
        const statusData = await statusResponse.json();

        setProgress(statusData.progress);
        setCompletedSimulations(Math.floor((statusData.progress / 100) * totalSimulations));

        if (statusData.status === 'completed') {
          clearInterval(pollInterval);
          const resultsResponse = await fetch(`http://localhost:8000/api/simulation/${simulationId}/parallel-results/`);
          const resultsData = await resultsResponse.json();
          setResults(resultsData);
          setIsComplete(true);
          setIsRunning(false);
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
          throw new Error(statusData.error || 'Simulation failed');
        }
      }, 1000);

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
            <Button color="inherit\" size="small\" onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          }
        >
          Backend server not available. Running in development mode with dummy data.
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
                      value={progress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                {/* Resource Monitoring */}
                {resourceStats && (isRunning || isPaused) && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
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
                            {Math.round(resourceStats.cpu?.usage_percent || 0)}%
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
                            {Math.round(resourceStats.memory?.usage_percent || 0)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {isComplete && results.length > 0 && (
                  <SimulationResultsView results={results} />
                )}

                {!isRunning && !isPaused && !isComplete && (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Click "Run Batch Simulation" to start
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info">
                Select a scenario to view simulation details.
              </Alert>
            )}
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