import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Stack,
  Card,
  CardContent,
  Fade,
  Grow,
  Zoom,
} from '@mui/material';
import {
  Building,
  Layers,
  Zap,
  BarChart3,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Sparkles,
  FlaskConical,
} from 'lucide-react';

// EPSM Blue color scheme
const EPSM_COLORS = {
  primary: '#1976d2',      // EPSM Blue
  primaryLight: '#42a5f5',
  primaryDark: '#1565c0',
  secondary: '#0d47a1',    // Darker blue
  accent: '#2196f3',       // Lighter accent blue
};

const EPSMExplainerAnimation: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: <Building size={56} />,
      title: 'Build Scenarios',
      description: 'Create combinatorial renovation scenarios with different building materials, constructions, and systems',
      color: EPSM_COLORS.primary,
      subIcon: <Layers size={24} />
    },
    {
      icon: <Zap size={56} />,
      title: 'Simulate Performance',
      description: 'Run EnergyPlus simulations to analyze energy performance, costs, and environmental impact',
      color: EPSM_COLORS.primaryDark,
      subIcon: <FlaskConical size={24} />
    },
    {
      icon: <BarChart3 size={56} />,
      title: 'Visualize Results',
      description: 'Compare scenarios with interactive charts and identify optimal renovation strategies',
      color: EPSM_COLORS.accent,
      subIcon: <TrendingUp size={24} />
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <Paper
      sx={{
        p: 4,
        mb: 4,
        background: `linear-gradient(135deg, ${EPSM_COLORS.primaryDark} 0%, ${EPSM_COLORS.primary} 50%, ${EPSM_COLORS.accent} 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
      }}
    >
      {/* Background animated circles */}
      {[0, 1, 2, 3].map((ring) => (
        <Box
          key={ring}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '10%',
            transform: 'translate(-50%, -50%)',
            width: 120 + ring * 80,
            height: 120 + ring * 80,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            opacity: 0,
            animation: `ripple ${3.5}s ease-out infinite`,
            animationDelay: `${ring * 0.7}s`,
            '@keyframes ripple': {
              '0%': {
                transform: 'translate(-50%, -50%) scale(0.8)',
                opacity: 0.5,
              },
              '100%': {
                transform: 'translate(-50%, -50%) scale(1.8)',
                opacity: 0,
              },
            },
          }}
        />
      ))}

      <Grid container spacing={4} alignItems="center">
        {/* Left side - Main title and subtitle */}
        <Grid item xs={12} md={5}>
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Fade in timeout={1000}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Sparkles size={32} />
                <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2rem', md: '2.5rem' } }}>
                  EPSM
                </Typography>
              </Box>
            </Fade>
            
            <Grow in timeout={1200}>
              <Typography variant="h5" sx={{ fontWeight: 500, mb: 2, opacity: 0.95 }}>
                Energy Performance Scenario Manager
              </Typography>
            </Grow>

            <Fade in timeout={1400}>
              <Typography variant="body1" sx={{ opacity: 0.9, lineHeight: 1.7 }}>
                A powerful platform for building energy optimization through scenario-based simulation and analysis.
              </Typography>
            </Fade>
          </Box>
        </Grid>

        {/* Right side - Animated workflow steps */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            {steps.map((step, index) => {
              const isActive = activeStep === index;
              const isPast = index < activeStep;
              
              return (
                <Zoom
                  key={index}
                  in
                  timeout={800}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <Card
                    sx={{
                      background: isActive
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isPast
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: isActive ? '2px solid rgba(255, 255, 255, 0.6)' : '2px solid rgba(255, 255, 255, 0.25)',
                      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isActive ? 'scale(1.03)' : 'scale(1)',
                      boxShadow: isActive
                        ? `0 8px 32px ${EPSM_COLORS.secondary}80`
                        : '0 4px 16px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        {/* Step number and icon */}
                        <Box sx={{ position: 'relative' }}>
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isActive
                                ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`
                                : 'rgba(255, 255, 255, 0.25)',
                              color: 'white',
                              transition: 'all 0.6s ease',
                              position: 'relative',
                              overflow: 'hidden',
                              boxShadow: isActive ? `0 4px 20px ${step.color}60` : 'none',
                            }}
                          >
                            {/* Pulsing effect for active step */}
                            {isActive && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.3)',
                                  animation: 'pulse 2s ease-in-out infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 0, transform: 'scale(1)' },
                                    '50%': { opacity: 1, transform: 'scale(1.1)' },
                                  },
                                }}
                              />
                            )}
                            
                            <Box sx={{ position: 'relative', zIndex: 1 }}>
                              {isPast ? <CheckCircle size={48} /> : step.icon}
                            </Box>
                          </Box>

                          {/* Step number badge */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'white',
                              color: step.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '1rem',
                              boxShadow: `0 2px 12px ${step.color}40`,
                            }}
                          >
                            {index + 1}
                          </Box>
                        </Box>

                        {/* Step content */}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: 'white',
                                fontSize: isActive ? '1.3rem' : '1.1rem',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              {step.title}
                            </Typography>
                            {isActive && (
                              <Fade in timeout={400}>
                                <Box sx={{ color: 'white' }}>{step.subIcon}</Box>
                              </Fade>
                            )}
                          </Box>
                          
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.9)',
                              lineHeight: 1.6,
                              fontSize: isActive ? '1rem' : '0.9rem',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            {step.description}
                          </Typography>
                        </Box>

                        {/* Arrow indicator */}
                        {index < steps.length - 1 && (
                          <Box
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              transform: isActive ? 'translateX(5px)' : 'translateX(0)',
                              transition: 'transform 0.3s ease',
                            }}
                          >
                            <ArrowRight size={24} />
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Zoom>
              );
            })}
          </Stack>

          {/* Progress indicator dots */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
            {steps.map((_, index) => (
              <Box
                key={index}
                onClick={() => setActiveStep(index)}
                sx={{
                  width: activeStep === index ? 40 : 12,
                  height: 12,
                  borderRadius: 6,
                  background: activeStep === index
                    ? 'white'
                    : 'rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: activeStep === index ? '0 2px 8px rgba(255, 255, 255, 0.5)' : 'none',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.8)',
                    transform: 'scale(1.1)',
                  },
                }}
              />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default EPSMExplainerAnimation;
