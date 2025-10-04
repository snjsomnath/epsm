import React, { useState, useMemo, useEffect } from 'react';
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
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Pagination,
  TextField,
  MenuItem,
  Stack
} from '@mui/material';
import { Download, FileText, Zap, Thermometer, Snowflake, Clock } from 'lucide-react';
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
  const [rawDataRendered, setRawDataRendered] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage, setLinesPerPage] = useState(100);
  const [isLoadingRawData, setIsLoadingRawData] = useState(false);
  const [rawDataChunks, setRawDataChunks] = useState<string[]>([]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Only render raw data when the tab is actually selected
    if (newValue === 2 && !rawDataRendered) {
      setRawDataRendered(true);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleLinesPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinesPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
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

  const toNumber = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const buildEnergyBreakdownChartData = (items: any[]) => {
    const labels = items.map((result, idx) => result.fileName || `Result ${idx + 1}`);
    const heating = items.map(result => toNumber(result.heating ?? result.heatingDemand ?? result.heating_intensity));
    const cooling = items.map(result => toNumber(result.cooling ?? result.coolingDemand ?? result.cooling_intensity));
    const lighting = items.map(result => toNumber(result.lightingDemand ?? result.lighting_demand));
    const equipment = items.map(result => toNumber(result.equipmentDemand ?? result.equipment_demand));
    const electricity = lighting.map((value, idx) => Math.max(0, value + equipment[idx]));

    return {
      labels,
      datasets: [
        {
          label: 'Heating (kWh/m²)',
          data: heating,
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
          borderColor: 'rgba(211, 47, 47, 1)',
          borderWidth: 1,
          stack: 'energy'
        },
        {
          label: 'Cooling (kWh/m²)',
          data: cooling,
          backgroundColor: 'rgba(33, 150, 243, 0.8)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 1,
          stack: 'energy'
        },
        {
          label: 'Electric (kWh/m²)',
          data: electricity,
          backgroundColor: 'rgba(255, 193, 7, 0.8)',
          borderColor: 'rgba(255, 160, 0, 1)',
          borderWidth: 1,
          stack: 'energy'
        }
      ]
    };
  };

  const energyBreakdownChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Heating vs Cooling vs Electric (kWh/m²)' },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const rawValue = typeof context.raw === 'number' ? context.raw : Number(context.raw || 0);
            return `${context.dataset.label}: ${rawValue.toFixed(1)} kWh/m²`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: 'Simulation File' }
      },
      y: {
        stacked: true,
        title: { display: true, text: 'kWh/m²' }
      }
    }
  };

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

  // Allow viewing results even without uploaded files (for historical runs)
  if (uploadedFiles.length === 0 && !simulationResults) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please upload IDF files to view simulation results.
      </Alert>
    );
  }

  // Ensure simulationResults is an array for consistency
  const resultsArray = Array.isArray(simulationResults) 
    ? simulationResults 
    : [simulationResults];

  // Get chart data from the first result (if multiple files)
  const chartData = formatEnergyUseData(resultsArray[0]?.energy_use);
  const energyBreakdownChartData = buildEnergyBreakdownChartData(resultsArray);

  // Process raw data in chunks to avoid freezing the UI
  useEffect(() => {
    if (!rawDataRendered) {
      setRawDataChunks([]);
      setIsLoadingRawData(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingRawData(true);

    // Process in the next tick to avoid blocking the render
    const processData = async () => {
      try {
        const jsonString = JSON.stringify(resultsArray, null, 2);
        
        // Split into lines
        const lines = jsonString.split('\n');
        
        if (isCancelled) return;
        
        setRawDataChunks(lines);
        setIsLoadingRawData(false);
      } catch (error) {
        console.error('Error processing raw data:', error);
        if (!isCancelled) {
          setIsLoadingRawData(false);
        }
      }
    };

    // Delay slightly to ensure tab switch animation completes
    const timeoutId = setTimeout(processData, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [resultsArray, rawDataRendered]);

  // Calculate pagination for raw data
  const totalPages = useMemo(() => 
    Math.ceil(rawDataChunks.length / linesPerPage),
    [rawDataChunks.length, linesPerPage]
  );

  const paginatedRawData = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    const endIndex = startIndex + linesPerPage;
    return rawDataChunks.slice(startIndex, endIndex).join('\n');
  }, [rawDataChunks, currentPage, linesPerPage]);

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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Zap size={16} /> Total Energy:
                    </Typography>
                    <Typography variant="h5">
                      {(Number(result.totalEnergy ?? result.totalEnergyUse ?? result.totalEnergyUse_kwh ?? 0)).toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Clock size={16} /> Simulation Runtime:
                    </Typography>
                    <Typography variant="h5">
                      {(Number(result.runTime ?? result.run_time ?? result.elapsedSeconds ?? 0)).toFixed(1)} seconds
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Thermometer size={16} /> Heating:
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {(Number(result.heating ?? result.heatingDemand ?? 0)).toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Snowflake size={16} /> Cooling:
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      {(Number(result.cooling ?? result.coolingDemand ?? 0)).toFixed(1)} kWh/m²
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
                  onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/download/`, '_blank')}
                >
                  View HTML Report
                </Button>
                <Button 
                  startIcon={<Download size={18} />} 
                  size="small" 
                  variant="outlined"
                  onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/results/`, '_blank')}
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
                        <TableCell align="right">{(Number(result.totalEnergy ?? result.totalEnergyUse ?? 0)).toFixed(1)}</TableCell>
                        <TableCell align="right">{(Number(result.heating ?? result.heatingDemand ?? 0)).toFixed(1)}</TableCell>
                        <TableCell align="right">{(Number(result.cooling ?? result.coolingDemand ?? 0)).toFixed(1)}</TableCell>
                        <TableCell align="right">{(Number(result.lightingDemand ?? result.lighting_demand ?? 0)).toFixed(1)}</TableCell>
                        <TableCell align="right">{(Number(result.equipmentDemand ?? result.equipment_demand ?? 0)).toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {resultsArray.length > 0 && (
                <Box sx={{ height: 400, mt: 4 }}>
                  <Bar data={energyBreakdownChartData} options={energyBreakdownChartOptions} />
                </Box>
              )}

              {/* Only show the single IDF chart if only one result */}
              {resultsArray.length === 1 && chartData && (
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
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Raw Simulation Data
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    size="small"
                    label="Lines per page"
                    value={linesPerPage}
                    onChange={handleLinesPerPageChange}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value={50}>50 lines</MenuItem>
                    <MenuItem value={100}>100 lines</MenuItem>
                    <MenuItem value={200}>200 lines</MenuItem>
                    <MenuItem value={500}>500 lines</MenuItem>
                    <MenuItem value={1000}>1000 lines</MenuItem>
                  </TextField>
                  {rawDataChunks.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Total lines: {rawDataChunks.length.toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {isLoadingRawData ? (
                <Paper sx={{ p: 2, minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading raw data...
                    </Typography>
                  </Box>
                </Paper>
              ) : rawDataChunks.length > 0 ? (
                <>
                  <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto', bgcolor: '#f5f5f5' }}>
                    <Typography 
                      component="pre" 
                      sx={{ 
                        margin: 0, 
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {paginatedRawData}
                    </Typography>
                  </Paper>
                  
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Pagination 
                        count={totalPages} 
                        page={currentPage} 
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Showing lines {((currentPage - 1) * linesPerPage) + 1} to {Math.min(currentPage * linesPerPage, rawDataChunks.length)} of {rawDataChunks.length.toLocaleString()}
                  </Alert>
                </>
              ) : (
                <Paper sx={{ p: 2, minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography color="text.secondary">
                    No raw data available
                  </Typography>
                </Paper>
              )}
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
