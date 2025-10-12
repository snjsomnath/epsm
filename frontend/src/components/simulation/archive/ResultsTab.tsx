import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Divider,
  Chip,
  Alert,
  Stack
  ,Grid, Card, CardContent, CardActions
} from '@mui/material';
import { BarChart3, Download, FileDown, FileText } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ResultsTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
  simulationResults: any;
}

const ResultsTab = ({ uploadedFiles, simulationComplete, simulationResults }: ResultsTabProps) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format energy use data for the chart
  const formatEnergyUseData = (energyUse: any) => {
    if (!energyUse) return null;

    const categories = Object.keys(energyUse).filter(key => 
      energyUse[key].total > 0 // Only show categories with non-zero values
    );

    const electricityData = categories.map(cat => energyUse[cat].electricity || 0);
    const districtHeatingData = categories.map(cat => energyUse[cat].district_heating || 0);

    return {
      labels: categories,
      datasets: [
        {
          label: 'Electricity',
          data: electricityData,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          stack: 'Stack 0',
        },
        {
          label: 'District Heating',
          data: districtHeatingData,
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          stack: 'Stack 0',
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Energy Use by End Use (kWh)',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            return `${context.dataset.label}: ${value.toLocaleString()} kWh`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          autoSkip: false,
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Energy Use (kWh)'
        }
      }
    }
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

  // Get chart data from the first result (if multiple files)
  const chartData = formatEnergyUseData(resultsArray[0]?.energy_use);

  const fmt = (v: any, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '0.0';
    return Number(v).toFixed(digits);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Baseline Simulation Results
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {resultsArray.map((result, index) => (
          <Grid item xs={12} md={6} key={`result-card-${index}-${result.simulationId}`}>
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
                      {fmt(result.totalEnergyUse)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Simulation Runtime:
                    </Typography>
                      <Typography variant="h5">
                      {fmt(result.runTime)} seconds
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Heating Demand:
                    </Typography>
                      <Typography variant="h6" color="error.main">
                      {fmt(result.heatingDemand)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Cooling Demand:
                    </Typography>
                      <Typography variant="h6" color="info.main">
                      {fmt(result.coolingDemand)} kWh/m²
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
                  onClick={() => {
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                    window.open(`${baseUrl}/api/simulation/${result.simulationId}/download/`, '_blank');
                  }}
                >
                  View HTML Report
                </Button>
                <Button 
                  startIcon={<Download size={18} />} 
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                    window.open(`${baseUrl}/api/simulation/${result.simulationId}/results/`, '_blank');
                  }}
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
                      <TableRow key={`summary-row-${idx}-${result.simulationId}`}>
                        <TableCell>{result.fileName || `Result ${idx+1}`}</TableCell>
                        <TableCell align="right">{fmt(result.totalEnergyUse)}</TableCell>
                        <TableCell align="right">{fmt(result.heatingDemand)}</TableCell>
                        <TableCell align="right">{fmt(result.coolingDemand)}</TableCell>
                        <TableCell align="right">{fmt(result.lightingDemand)}</TableCell>
                        <TableCell align="right">{fmt(result.equipmentDemand)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {chartData && (
                <Box sx={{ height: '400px', mt: 4 }}>
                  <Bar data={chartData} options={chartOptions} />
                </Box>
              )}
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
                        <TableRow key={`energy-row-${idx}-${endUse}`}>
                          <TableCell>{endUse}</TableCell>
                          <TableCell align="right">{fmt(values.electricity)}</TableCell>
                          <TableCell align="right">{fmt(values.district_heating)}</TableCell>
                          <TableCell align="right">{fmt(values.total)}</TableCell>
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