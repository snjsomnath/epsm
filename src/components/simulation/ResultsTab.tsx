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
  Stack,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { BarChart3, Download, FileDown } from 'lucide-react';
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

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SimulationResultsView = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Energy Use Breakdown by End Use',
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} kWh`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'End Use'
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

  // Process energy use data for the chart
  const energyUseData = {
    labels: [
      'Heating',
      'Cooling',
      'Interior Lighting',
      'Interior Equipment',
      'Fans',
      'Pumps',
      'Water Systems'
    ],
    datasets: [
      {
        label: 'Electricity',
        data: [0, 0, 50243.89, 175467.76, 0, 52.35, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: 'District Heating',
        data: [295007.41, 0, 0, 0, 0, 0, 87404.76],
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      }
    ]
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Summary" />
          <Tab label="Energy Savings" />
          <Tab label="Cost Impact" />
          <Tab label="GWP Reduction" />
        </Tabs>
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Top 5 Performing Configurations
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Wall</TableCell>
                    <TableCell>Roof</TableCell>
                    <TableCell>Floor</TableCell>
                    <TableCell>Window</TableCell>
                    <TableCell>Energy Savings</TableCell>
                    <TableCell>Cost (SEK/m²)</TableCell>
                    <TableCell>GWP (kg CO₂e/m²)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <TableRow key={rank} sx={{ backgroundColor: rank === 1 ? 'rgba(25, 118, 210, 0.08)' : 'inherit' }}>
                      <TableCell>
                        {rank === 1 ? (
                          <Chip size="small" label={rank} color="primary" />
                        ) : rank}
                      </TableCell>
                      <TableCell>External Insulation {rank}</TableCell>
                      <TableCell>Attic Insulation {rank}</TableCell>
                      <TableCell>Floor Insulation {6-rank}</TableCell>
                      <TableCell>Triple Glazing {rank}</TableCell>
                      <TableCell>{(70 - rank * 5).toFixed(1)}%</TableCell>
                      <TableCell>{(800 + rank * 100).toFixed(0)}</TableCell>
                      <TableCell>{(120 - rank * 10).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Energy Use Breakdown
                </Typography>
                <Box sx={{ height: '400px', position: 'relative' }}>
                  <Bar options={options} data={energyUseData} />
                </Box>
              </CardContent>
            </Card>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<FileDown size={18} />}
                sx={{ mr: 1 }}
              >
                Export CSV
              </Button>
              <Button 
                variant="contained" 
                startIcon={<Download size={18} />}
              >
                Download Report
              </Button>
            </Box>
          </Box>
        )}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 1}>
        {tabValue === 1 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1">
              Energy savings analysis would be displayed here.
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 2}>
        {tabValue === 2 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1">
              Cost impact analysis would be displayed here.
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box role="tabpanel" hidden={tabValue !== 3}>
        {tabValue === 3 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1">
              GWP reduction analysis would be displayed here.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SimulationResultsView;