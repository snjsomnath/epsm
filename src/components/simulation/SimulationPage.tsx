import React, { useState, useEffect, useRef } from 'react';
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
  Divider,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { 
  Play, 
  Pause, 
  StopCircle, 
  Cpu, 
  Clock, 
  BarChart3, 
  Download, 
  FileDown, 
  CheckCircle2, 
  TimerIcon,
  Info
} from 'lucide-react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import SimulationResultsView from './SimulationResultsView';
import { useDatabase } from '../../context/DatabaseContext';
import { useSimulation } from '../../context/SimulationContext';
import axios from 'axios';

const SimulationPage = () => {
  const { scenarios, loading: dbLoading } = useDatabase();
  const { uploadedFiles, parsedData } = useSimulation();
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSimulations, setCompletedSimulations] = useState(0);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceStats, setResourceStats] = useState<any>(null);
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const wsRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsRef.current = new ReconnectingWebSocket('ws://localhost:8000/ws/system-resources/');
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setResourceStats(data);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleScenarioChange = (event: any) => {
    const scenarioId = event.target.value;
    setSelectedScenario(scenarioId);
    
    // Find scenario for setting total simulations
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setTotalSimulations(scenario.total_simulations);
    } else {
      setTotalSimulations(0);
    }
    
    // Reset simulation state
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCompletedSimulations(0);
    setIsComplete(false);
    setError(null);
  };

  const handleStartSimulation = async () => {
    try {
      setConfirmDialogOpen(false);
      setIsRunning(true);
      setIsPaused(false);
      setProgress(0);
      setCompletedSimulations(0);
      setIsComplete(false);
      setError(null);

      // Get selected scenario details
      const scenario = scenarios.find(s => s.id === selectedScenario);
      if (!scenario || !uploadedFiles.length) {
        throw new Error('Missing scenario or IDF files');
      }

      // Create FormData with files
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('idf_files', file);
      });

      // Add scenario data
      formData.append('scenario_id', scenario.id);
      formData.append('scenario_name', scenario.name);
      formData.append('parallel', 'true');
      formData.append('max_workers', '4');

      // Start simulation
      const response = await axios.post('/api/simulation/run/', formData);
      const { simulation_id } = response.data;

      // Poll for progress
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await axios.get(`/api/simulation/${simulation_id}/status/`);
          const { status, progress: currentProgress } = statusResponse.data;

          setProgress(currentProgress);
          setCompletedSimulations(Math.floor((currentProgress / 100) * totalSimulations));

          if (status === 'completed') {
            clearInterval(pollInterval);
            setIsRunning(false);
            setIsComplete(true);

            // Fetch results
            const resultsResponse = await axios.get(`/api/simulation/${simulation_id}/parallel-results/`);
            setSimulationResults(resultsResponse.data);
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            throw new Error('Simulation failed');
          }
        } catch (err) {
          clearInterval(pollInterval);
          throw err;
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
      setIsRunning(false);
    }
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

  // Calculate ETA in minutes
  const calculateETA = () => {
    if (progress === 0) return '--';
    const percentageComplete = progress / 100;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const estimatedTotalTime = timeElapsed / percentageComplete;
    const remainingTime = estimatedTotalTime * (1 - percentageComplete);
    return remainingTime.toFixed(1);
  };

  const startTime = Date.now() - 60000; // 1 minute ago for demo purposes

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Simulation Runner
      </Typography>
      <Typography variant="body1" paragraph>
        Run and monitor batch simulations for your saved scenarios.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Control
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {dbLoading ? (
                <Alert severity="info">Loading scenarios...</Alert>
              ) : scenarios.length === 0 ? (
                <Alert severity="warning">
                  No scenarios available. Please create a scenario first on the Scenario Setup page.
                </Alert>
              ) : (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="scenario-select-label">Select Scenario</InputLabel>
                  <Select
                    labelId="scenario-select-label"
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
                    
                    {isComplete && (
                      <Button 
                        variant="contained" 
                        color="success" 
                        startIcon={<BarChart3 size={18} />}
                        fullWidth
                      >
                        View Detailed Results
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Simulation Progress
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {!selectedScenario ? (
              <Alert severity="info">
                Select a scenario to view simulation details.
              </Alert>
            ) : (
              <Box>
                {error && (
                  <Alert severity="error\" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
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
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Cpu size={20} style={{ marginRight: '8px', color: '#1976d2' }} />
                          <Typography variant="body2" color="text.secondary">
                            CPU Usage
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {resourceStats?.cpu?.percent || '--'}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Clock size={20} style={{ marginRight: '8px', color: '#1976d2' }} />
                          <Typography variant="body2" color="text.secondary">
                            Memory
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {resourceStats?.memory?.percent || '--'}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircle2 size={20} style={{ marginRight: '8px', color: '#388e3c' }} />
                          <Typography variant="body2" color="text.secondary">
                            Completed
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {completedSimulations}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <TimerIcon size={20} style={{ marginRight: '8px', color: '#f57c00' }} />
                          <Typography variant="body2" color="text.secondary">
                            ETA (min)
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ mt: 1 }}>
                          {isRunning ? calculateETA() : '--'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {isComplete && simulationResults && (
                  <SimulationResultsView results={simulationResults} />
                )}
                
                {!isRunning && !isPaused && !isComplete && (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Click "Run Batch Simulation" to start
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
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
                • CPU Cores: {resourceStats?.cpu?.physical_cores || '?'} of {resourceStats?.cpu?.logical_cores || '?'} available
              </Typography>
              <Typography variant="body2">
                • Parallel Simulations: 4
              </Typography>
              <Typography variant="body2">
                • Estimated Memory Usage: ~{Math.ceil(totalSimulations * 0.5)}GB
              </Typography>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleStartSimulation} 
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