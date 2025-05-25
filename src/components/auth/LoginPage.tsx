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
  Stack
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn('demo@chalmers.se', 'demo123');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 4 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img 
              src={isDarkMode ? '/src/media/chalmers_logo_dark_theme.png' : '/src/media/chalmers_logo_light_theme.png'} 
              alt="Chalmers Logo" 
              style={{ height: 40 }}
            />
            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
              EPSM
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} sx={{ ml: 2 }}>
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </IconButton>
        </Box>

        <Grid container spacing={6} alignItems="center">
          {/* Left Content */}
          <Grid item xs={12} md={7}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h3" gutterBottom>
                  EnergyPlus Simulation Manager
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
                  Department of Architecture and Civil Engineering
                  <br />
                  Sustainable Built Environment Research Group
                </Typography>

                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
                  EPSM is a comprehensive platform for building energy modeling and analysis, 
                  designed to streamline the process of running EnergyPlus simulations for 
                  building performance optimization.
                </Typography>
              </Box>

              {/* Feature Cards */}
              <Grid container spacing={3}>
                {[
                  {
                    title: 'Building Components',
                    description: 'Manage materials, constructions, and building templates with environmental impact data.'
                  },
                  {
                    title: 'Energy Analysis',
                    description: 'Run simulations, analyze results, and optimize building performance through various scenarios.'
                  },
                  {
                    title: 'Data Management',
                    description: 'Centralized database for materials, constructions, and simulation results with version control.'
                  }
                ].map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Grid>

          {/* Sign In Card */}
          <Grid item xs={12} md={5}>
            <Card sx={{ 
              maxWidth: 480,
              mx: 'auto',
              mt: { xs: 4, md: 0 },
              bgcolor: 'background.paper'
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" align="center" gutterBottom>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
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

                <Typography variant="body2" align="center">
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
  );
};

export default LoginPage;