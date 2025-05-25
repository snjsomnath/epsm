import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Stack,
  Divider
} from '@mui/material';
import { Database, Home, FlaskConical, Activity, BarChart } from 'lucide-react';
import Joyride, { Step, CallBackProps } from 'react-joyride';

const steps: Step[] = [
  {
    target: '.tour-database',
    content: 'Start by creating materials and construction sets in the database. This is where you manage all your building components.',
    disableBeacon: true,
  },
  {
    target: '.tour-baseline',
    content: 'Upload your baseline IDF files and run initial simulations to establish your reference case.',
  },
  {
    target: '.tour-scenario',
    content: 'Create different scenarios to test various retrofit strategies and compare their performance.',
  },
  {
    target: '.tour-simulation',
    content: 'Run batch simulations for your scenarios and analyze the results to make informed decisions.',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [runTour, setRunTour] = useState(false);
  const [showTourNextTime, setShowTourNextTime] = useState(() => {
    const saved = localStorage.getItem('showTour');
    return saved === null || saved === 'true';
  });

  useEffect(() => {
    if (showTourNextTime) {
      setRunTour(true);
    }
  }, [showTourNextTime]);

  const handleTourCallback = (data: CallBackProps) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      setRunTour(false);
    }
  };

  const handleShowTourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowTourNextTime(event.target.checked);
    localStorage.setItem('showTour', event.target.checked.toString());
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Box>
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        styles={{
          options: {
            primaryColor: '#1976d2',
            zIndex: 10000,
          },
        }}
        callback={handleTourCallback}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Getting Started
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Follow these steps to start optimizing your building's energy performance:
            </Typography>
            
            <List>
              <ListItem className="tour-database">
                <ListItemIcon>
                  <Database />
                </ListItemIcon>
                <ListItemText 
                  primary="1. Set Up Your Database" 
                  secondary="Create and manage materials, window glazing, constructions, and construction sets"
                />
              </ListItem>
              <ListItem className="tour-baseline">
                <ListItemIcon>
                  <Home />
                </ListItemIcon>
                <ListItemText 
                  primary="2. Define Baseline" 
                  secondary="Upload IDF files and run baseline simulations"
                />
              </ListItem>
              <ListItem className="tour-scenario">
                <ListItemIcon>
                  <FlaskConical />
                </ListItemIcon>
                <ListItemText 
                  primary="3. Create Scenarios" 
                  secondary="Design retrofit packages and set up simulation scenarios"
                />
              </ListItem>
              <ListItem className="tour-simulation">
                <ListItemIcon>
                  <Activity />
                </ListItemIcon>
                <ListItemText 
                  primary="4. Run Simulations" 
                  secondary="Execute batch simulations and monitor progress"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <BarChart />
                </ListItemIcon>
                <ListItemText 
                  primary="5. Analyze Results" 
                  secondary="View detailed results and generate reports"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={showTourNextTime}
                  onChange={handleShowTourChange}
                />
              }
              label="Show guided tour on next visit"
            />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your recent simulations and updates will appear here.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={2}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<Database />}
                    onClick={() => handleNavigation('/database')}
                    fullWidth
                  >
                    Open Database
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<Home />}
                    onClick={() => handleNavigation('/baseline')}
                    fullWidth
                  >
                    Create New Baseline
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<FlaskConical />}
                    onClick={() => handleNavigation('/scenario')}
                    fullWidth
                  >
                    New Scenario
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Database Connection" 
                      secondary="Connected"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="EnergyPlus" 
                      secondary="Version 23.2.0"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Last Backup" 
                      secondary="2 hours ago"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;