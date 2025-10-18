import React, { useState, useEffect } from 'react';
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
  Collapse,
  useTheme as useMuiTheme
} from '@mui/material';
import { Mail, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoginPageExplainer from './LoginPageExplainer';

const LoginPage = () => {
  const { signIn, signInWithSAML, loginInfo, error, clearError } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      clearError();
      await signIn(formData.email, formData.password);
    } catch (err) {
      // Error is handled by AuthContext
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
      clearError();
      await signIn('demo@chalmers.se', 'demo123');
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  // Show loading animation when authenticating
  // if (loading) {
  //   return <LoginAnimation />;
  // }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 3,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img 
            src={isDarkMode ? '/media/chalmers_logo_dark_theme.png' : '/media/chalmers_logo_light_theme.png'} 
            alt="Chalmers Logo" 
            style={{ height: 40 }}
          />
          <Typography 
            variant="h4" 
            color="primary" 
            sx={{ 
              fontWeight: 700,
              background: isDarkMode 
                ? 'linear-gradient(45deg, #90caf9 30%, #42a5f5 90%)'
                : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            EPSM
          </Typography>
        </Box>
        <IconButton 
          onClick={toggleTheme} 
          sx={{ 
            p: 1.5,
            bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            '&:hover': {
              bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </IconButton>
      </Box>

      {/* Main Content */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          py: 4
        }}
      >
        <Grid container spacing={6} alignItems="flex-start">
          {/* Left Content - EPSM Explainer */}
          <Grid item xs={12} md={7}>
            <LoginPageExplainer />
          </Grid>

          {/* Sign In Card */}
          <Grid item xs={12} md={5}>
            <Card 
              sx={{ 
                maxWidth: 480,
                mx: 'auto',
                mt: { xs: 4, md: 0 },
                bgcolor: 'background.paper',
                boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.4)' : 6
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {/* Title - adjust based on SAML status */}
                <Typography variant="h5" align="center" gutterBottom>
                  {loginInfo?.saml_enabled 
                    ? 'Welcome to EPSM' 
                    : (isSignUp ? 'Create Account' : 'Sign In')
                  }
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ mb: 4 }}
                >
                  {loginInfo?.saml_enabled 
                    ? 'Energy Performance Simulation Manager'
                    : 'Access restricted to Chalmers University staff and researchers'
                  }
                </Typography>

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    {error}
                  </Alert>
                )}

                {/* SAML Login Button - Primary login method in production */}
                {loginInfo?.saml_enabled ? (
                  <>
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={signInWithSAML}
                      disabled={loading}
                      sx={{ 
                        mb: 2,
                        py: 1.5,
                        bgcolor: '#00d0be',
                        color: '#fff',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#00b8a9',
                        }
                      }}
                    >
                      Login with Chalmers CID
                    </Button>

                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      align="center" 
                      sx={{ display: 'block', mb: 3 }}
                    >
                      Use your Chalmers credentials to access EPSM
                    </Typography>

                    {/* Collapsible Admin Login */}
                    <Collapse in={showAdminLogin}>
                      <Divider sx={{ mb: 3 }} />
                      
                      <form onSubmit={handleSubmit}>
                        <TextField
                          fullWidth
                          label="Admin Email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          margin="normal"
                          required
                          autoComplete="email"
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
                          autoComplete="current-password"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />

                        <Button
                          type="submit"
                          variant="outlined"
                          fullWidth
                          size="medium"
                          disabled={loading}
                          sx={{ 
                            mt: 2,
                            mb: 2
                          }}
                        >
                          Admin Sign In
                        </Button>
                      </form>
                    </Collapse>

                    {/* Admin login toggle */}
                    <Typography 
                      variant="caption" 
                      align="center" 
                      sx={{ display: 'block', mt: 2 }}
                    >
                      <Link
                        component="button"
                        variant="caption"
                        onClick={() => setShowAdminLogin(!showAdminLogin)}
                        sx={{ 
                          textDecoration: 'none',
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'text.primary',
                          }
                        }}
                      >
                        {showAdminLogin ? 'Hide' : 'Administrator Access'}
                      </Link>
                    </Typography>
                  </>
                ) : (
                  <>
                    {/* Development mode - standard login form */}
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
                        autoComplete="email"
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
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                        sx={{ 
                          mt: 3,
                          py: 1.5
                        }}
                      >
                        {isSignUp ? 'Create Account' : 'Sign In'}
                      </Button>
                    </form>

                    {/* Development-only features */}
                    <Divider sx={{ my: 3 }} />

                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      onClick={handleDemoLogin}
                      disabled={loading}
                      sx={{ 
                        mb: 2,
                        py: 1.5,
                        borderColor: muiTheme.palette.primary.main,
                        color: muiTheme.palette.primary.main,
                        '&:hover': {
                          borderColor: muiTheme.palette.primary.dark,
                          backgroundColor: muiTheme.palette.primary.main + '08',
                        }
                      }}
                    >
                      Demo Login (demo@chalmers.se)
                    </Button>

                    {/* Account creation toggle - Only show in development */}
                    <Divider sx={{ my: 2 }} />

                    <Typography variant="body2" align="center">
                      {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsSignUp(!isSignUp)}
                        sx={{ 
                          textDecoration: 'none',
                          color: 'primary.main',
                          '&:hover': {
                            color: 'primary.dark',
                          }
                        }}
                      >
                        {isSignUp ? 'Sign In' : 'Create Account'}
                      </Link>
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LoginPage;