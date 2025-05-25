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
  Container
} from '@mui/material';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
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

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, mb: { xs: 4, md: 0 } }}>
              <Typography variant="h3" gutterBottom color="primary" sx={{ fontWeight: 'bold' }}>
                EPSM
              </Typography>
              <Typography variant="h4" gutterBottom>
                EnergyPlus Simulation Manager
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Developed by Chalmers University of Technology
              </Typography>
              <Typography variant="body1" color="text.secondary">
                A comprehensive platform for building energy modeling and analysis, 
                designed to streamline the process of running EnergyPlus simulations.
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card 
              elevation={4}
              sx={{ 
                backdropFilter: 'blur(10px)',
                bgcolor: 'background.paper',
              }}
            >
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
  );
};

export default LoginPage;