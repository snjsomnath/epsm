import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Button,
  Tabs,
  Tab,
  Stack,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import { Play } from 'lucide-react';

const SimulationPage = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Simulation Runner
      </Typography>
      <Typography variant="body1" paragraph>
        Run and manage your building energy simulations
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Active Simulations" />
              <Tab label="Simulation History" />
            </Tabs>
          </Box>

          <Box sx={{ p: 2 }}>
            {tabValue === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Active Simulations
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<Play size={18} />}
                    onClick={() => navigate('/baseline')}
                  >
                    New Simulation
                  </Button>
                </Box>

                <Alert severity="info">
                  No active simulations. Start a new simulation to see it here.
                </Alert>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Simulation History
                </Typography>
                <Alert severity="info">
                  Your completed simulations will appear here.
                </Alert>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SimulationPage;