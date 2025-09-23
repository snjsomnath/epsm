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
  Alert,
  Stack,
  Chip,
  Grid
} from '@mui/material';
import { Download, FileDown, BarChart3 } from 'lucide-react';
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

interface SimulationResultsViewProps {
  results: any[];
}

const SimulationResultsView = ({ results }: SimulationResultsViewProps) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Format data for chart
  const chartData = {
    labels: results.map(r => r.fileName),
    datasets: [
      {
        label: 'Total Energy Use',
        data: results.map(r => r.totalEnergyUse),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: 'Heating Demand',
        data: results.map(r => r.heatingDemand),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      },
      {
        label: 'Cooling Demand',
        data: results.map(r => r.coolingDemand),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Energy Performance Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energy (kWh/m²)'
        }
      }
    }
  };

  const fmt = (v: any, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
    return Number(v).toFixed(digits);
  };

  return (
    <Box>
      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Summary" />
          <Tab label="Details" />
          <Tab label="Raw Data" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Simulation Results Summary
              </Typography>
              
              <Box sx={{ height: '400px', mb: 4 }}>
                <Bar data={chartData} options={chartOptions} />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell align="right">Total Energy (kWh/m²)</TableCell>
                      <TableCell align="right">Heating (kWh/m²)</TableCell>
                      <TableCell align="right">Cooling (kWh/m²)</TableCell>
                      <TableCell align="right">Runtime (s)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.fileName}</TableCell>
                        <TableCell align="right">{fmt(result.totalEnergyUse)}</TableCell>
                        <TableCell align="right">{fmt(result.heatingDemand)}</TableCell>
                        <TableCell align="right">{fmt(result.coolingDemand)}</TableCell>
                        <TableCell align="right">{fmt(result.runTime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detailed Results
              </Typography>
              <Stack spacing={2}>
                {results.map((result, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {result.fileName} {result.variant_idx !== undefined ? `(variant ${result.variant_idx})` : ''}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Building: {result.building || '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Area: {fmt(result.totalArea)} m²
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" component="div">
                          <span>Status: </span>
                          {result.status === 'error'
                            ? <Chip size="small" label="error" color="error" />
                            : <Chip size="small" label={result.status} color="success" />
                          }
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Runtime: {fmt(result.runTime)} seconds
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Show logs for failed variants or for debugging */}
                    {(result.run_output_log || result.output_err) && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">Run Logs</Typography>
                        {result.output_err && (
                          <Paper variant="outlined" sx={{ p: 1, mb: 1, maxHeight: 200, overflow: 'auto', bgcolor: '#fff7f7' }}>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{result.output_err}</pre>
                          </Paper>
                        )}
                        {result.run_output_log && (
                          <Paper variant="outlined" sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{result.run_output_log}</pre>
                          </Paper>
                        )}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Raw Data
              </Typography>
              <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto' }}>
                <pre>{JSON.stringify(results, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<FileDown />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'simulation-results.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Results
        </Button>
      </Box>
    </Box>
  );
};

export default SimulationResultsView;