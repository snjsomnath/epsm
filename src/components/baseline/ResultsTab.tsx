import { useState } from 'react';
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
  Divider
} from '@mui/material';
import { Download, FileText, BarChart } from 'lucide-react';

interface ResultsTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
}

interface SimulationResult {
  fileName: string;
  totalEnergyUse: number;
  heatingDemand: number;
  coolingDemand: number;
  runTime: number;
  status: 'success' | 'warning' | 'error';
  message?: string;
}

const ResultsTab = ({ uploadedFiles, simulationComplete }: ResultsTabProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [results] = useState<SimulationResult[]>([
    {
      fileName: 'office.idf',
      totalEnergyUse: 156.8,
      heatingDemand: 42.3,
      coolingDemand: 35.6,
      runTime: 45.2,
      status: 'success'
    },
    {
      fileName: 'residential.idf',
      totalEnergyUse: 98.5,
      heatingDemand: 65.1,
      coolingDemand: 12.4,
      runTime: 38.7,
      status: 'success'
    }
  ]);

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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Baseline Simulation Results
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {results.map((result, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  {result.fileName}
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Energy Use:
                    </Typography>
                    <Typography variant="h5">
                      {result.totalEnergyUse.toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Simulation Runtime:
                    </Typography>
                    <Typography variant="h5">
                      {result.runTime.toFixed(1)} seconds
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Heating Demand:
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {result.heatingDemand.toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Cooling Demand:
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {result.coolingDemand.toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button startIcon={<FileText size={18} />} size="small">
                  View HTML Report
                </Button>
                <Button 
                  startIcon={<Download size={18} />} 
                  size="small" 
                  variant="outlined"
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
          <Tab label="Comfort" />
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
                    <TableRow>
                      <TableCell>office.idf</TableCell>
                      <TableCell align="right">156.8</TableCell>
                      <TableCell align="right">42.3</TableCell>
                      <TableCell align="right">35.6</TableCell>
                      <TableCell align="right">45.2</TableCell>
                      <TableCell align="right">33.7</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>residential.idf</TableCell>
                      <TableCell align="right">98.5</TableCell>
                      <TableCell align="right">65.1</TableCell>
                      <TableCell align="right">12.4</TableCell>
                      <TableCell align="right">11.8</TableCell>
                      <TableCell align="right">9.2</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Energy use breakdown visualization would appear here
                </Typography>
                <BarChart size={100} style={{ color: '#9e9e9e' }} />
              </Box>
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1">
                Detailed energy use charts and data would be displayed here.
              </Typography>
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1">
                Thermal comfort metrics and analysis would be displayed here.
              </Typography>
            </Box>
          )}
          
          {tabValue === 3 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body1">
                Raw simulation output data would be available here.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<BarChart size={18} />}
        >
          Generate Detailed Report
        </Button>
      </Box>
    </Box>
  );
};

export default ResultsTab;