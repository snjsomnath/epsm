import { useState } from 'react';
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
  Stack
} from '@mui/material';
import { Play, FileText, Wind } from 'lucide-react';
import IdfUploadArea from './IdfUploadArea';
import EpwUploadArea from './EpwUploadArea';
import AssignmentsTab from './AssignmentsTab';
import ResultsTab from './ResultsTab';
import { parseIdfFiles } from '../../utils/api';

const BaselinePage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleIdfFilesUploaded = async (files: File[]) => {
    setUploadedFiles(files);
    if (files.length > 0) {
      try {
        setParsing(true);
        setParseError(null);
        setParsedData(null);
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
    } else {
      setParsedData(null);
      setParseError(null);
    }
  };

  const handleWeatherFileUploaded = (file: File | null) => {
    setWeatherFile(file);
  };

  const handleRunSimulation = () => {
    if (!weatherFile || uploadedFiles.length === 0) return;
    
    setSimulating(true);
    setProgress(0);
    
    // Simulate progress
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        const newProgress = Math.min(oldProgress + Math.random() * 10, 100);
        if (newProgress === 100) {
          clearInterval(timer);
          setTimeout(() => {
            setSimulationComplete(true);
            setSimulating(false);
          }, 500);
        }
        return newProgress;
      });
    }, 500);
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
        {uploadedFiles.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Component Analysis
              </Typography>
              <AssignmentsTab 
                uploadedFiles={uploadedFiles}
                parsedData={parsedData}
              />
            </Paper>
          </Grid>
        )}

        {/* Simulation Setup Section */}
        {uploadedFiles.length > 0 && parsedData && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Wind size={20} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />
                  Simulation Setup
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Weather Data
                    </Typography>
                    <EpwUploadArea onFileUploaded={handleWeatherFileUploaded} />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Simulation Control
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      fullWidth 
                      startIcon={<Play size={18} />}
                      disabled={!weatherFile || simulating}
                      onClick={handleRunSimulation}
                      sx={{ mt: 2 }}
                    >
                      Run Baseline Simulation
                    </Button>
                    
                    {simulating && (
                      <Box sx={{ width: '100%', mt: 2 }}>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography variant="caption" align="center" sx={{ display: 'block', mt: 1 }}>
                          Simulating... {Math.round(progress)}%
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Results Section */}
        {simulationComplete && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Simulation Results
              </Typography>
              <ResultsTab 
                uploadedFiles={uploadedFiles}
                simulationComplete={simulationComplete}
              />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default BaselinePage;