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
  Chip
} from '@mui/material';
import { BarChart3, Download, FileDown } from 'lucide-react';

const SimulationResultsView = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
            
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Energy use summary chart would appear here
                <BarChart3 size={80} style={{ display: 'block', margin: '10px auto', color: '#9e9e9e' }} />
              </Typography>
            </Box>
            
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