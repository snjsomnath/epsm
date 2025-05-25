import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  InputAdornment,
  IconButton,
  Link,
  Divider,
  Container,
  Fab
} from '@mui/material';
import { Building2, BarChart2, Database, FlaskConical, Mail, Lock, Eye, EyeOff, ChevronUp } from 'lucide-react';
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                EPSM
              </Typography>
              <Typography variant="h4" gutterBottom>
                EnergyPlus Simulation Manager
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                Developed by Chalmers University of Technology
                <br />
                Department of Architecture and Civil Engineering
                <br />
                Sustainable Built Environment Research Group
              </Typography>

              <Typography variant="body1" paragraph sx={{ color: 'text.secondary' }}>
                EPSM is a comprehensive platform for building energy modeling and analysis, 
                designed to streamline the process of running EnergyPlus simulations for 
                building performance optimization.
              </Typography>

              <Grid container spacing={3} sx={{ mt: 4 }}>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Building2 size={24} style={{ marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Building Components
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Manage materials, constructions, and building templates with 
                        environmental impact data.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <BarChart2 size={24} style={{ marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Energy Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Run simulations, analyze results, and optimize building 
                        performance through various scenarios.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Database size={24} style={{ marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Data Management
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Centralized database for materials, constructions, and 
                        simulation results with version control.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <FlaskConical size={24} style={{ marginBottom: '8px' }} />
                      <Typography variant="h6" gutterBottom>
                        Scenario Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create and compare different retrofit scenarios to optimize 
                        building performance.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card elevation={4}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" align="center" gutterBottom>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
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
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Mail size={20} />
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
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
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
                      sx={{ mt: 2 }}
                    >
                      Try Demo Account
                    </Button>
                  </form>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="body2" align="center" color="text.secondary">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => setIsSignUp(!isSignUp)}
                      sx={{ textDecoration: 'none' }}
                    >
                      {isSignUp ? 'Sign In' : 'Create Account'}
                    </Link>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Back to Top Button */}
      <Fab
        color="primary"
        size="small"
        onClick={scrollToTop}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          opacity: 0.9,
        }}
      >
        <ChevronUp />
      </Fab>
    </Box>
  );
};

export default LoginPage;