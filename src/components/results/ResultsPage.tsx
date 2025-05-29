import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  BarChart2, 
  Download, 
  FileText, 
  Info, 
  Maximize2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Bar,
  ComposedChart
} from 'recharts';
import { useDatabase } from '../../context/DatabaseContext';

const ResultsPage = () => {
  const { scenarios } = useDatabase();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        // Fetch results from your backend
        const response = await fetch('http://localhost:8000/api/simulation/results/');
        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError('Failed to fetch simulation results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const getStatusColor = (value: number, type: 'energy' | 'cost' | 'gwp') => {
    const thresholds = {
      energy: { low: 100, high: 150 },
      cost: { low: 500, high: 1000 },
      gwp: { low: 20, high: 40 }
    };

    const threshold = thresholds[type];
    if (value <= threshold.low) return 'success';
    if (value >= threshold.high) return 'error';
    return 'warning';
  };

  const getStatusIcon = (value: number, baseline: number) => {
    const percentChange = ((value - baseline) / baseline) * 100;
    if (percentChange <= -5) return <TrendingDown color="green" size={16} />;
    if (percentChange >= 5) return <TrendingUp color="red" size={16} />;
    return <Minus size={16} />;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 4 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Simulation Results
      </Typography>
      <Typography variant="body1" paragraph>
        View and analyze simulation results across different scenarios.
      </Typography>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Simulations
              </Typography>
              <Typography variant="h3">
                {results.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {scenarios.length} scenarios
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Energy Savings
              </Typography>
              <Typography variant="h3" color="success.main">
                24.5%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compared to baseline
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Best Performing Scenario
              </Typography>
              <Typography variant="h5">
                High Performance Set
              </Typography>
              <Typography variant="body2" color="text.secondary">
                35.2% energy reduction
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Results Table */}
        <Grid item xs={12}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Scenario</TableCell>
                    <TableCell align="right">Energy Use (kWh/m²)</TableCell>
                    <TableCell align="right">Cost (SEK/m²)</TableCell>
                    <TableCell align="right">GWP (kg CO₂e/m²)</TableCell>
                    <TableCell align="right">Savings vs. Baseline</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.id} hover>
                      <TableCell>{result.name}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                          {result.energyUse}
                          <Chip 
                            size="small"
                            label={result.energyUse}
                            color={getStatusColor(result.energyUse, 'energy')}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                          {result.cost}
                          <Chip 
                            size="small"
                            label={result.cost}
                            color={getStatusColor(result.cost, 'cost')}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                          {result.gwp}
                          <Chip 
                            size="small"
                            label={result.gwp}
                            color={getStatusColor(result.gwp, 'gwp')}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                          {result.savings}%
                          {getStatusIcon(result.energyUse, 150)}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedResult(result);
                              setDetailsOpen(true);
                            }}
                          >
                            <Info size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download Results">
                          <IconButton size="small">
                            <Download size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Energy Use Comparison
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="energyUse" fill="#8884d8" name="Energy Use" />
                  <Line type="monotone" dataKey="savings" stroke="#82ca9d" name="Savings %" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Environmental Impact
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="gwp" fill="#ff7300" name="GWP" yAxisId="left" />
                  <Line type="monotone" dataKey="cost" stroke="#413ea0" name="Cost" yAxisId="right" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Simulation Details
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Maximize2 size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedResult && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  {selectedResult.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {selectedResult.description}
                </Typography>
              </Grid>

              {/* Add detailed charts and metrics here */}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<Download />}>
            Export Details
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsPage;