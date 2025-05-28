import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Tabs,
  Tab,
  Divider,
  CircularProgress
} from '@mui/material';
import { Download, FileText, BarChart } from 'lucide-react';

interface ResultsTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
  simulationResults: any; // This will come from the simulation endpoint
}

const ResultsTab = ({ uploadedFiles, simulationComplete, simulationResults }: ResultsTabProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (uploadedFiles.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please upload IDF files to view simulation results.
      </Alert>
    );
  }

  if (!simulationComplete) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Run the baseline simulation to view results.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!simulationResults) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No simulation results available.
      </Alert>
    );
  }

  // Ensure simulationResults is an array for consistency
  const resultsArray = Array.isArray(simulationResults) 
    ? simulationResults 
    : [simulationResults];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Baseline Simulation Results
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {resultsArray.map((result, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  {result.fileName || 'Simulation Result'}
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Energy Use:
                    </Typography>
                    <Typography variant="h5">
                      {result.totalEnergyUse ? result.totalEnergyUse.toFixed(1) : '0.0'} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Simulation Runtime:
                    </Typography>
                    <Typography variant="h5">
                      {result.runTime ? result.runTime.toFixed(1) : '0.0'} seconds
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Heating Demand:
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {result.heatingDemand ? result.heatingDemand.toFixed(1) : '0.0'} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Cooling Demand:
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {result.coolingDemand ? result.coolingDemand.toFixed(1) : '0.0'} kWh/m²
                    </Typography>
                  </Grid>
                </Grid>
                
                {result.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {result.error}
                  </Alert>
                )}
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button 
                  startIcon={<FileText size={18} />} 
                  size="small"
                  onClick={() => window.open(`http://localhost:8000/media/simulation_results/${result.simulationId}/output.html`, '_blank')}
                >
                  View HTML Report
                </Button>
                <Button 
                  startIcon={<Download size={18} />} 
                  size="small" 
                  variant="outlined"
                  onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/download/`, '_blank')}
                >
                  Download Results
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Summary" />
          <Tab label="Energy Use" />
          <Tab label="Raw Data" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Simulation Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell align="right">Total Energy Use (kWh/m²)</TableCell>
                      <TableCell align="right">Heating (kWh/m²)</TableCell>
                      <TableCell align="right">Cooling (kWh/m²)</TableCell>
                      <TableCell align="right">Lighting (kWh/m²)</TableCell>
                      <TableCell align="right">Equipment (kWh/m²)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultsArray.map((result, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{result.fileName || `Result ${idx+1}`}</TableCell>
                        <TableCell align="right">{result.totalEnergyUse ? result.totalEnergyUse.toFixed(1) : '0.0'}</TableCell>
                        <TableCell align="right">{result.heatingDemand ? result.heatingDemand.toFixed(1) : '0.0'}</TableCell>
                        <TableCell align="right">{result.coolingDemand ? result.coolingDemand.toFixed(1) : '0.0'}</TableCell>
                        <TableCell align="right">{result.lightingDemand ? result.lightingDemand.toFixed(1) : '0.0'}</TableCell>
                        <TableCell align="right">{result.equipmentDemand ? result.equipmentDemand.toFixed(1) : '0.0'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {resultsArray.length > 0 ? (
                    'Energy use breakdown for selected simulation'
                  ) : (
                    'No data available for visualization'
                  )}
                </Typography>
                {resultsArray.length > 0 ? (
                  <div>
                    {/* Here you would implement a chart using a library like recharts */}
                    {/* For now we'll just use the placeholder */}
                    <BarChart size={100} style={{ color: '#9e9e9e' }} />
                  </div>
                ) : (
                  <BarChart size={100} style={{ color: '#9e9e9e' }} />
                )}
              </Box>
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Energy Use Breakdown
              </Typography>
              {resultsArray.length > 0 && resultsArray[0].energy_use ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>End Use</TableCell>
                        <TableCell align="right">Electricity (kWh)</TableCell>
                        <TableCell align="right">District Heating (kWh)</TableCell>
                        <TableCell align="right">Total (kWh)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(resultsArray[0].energy_use).map(([endUse, values]: [string, any], idx) => (
                        <TableRow key={idx}>
                          <TableCell>{endUse}</TableCell>
                          <TableCell align="right">{values.electricity?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell align="right">{values.district_heating?.toFixed(1) || '0.0'}</TableCell>
                          <TableCell align="right">{values.total?.toFixed(1) || '0.0'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No detailed energy use data available.</Alert>
              )}
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Raw Simulation Data
              </Typography>
              <Paper sx={{ p: 2, maxHeight: '400px', overflow: 'auto' }}>
                <pre>{JSON.stringify(resultsArray, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Download size={18} />}
          onClick={() => {
            // Create a Blob with the JSON data
            const blob = new Blob([JSON.stringify(resultsArray, null, 2)], { type: 'application/json' });
            // Create a link element and click it to download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'simulation-results.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Results as JSON
        </Button>
      </Box>
    </Box>
  );
};

export default ResultsTab;