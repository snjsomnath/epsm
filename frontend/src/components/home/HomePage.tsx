import React, { useState, useEffect } from 'react';
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
  Divider,
  Chip,
  
  CircularProgress,
  LinearProgress,
  Tooltip
} from '@mui/material';
// Fix the import for Lucide icons
import { Database, Home, FlaskConical, Activity, BarChart, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import Joyride, { Step, CallBackProps } from 'react-joyride';
import { getMaterials, getConstructions } from '../../lib/database-browser';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

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
  const { user } = useAuth();
  const [runTour, setRunTour] = useState(false);
  const [showTourNextTime, setShowTourNextTime] = useState(() => {
    const saved = localStorage.getItem('showTour');
    return saved === null || saved === 'true';
  });

  // System status states
  const [dbConnected, setDbConnected] = useState(false);
  const [dbStats, setDbStats] = useState({
    materials: 0,
    constructions: 0,
    lastUpdate: null as string | null
  });
  
  // New state for system resources
  const [systemResources, setSystemResources] = useState<any>(null);
  const [loadingResources, setLoadingResources] = useState(false);

  // Helper formatters for system resource display
  const toNumber = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  

  const clampPercent = (v: any) => {
    const n = toNumber(v);
    if (n < 0) return 0;
    if (n > 100) return 100;
    return Math.round(n);
  };

  const severityColor = (p: number) => (p > 80 ? 'error' : p > 60 ? 'warning' : 'success');

  useEffect(() => {
    if (showTourNextTime) {
      setRunTour(true);
    }
  }, [showTourNextTime]);

    // Check database connection and get stats
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        console.log('🔍 Checking database connection and getting stats...');
        
        // Try to fetch data from the API via browser service
        const [materialsData, constructionsData] = await Promise.all([
          getMaterials(),
          getConstructions()
        ]);

        console.log(`📊 Found ${materialsData.length} materials, ${constructionsData.length} constructions`);

        // Calculate stats
        const materialsCount = materialsData.length;
        const constructionsCount = constructionsData.length;

        // Find latest update from materials data
        const allDates = [
          ...materialsData.map(m => new Date(m.created_at || m.date_created)),
          ...constructionsData.map(c => new Date(c.created_at || c.date_created))
        ].filter(date => date instanceof Date && !isNaN(date.getTime()));

        const latestUpdate = allDates.length > 0 
          ? new Date(Math.max(...allDates.map(d => d.getTime()))).toLocaleString()
          : null;

        setDbConnected(true);
        setDbStats({
          materials: materialsCount,
          constructions: constructionsCount,
          lastUpdate: latestUpdate
        });

        console.log('✅ Database connection successful');
        
      } catch (err) {
        console.error('❌ Database connection check failed:', err);
        setDbConnected(false);
      }
    };

    checkDatabase();
    
    // Set up periodic check every 30 seconds
    const interval = setInterval(checkDatabase, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch system resources
  useEffect(() => {
    const fetchSystemResources = async () => {
      setLoadingResources(true);
      try {
        // Use the full URL for development
        // In development, we'll use the direct backend URL
        // In production, we can use the relative path
        const isDev = process.env.NODE_ENV === 'development';
        const baseUrl = isDev ? 'http://localhost:8000' : '';
        const response = await axios.get(`${baseUrl}/api/simulation/system-resources/`);
        setSystemResources(response.data);
      } catch (error) {
        console.error('Failed to fetch system resources:', error);
        // Use fallback data with error information for UI
        setSystemResources({
          error: (error as Error).message || 'Connection error',
          cpu: {
            logical_cores: '?',
            physical_cores: '?',
            usage_percent: 0
          },
          memory: {
            total_gb: '?',
            available_gb: '?',
            usage_percent: 0
          },
          disk: {
            total_gb: '?',
            free_gb: '?',
            usage_percent: 0
          },
          energyplus: {
            exists: false,
            version: "Unknown",
            error: "Connection error"
          },
          platform: {
            system: "Unknown",
            release: "Unknown",
            python: "Unknown"
          }
        });
      } finally {
        setLoadingResources(false);
      }
    };

    // Fetch once on component mount
    fetchSystemResources();
  }, []);

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

            <Card sx={{ minHeight: 260 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                
                <List dense>
                  {/* User and Authentication Information */}
                  <ListItem>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Authentication Status
                          <Chip 
                            size="small"
                            color={user ? "success" : "error"}
                            label={user ? "Authenticated" : "Not Authenticated"}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                  {user && (
                    <>
                      <ListItem>
                        <ListItemText 
                          primary="User ID"
                          secondary={user.id}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Email"
                          secondary={user.email}
                        />
                      </ListItem>
                    </>
                  )}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Database Information */}
                  <ListItem>
                    <ListItemIcon>
                      <Database size={20} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          Database Connection
                          <Chip 
                            size="small"
                            color={dbConnected ? "success" : "error"}
                            label={dbConnected ? "Connected" : "Disconnected"}
                          />
                        </Box>
                      }
                      secondary={
                        dbConnected ? 
                          `${dbStats.materials} materials, ${dbStats.constructions} constructions` :
                          "Check your connection"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Last Database Update" 
                      secondary={dbStats.lastUpdate || "No updates yet"}
                    />
                  </ListItem>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  {/* System Resources Section */}
                  {loadingResources && <LinearProgress />}
                  
                  {/* EnergyPlus Status */}
                  {systemResources?.energyplus && (
                    <ListItem>
                      <ListItemIcon>
                        <FlaskConical size={20} />
                      </ListItemIcon>
                      <ListItemText 
                        primary="EnergyPlus" 
                        secondary={
                          systemResources.energyplus.exists ? 
                            `Version ${systemResources.energyplus.version} (Installed)` : 
                            "Not found or not configured"
                        }
                      />
                    </ListItem>
                  )}
                  
                  {/* Hardware Resources */}
                  {systemResources && !systemResources.error && systemResources.cpu && (
                    <>
                      <ListItem>
                        <ListItemIcon>
                          <Cpu size={20} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              CPU Usage
                              <Tooltip title={`${clampPercent(systemResources.cpu.usage_percent)}% used`}>
                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                  <CircularProgress
                                    variant="determinate"
                                    value={clampPercent(systemResources.cpu.usage_percent)}
                                    size={28}
                                    thickness={5}
                                    color={severityColor(clampPercent(systemResources.cpu.usage_percent))}
                                  />
                                </Box>
                              </Tooltip>
                            </Box>
                          }
                          secondary={`${systemResources.cpu.physical_cores || systemResources.cpu.logical_cores || 0} cores`}
                        />
                      </ListItem>
                      
                      {systemResources.memory && (
                        <ListItem>
                          <ListItemIcon>
                            <MemoryStick size={20} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Memory
                                <Tooltip title={`${clampPercent(systemResources.memory.usage_percent)}% used`}>
                                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                    <CircularProgress
                                      variant="determinate"
                                      value={clampPercent(systemResources.memory.usage_percent)}
                                      size={28}
                                      thickness={5}
                                      color={severityColor(clampPercent(systemResources.memory.usage_percent))}
                                    />
                                  </Box>
                                </Tooltip>
                              </Box>
                            }
                            secondary={`${(Math.max(0, toNumber(systemResources.memory.total_gb) - toNumber(systemResources.memory.available_gb))).toFixed(1)} GB used of ${toNumber(systemResources.memory.total_gb).toFixed(1)} GB`}
                          />
                        </ListItem>
                      )}
                      
                      {systemResources.disk && (
                        <ListItem>
                          <ListItemIcon>
                            <HardDrive size={20} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Disk Space
                                <Tooltip title={`${clampPercent(systemResources.disk.usage_percent)}% used`}>
                                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                    <CircularProgress
                                      variant="determinate"
                                      value={clampPercent(systemResources.disk.usage_percent)}
                                      size={28}
                                      thickness={5}
                                      color={severityColor(clampPercent(systemResources.disk.usage_percent))}
                                    />
                                  </Box>
                                </Tooltip>
                              </Box>
                            }
                            secondary={`${(Math.max(0, toNumber(systemResources.disk.total_gb) - toNumber(systemResources.disk.free_gb))).toFixed(1)} GB used of ${toNumber(systemResources.disk.total_gb).toFixed(1)} GB`}
                          />
                        </ListItem>
                      )}
                      
                      {systemResources.platform && (
                        <ListItem>
                          <ListItemIcon>
                            <Activity size={20} />
                          </ListItemIcon>
                          <ListItemText 
                            primary="System"
                            secondary={`${systemResources.platform.system || ''} ${systemResources.platform.release || ''} (Python ${systemResources.platform.python || ''})`}
                          />
                        </ListItem>
                      )}
                    </>
                  )}
                  
                  {systemResources?.error && (
                    <ListItem>
                      <ListItemText 
                        primary="System Resources Error"
                        secondary={systemResources.error}
                      />
                    </ListItem>
                  )}
                  
                  {!systemResources && !loadingResources && (
                    <ListItem>
                      <ListItemText 
                        primary="System Resources"
                        secondary="No data available"
                      />
                    </ListItem>
                  )}
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
