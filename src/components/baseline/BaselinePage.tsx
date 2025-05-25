import { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  LinearProgress,
  Chip
} from '@mui/material';
import { Upload, BarChart, Building, Wind } from 'lucide-react';
import UploadArea from './UploadArea';
import AssignmentsTab from './AssignmentsTab';
import InfiltrationTab from './InfiltrationTab';
import ResultsTab from './ResultsTab';

const BaselinePage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [weatherFile, setWeatherFile] = useState<File | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationComplete, setSimulationComplete] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleFilesUploaded = (files: File[], weatherFile: File | null) => {
    setUploadedFiles(files);
    setWeatherFile(weatherFile);
  };

  const handleRunSimulation = () => {
    if (uploadedFiles.length === 0 || !weatherFile) return;
    
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
            setTabIndex(2); // Switch to Results tab
          }, 500);
        }
        return newProgress;
      });
    }, 500);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Baseline Modeling
      </Typography>
      <Typography variant="body1" paragraph>
        Upload baseline IDF and weather files, run simulations, and extract components.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Upload size={20} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />
                Upload Files
              </Typography>
              
              <UploadArea onFilesUploaded={handleFilesUploaded} />
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Uploaded Files:
                </Typography>
                {uploadedFiles.length > 0 ? (
                  <Box sx={{ mb: 2 }}>
                    {uploadedFiles.map((file, index) => (
                      <Chip 
                        key={index} 
                        label={file.name} 
                        variant="outlined" 
                        size="small" 
                        sx={{ mr: 1, mb: 1 }} 
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No IDF files uploaded
                  </Typography>
                )}
                
                <Typography variant="subtitle2" gutterBottom>
                  Weather File:
                </Typography>
                {weatherFile ? (
                  <Chip 
                    label={weatherFile.name} 
                    variant="outlined" 
                    color="primary"
                    size="small" 
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No weather file uploaded
                  </Typography>
                )}
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mt: 3 }}
                disabled={uploadedFiles.length === 0 || !weatherFile || simulating}
                onClick={handleRunSimulation}
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
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab 
                icon={<Building size={18} />} 
                iconPosition="start" 
                label="Assignments" 
                disabled={uploadedFiles.length === 0}
              />
              <Tab 
                icon={<Wind size={18} />} 
                iconPosition="start" 
                label="Infiltration" 
                disabled={uploadedFiles.length === 0}
              />
              <Tab 
                icon={<BarChart size={18} />} 
                iconPosition="start" 
                label="Results" 
                disabled={!simulationComplete}
              />
            </Tabs>
          </Paper>

          <Box sx={{ mt: 3 }}>
            {tabIndex === 0 && (
              <AssignmentsTab 
                uploadedFiles={uploadedFiles}
                simulationComplete={simulationComplete}
              />
            )}
            {tabIndex === 1 && (
              <InfiltrationTab 
                uploadedFiles={uploadedFiles}
                simulationComplete={simulationComplete}
              />
            )}
            {tabIndex === 2 && (
              <ResultsTab 
                uploadedFiles={uploadedFiles}
                simulationComplete={simulationComplete}
              />
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BaselinePage;