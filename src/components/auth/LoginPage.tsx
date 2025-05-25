import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Grid,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Container
} from '@mui/material';
import { Building2, BarChart2, Database, FlaskConical, Mail, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Refs for sections
  const buildingRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await signIn(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDemoLogin = () => {
    navigate('/');
  };

  const handleFeatureClick = (sectionId: string) => {
    const refs: { [key: string]: React.RefObject<HTMLDivElement> } = {
      building: buildingRef,
      energy: energyRef,
      data: dataRef,
      scenario: scenarioRef
    };

    const ref = refs[sectionId];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: '#121212',
        color: 'white',
        overflowX: 'hidden'
      }}
    >
      {/* Hero Section */}
      <Box 
        sx={{ 
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #121212 0%, #1976d2 100%)',
          p: 3,
          position: 'relative'
        }}
      >
        <Grid container spacing={4} sx={{ maxWidth: 1200, margin: '0 auto' }}>
          <Grid item xs={12} md={7}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                EPSM
              </Typography>
              <Typography variant="h4" gutterBottom>
                EnergyPlus Simulation Manager
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Developed by Chalmers University of Technology
                <br />
                Department of Architecture and Civil Engineering
                <br />
                Sustainable Built Environment Research Group
              </Typography>

              <Typography variant="body1" paragraph sx={{ opacity: 0.8 }}>
                EPSM is a comprehensive platform for building energy modeling and analysis, 
                designed to streamline the process of running EnergyPlus simulations for 
                building performance optimization.
              </Typography>

              <Box sx={{ my: 4 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      onClick={() => handleFeatureClick('building')}
                      sx={{ 
                        p: 2, 
                        height: '100%', 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <Building2 size={24} style={{ color: '#fff', marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Building Components
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Manage materials, constructions, and building templates with 
                        environmental impact data.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      onClick={() => handleFeatureClick('energy')}
                      sx={{ 
                        p: 2, 
                        height: '100%', 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <BarChart2 size={24} style={{ color: '#fff', marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Energy Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Run simulations, analyze results, and optimize building 
                        performance through various scenarios.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      onClick={() => handleFeatureClick('data')}
                      sx={{ 
                        p: 2, 
                        height: '100%', 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <Database size={24} style={{ color: '#fff', marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Data Management
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Centralized database for materials, constructions, and 
                        simulation results with version control.
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      onClick={() => handleFeatureClick('scenario')}
                      sx={{ 
                        p: 2, 
                        height: '100%', 
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      <FlaskConical size={24} style={{ color: '#fff', marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Scenario Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Create and compare different retrofit scenarios to optimize 
                        building performance.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} sx={{ display: 'flex', alignItems: 'center' }}>
            <Card sx={{ width: '100%', bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" align="center" gutterBottom>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }} align="center" gutterBottom>
                  Access restricted to Chalmers University staff and researchers
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Chalmers Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    margin="normal"
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Mail size={20} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    margin="normal"
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={loading}
                    sx={{ mt: 3 }}
                  >
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>

                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    onClick={handleDemoLogin}
                    disabled={loading}
                    sx={{ 
                      mt: 2,
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                      color: 'white',
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    Try Demo Account
                  </Button>
                </form>

                <Divider sx={{ my: 3, bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

                <Typography variant="body2" align="center" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setIsSignUp(!isSignUp)}
                    sx={{ 
                      color: '#1976d2',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {isSignUp ? 'Sign In' : 'Create Account'}
                  </Link>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <IconButton 
          onClick={() => handleFeatureClick('building')}
          sx={{ 
            position: 'absolute', 
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            animation: 'bounce 2s infinite'
          }}
        >
          <ChevronDown size={32} />
        </IconButton>
      </Box>

      {/* Detailed Sections */}
      <Container maxWidth="lg">
        <Box ref={buildingRef} sx={{ minHeight: '100vh', py: 8, position: 'relative' }}>
          <Typography variant="h3" gutterBottom>
            Building Components
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
            Our comprehensive building component database allows you to manage and organize all your building materials and constructions.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Materials Library</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Access a vast library of building materials with detailed thermal and environmental properties.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Construction Templates</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Create and manage layered constructions for walls, roofs, floors, and windows.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Environmental Impact</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Track embodied carbon and lifecycle costs for better decision-making.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <IconButton 
            onClick={() => handleFeatureClick('energy')}
            sx={{ 
              position: 'absolute', 
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              animation: 'bounce 2s infinite'
            }}
          >
            <ChevronDown size={32} />
          </IconButton>
        </Box>

        <Box ref={energyRef} sx={{ minHeight: '100vh', py: 8, position: 'relative' }}>
          <Typography variant="h3" gutterBottom>
            Energy Analysis
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
            Powerful simulation capabilities for energy performance optimization.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>EnergyPlus Integration</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Seamless integration with EnergyPlus for accurate building energy simulations.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Results Visualization</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Interactive charts and graphs for better understanding of energy consumption patterns.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Comprehensive metrics for heating, cooling, lighting, and equipment energy use.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <IconButton 
            onClick={() => handleFeatureClick('data')}
            sx={{ 
              position: 'absolute', 
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              animation: 'bounce 2s infinite'
            }}
          >
            <ChevronDown size={32} />
          </IconButton>
        </Box>

        <Box ref={dataRef} sx={{ minHeight: '100vh', py: 8, position: 'relative' }}>
          <Typography variant="h3" gutterBottom>
            Data Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
            Robust data management features for your projects.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Version Control</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Track changes and maintain multiple versions of your building models.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Data Export</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Export results in various formats for further analysis and reporting.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Collaboration</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Share projects and results with team members and stakeholders.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <IconButton 
            onClick={() => handleFeatureClick('scenario')}
            sx={{ 
              position: 'absolute', 
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              animation: 'bounce 2s infinite'
            }}
          >
            <ChevronDown size={32} />
          </IconButton>
        </Box>

        <Box ref={scenarioRef} sx={{ minHeight: '100vh', py: 8 }}>
          <Typography variant="h3" gutterBottom>
            Scenario Analysis
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
            Create and compare different retrofit scenarios.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Retrofit Options</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Define multiple retrofit packages with different combinations of improvements.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Cost Analysis</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Compare investment costs and energy savings for different scenarios.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(25, 118, 210, 0.1)' }}>
                <Typography variant="h6" gutterBottom>Environmental Impact</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  Evaluate carbon footprint reduction potential for each scenario.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;