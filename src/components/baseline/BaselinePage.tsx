import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Grid, 
  Card, 
  CardContent,
  Button,
  Divider,
  Alert,
  LinearProgress,
  Stack,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { Play, FileText, AlertCircle, BarChart2 } from 'lucide-react';
import IdfUploadArea from './IdfUploadArea';
import EpwUploadArea from './EpwUploadArea';
import AssignmentsTab from './AssignmentsTab';
import ResultsTab from './ResultsTab';
import { parseIdfFiles } from '../../utils/api';
import type { ParsedData } from '../../types/simulation';

const BaselinePage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);

  const handleIdfFilesUploaded = async (files: File[]) => {
    if (files.length === 0) {
      setParsedData(null);
      setParseError(null);
      setUploadedFiles([]);
      return;
    }

    try {
      setParsing(true);
      setParseError(null);
      setParsedData(null);
      setUploadedFiles(files);
      
      const { data, error } = await parseIdfFiles(files);
      
      if (error) {
        throw new Error(error);
      }
      
      setParsedData(data);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse IDF files');
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleWeatherFileUploaded = (file: File | null) => {
    setWeatherFile(file);
  };

  const handleRunSimulation = async () => {
    if (!weatherFile || uploadedFiles.length === 0) return;
    
    try {
      setSimulating(true);
      setProgress(0);
      setSimulationComplete(false);
      setParseError(null); // Clear any previous errors
      
      // Create form data for file upload
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('idf_files', file);
      });
      formData.append('weather_file', weatherFile);
      
      console.log("Sending files to server:", uploadedFiles.map(f => f.name), weatherFile.name);
      
      // Use the correct backend URL
      const backendUrl = 'http://localhost:8000'; // Update this to your Django backend URL
      
      // Check if backend is reachable first - use an existing endpoint
      try {
        // Try to access the system-resources endpoint which is defined in urls.py
        const pingResponse = await fetch(`${backendUrl}/api/simulation/system-resources/`, { 
          method: 'GET',
          // Add a short timeout to quickly detect if server is unreachable
          signal: AbortSignal.timeout(3000) 
        });
        
        if (!pingResponse.ok) {
          throw new Error(`Server responded with ${pingResponse.status}: ${pingResponse.statusText}`);
        }
        
        // Log success if ping was successful
        console.log("Backend connection successful, server is running");
      } catch (connectionError) {
        console.error("Backend connection error:", connectionError);
        throw new Error(
          "Cannot connect to the simulation server. Please ensure the Django backend is running at " + 
          backendUrl + " and try again."
        );
      }
      
      // Start the simulation and get simulation ID
      try {
        const response = await fetch(`${backendUrl}/api/simulation/run/`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        // Parse the JSON response safely
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          throw new Error("Invalid server response format");
        }
        
        const simulation_id = data.simulation_id;
        
        if (!simulation_id) {
          throw new Error('No simulation ID returned from server');
        }
        
        console.log("Simulation started with ID:", simulation_id);
        
        // Poll for simulation status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${backendUrl}/api/simulation/${simulation_id}/status/`);
            
            if (!statusResponse.ok) {
              clearInterval(pollInterval);
              throw new Error(`Server responded with ${statusResponse.status}: ${statusResponse.statusText}`);
            }
            
            const statusData = await statusResponse.json();
            
            // Update progress
            setProgress(statusData.progress);
            
            // Check if simulation is complete
            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              
              try {
                // Fetch simulation results
                const resultsResponse = await fetch(`${backendUrl}/api/simulation/${simulation_id}/results/`);
                
                if (!resultsResponse.ok) {
                  console.error(`Error fetching results: ${resultsResponse.status}`);
                  // If we can't fetch the results, we'll set an error in the simulationResults
                  setSimulationResults({
                    error: `Failed to fetch results: ${resultsResponse.statusText}`,
                    simulationId: simulation_id,
                    fileName: uploadedFiles[0]?.name || "Unknown file",
                    totalEnergyUse: 0,
                    heatingDemand: 0,
                    coolingDemand: 0,
                    runTime: 0
                  });
                } else {
                  try {
                    const resultsData = await resultsResponse.json();
                    // Add the simulation ID to the results for reference
                    if (Array.isArray(resultsData)) {
                      resultsData.forEach(result => {
                        result.simulationId = simulation_id;
                        // Ensure required fields exist
                        if (!result.fileName && uploadedFiles.length > 0) {
                          result.fileName = uploadedFiles[0].name;
                        }
                      });
                    } else {
                      resultsData.simulationId = simulation_id;
                      // Ensure required fields exist
                      if (!resultsData.fileName && uploadedFiles.length > 0) {
                        resultsData.fileName = uploadedFiles[0].name;
                      }
                    }
                    console.log("Received simulation results:", resultsData);
                    setSimulationResults(resultsData);
                  } catch (jsonError) {
                    console.error("Error parsing results JSON:", jsonError);
                    setSimulationResults({
                      error: `Error parsing results: ${jsonError.message}`,
                      simulationId: simulation_id,
                      fileName: uploadedFiles[0]?.name || "Unknown file",
                      totalEnergyUse: 0,
                      heatingDemand: 0,
                      coolingDemand: 0,
                      runTime: 0
                    });
                  }
                }
                
                setSimulationComplete(true);
                setSimulating(false);
                setTabIndex(0); // Switch to Results tab
              } catch (resultError) {
                console.error("Error fetching results:", resultError);
                setSimulationResults({
                  error: `Error fetching results: ${resultError.message}`,
                  simulationId: simulation_id
                });
                setSimulationComplete(true);
                setSimulating(false);
              }
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              throw new Error(statusData.error_message || 'Simulation failed');
            }
          } catch (err) {
            clearInterval(pollInterval);
            throw err;
          }
        }, 2000); // Poll every 2 seconds
        
      } catch (fetchError) {
        console.error("Error sending simulation request:", fetchError);
        if (fetchError.message.includes("Failed to fetch")) {
          throw new Error("Connection to the simulation server failed. Please check if the server is running.");
        } else {
          throw fetchError;
        }
      }
      
    } catch (err) {
      setSimulating(false);
      setParseError(err instanceof Error ? err.message : 'An error occurred during simulation');
      console.error("Simulation error:", err);
      
      // Show a more user-friendly error dialog when connection fails
      if (err instanceof Error && 
         (err.message.includes("Failed to fetch") || 
          err.message.includes("Cannot connect") || 
          err.message.includes("Connection to the simulation server failed"))) {
        setParseError(
          "Could not connect to the simulation server. Please ensure that:\n" +
          "1. The Django server is running (python manage.py runserver)\n" +
          "2. The server is running on http://localhost:8000\n" +
          "3. There are no firewall or network issues blocking the connection"
        );
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Baseline Modeling
      </Typography>
      <Typography variant="body1" paragraph>
        Upload baseline IDF files, analyze components, and run simulations.
      </Typography>
      
      <Grid container spacing={3}>
        {/* IDF Upload Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FileText size={20} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />
                IDF Files
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload one or more IDF files to analyze their components
              </Typography>
              
              <IdfUploadArea onFilesUploaded={handleIdfFilesUploaded} />
              
              {parsing && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>
                    Analyzing IDF components...
                  </Typography>
                </Box>
              )}
              
              {parseError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {parseError}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Component Analysis Section */}
        <Grid item xs={12}>
          <Paper>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Component Analysis
              </Typography>
              <AssignmentsTab 
                uploadedFiles={uploadedFiles}
                parsedData={parsedData}
              />
            </CardContent>
          </Paper>
        </Grid>

        {/* Weather File Upload Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <FileText size={20} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />
                Weather File
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upload a weather file (EPW format) for the simulation
              </Typography>
              
              <EpwUploadArea onFileUploaded={handleWeatherFileUploaded} />
            </CardContent>
          </Card>
        </Grid>

        {/* Simulation Control Section */}
        <Grid item xs={12}>
          <Card sx={{ opacity: uploadedFiles.length === 0 ? 0.7 : 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6">
                  Simulation Setup
                </Typography>
                {uploadedFiles.length === 0 && (
                  <Tooltip title="Upload IDF files first to enable simulation setup">
                    <AlertCircle size={18} color="#666" />
                  </Tooltip>
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure and run the baseline simulation
              </Typography>

              <Stack spacing={3}>
                <Box>
                  <Tooltip title={uploadedFiles.length === 0 ? "Upload IDF files first" : !weatherFile ? "Upload weather file to enable simulation" : ""}>
                    <span>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth 
                        startIcon={<Play size={18} />}
                        disabled={uploadedFiles.length === 0 || !weatherFile || simulating}
                        onClick={handleRunSimulation}
                        size="large"
                      >
                        Run Baseline Simulation
                      </Button>
                    </span>
                  </Tooltip>
                  
                  {simulating && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress variant="determinate" value={progress} />
                      <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>
                        Simulating... {Math.round(progress)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12}>
          <Paper>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabIndex} 
                onChange={(e, newValue) => setTabIndex(newValue)}
                sx={{ px: 2, pt: 2 }}
              >
                <Tab 
                  icon={<BarChart2 size={18} />} 
                  iconPosition="start" 
                  label="Results" 
                  disabled={!simulationComplete}
                />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {!simulationComplete && (
                <Alert severity="info">
                  Run the baseline simulation to view results
                </Alert>
              )}
              
              {simulationComplete && (
                <ResultsTab 
                  uploadedFiles={uploadedFiles}
                  simulationComplete={simulationComplete}
                  simulationResults={simulationResults}
                />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BaselinePage;