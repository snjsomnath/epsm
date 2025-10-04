import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Fade,
  useTheme,
  Zoom,
} from '@mui/material';
import {
  Building,
  GitBranch,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';

const LoginPageExplainer: React.FC = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [showCalculation, setShowCalculation] = useState(false);

  // Simulation steps
  const steps = [
    { 
      id: 0, 
      label: 'Base Building', 
      color: '#1565c0', 
      icon: Building,
      count: 1,
      description: 'Start with your building model'
    },
    { 
      id: 1, 
      label: 'Insulation Options', 
      color: '#1976d2', 
      icon: GitBranch,
      count: 3,
      description: 'Wall, roof, floor combinations',
      cumulative: 3
    },
    { 
      id: 2, 
      label: 'Window Types', 
      color: '#2196f3', 
      icon: Layers,
      count: 4,
      description: 'Single, double, triple glazing',
      cumulative: 12 // 3×4
    },
    { 
      id: 3, 
      label: 'HVAC Systems', 
      color: '#42a5f5', 
      icon: Zap,
      count: 2,
      description: 'Heat pump or gas boiler',
      cumulative: 24 // 3×4×2
    },
  ];

  useEffect(() => {
    // Cycle through steps (faster: 2s instead of 3s)
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % (steps.length + 1);
        setShowCalculation(next === steps.length);
        return next;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
      }}
    >
      {/* Horizontal Progress Bar */}
      <Box sx={{ mb: 2 }}>
        {/* Progress steps in horizontal row */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2,
            mb: 3,
            alignItems: 'center',
          }}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === index;
            const isPast = activeStep > index;
            
            return (
              <React.Fragment key={step.id}>
                {/* Step indicator */}
                <Zoom in timeout={400}>
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    {/* Icon circle */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: isActive || isPast ? step.color : `${step.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? `0 0 24px ${step.color}` : isPast ? `0 4px 12px ${step.color}40` : 'none',
                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                      }}
                    >
                      <Icon size={28} color="#fff" style={{ 
                        transform: isActive ? 'rotate(360deg)' : 'rotate(0deg)',
                        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                      
                      {/* Count badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -6,
                          right: -6,
                          bgcolor: isActive || isPast ? step.color : `${step.color}60`,
                          color: '#fff',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          border: `2px solid ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff'}`,
                          boxShadow: isActive ? `0 0 8px ${step.color}` : 'none',
                        }}
                      >
                        {step.count}
                      </Box>
                    </Box>

                    {/* Label */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? step.color : 'text.secondary',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {step.label}
                    </Typography>

                    {/* Cumulative count */}
                    {step.cumulative && (
                      <Fade in={isActive || isPast} timeout={400}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: step.color,
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.3,
                          }}
                        >
                          <Sparkles size={10} />
                          {step.cumulative}
                        </Typography>
                      </Fade>
                    )}
                  </Box>
                </Zoom>

                {/* Connector arrow */}
                {index < steps.length - 1 && (
                  <Box
                    sx={{
                      width: 40,
                      height: 3,
                      bgcolor: isPast ? steps[index + 1].color : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      borderRadius: 2,
                      position: 'relative',
                      transition: 'background-color 0.4s ease',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        right: -6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: `6px solid ${isPast ? steps[index + 1].color : theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        transition: 'border-color 0.4s ease',
                      }
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </Box>

        {/* Active step description */}
        <Fade in timeout={400} key={activeStep}>
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `2px solid ${activeStep < steps.length ? steps[activeStep].color : '#1976d2'}`,
              transition: 'border-color 0.4s ease',
            }}
          >
            {activeStep < steps.length ? (
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}
              >
                {steps[activeStep].description}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                }}
              >
                All running in parallel to find the optimal renovation strategy
              </Typography>
            )}
          </Paper>
        </Fade>
      </Box>

      {/* Final Calculation with Animation */}
      <Zoom in={showCalculation} timeout={500}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(21, 101, 192, 0.08) 100%)'
              : 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(21, 101, 192, 0.05) 100%)',
            border: `2px solid #1976d2`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated background effect */}
          <Box
            sx={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(25, 118, 210, 0.25), transparent)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 0.3 },
                '50%': { transform: 'scale(1.2)', opacity: 0.6 },
              },
            }}
          />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2.5 }}>
              <BarChart3 size={26} style={{ color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
                Final Result
              </Typography>
            </Box>

            {/* Math equation */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 2,
                flexWrap: 'wrap',
                mb: 2
              }}
            >
              <Zoom in={showCalculation} timeout={400} style={{ transitionDelay: '100ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: '#ff9800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(255, 152, 0, 0.4)',
                    }}
                  >
                    <GitBranch size={24} color="#fff" />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff9800' }}>
                    3
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Insulation
                  </Typography>
                </Box>
              </Zoom>

              <Typography variant="h4" sx={{ color: 'text.secondary', mx: 1 }}>×</Typography>

              <Zoom in={showCalculation} timeout={400} style={{ transitionDelay: '200ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: '#2196f3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(33, 150, 243, 0.4)',
                    }}
                  >
                    <Layers size={24} color="#fff" />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3' }}>
                    4
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Windows
                  </Typography>
                </Box>
              </Zoom>

              <Typography variant="h4" sx={{ color: 'text.secondary', mx: 1 }}>×</Typography>

              <Zoom in={showCalculation} timeout={400} style={{ transitionDelay: '300ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: '#4caf50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(76, 175, 80, 0.4)',
                    }}
                  >
                    <Zap size={24} color="#fff" />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    2
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    HVAC
                  </Typography>
                </Box>
              </Zoom>

              <Typography variant="h4" sx={{ color: 'text.secondary', mx: 1 }}>=</Typography>

              <Zoom in={showCalculation} timeout={500} style={{ transitionDelay: '400ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 32px rgba(25, 118, 210, 0.6)',
                    }}
                  >
                    <BarChart3 size={32} color="#fff" />
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#1976d2' }}>
                    24
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600 }}>
                    Simulations
                  </Typography>
                </Box>
              </Zoom>
            </Box>

            <Typography 
              variant="body1" 
              sx={{ 
                textAlign: 'center', 
                color: 'text.secondary',
                fontStyle: 'italic',
                mt: 2
              }}
            >
              All running in parallel to find the optimal renovation strategy
            </Typography>
          </Box>
        </Paper>
      </Zoom>
    </Box>
  );
};

export default LoginPageExplainer;
