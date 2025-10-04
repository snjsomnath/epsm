import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Fade,
  useTheme,
  Zoom,
  Slide,
  Grow,
  keyframes,
} from '@mui/material';
import {
  Building,
  GitBranch,
  Zap,
  BarChart3,
  Layers,
  Sparkles,
  Wallpaper,
  SquareStack,
  Wind,
  ArrowRight,
} from 'lucide-react';

// Animated path drawing keyframes
const drawPath = keyframes`
  from {
    stroke-dashoffset: 40;
  }
  to {
    stroke-dashoffset: 0;
  }
`;

// Particle burst for finale
const particleBurst = keyframes`
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x), var(--y)) scale(0);
    opacity: 0;
  }
`;

const LoginPageExplainer: React.FC = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [showCalculation, setShowCalculation] = useState(false);

  // Simulation steps with context visuals
  const steps = [
    { 
      id: 0, 
      label: 'Base Building', 
      color: '#1565c0', 
      icon: Building,
      contextIcon: Building,
      count: 1,
      description: 'Start with your building model',
      contextText: 'Energy model baseline'
    },
    { 
      id: 1, 
      label: 'Insulation Options', 
      color: '#1976d2', 
      icon: GitBranch,
      contextIcon: Wallpaper,
      count: 3,
      description: 'Wall, roof, floor combinations',
      contextText: 'Thermal envelope upgrades',
      cumulative: 3
    },
    { 
      id: 2, 
      label: 'Window Types', 
      color: '#2196f3', 
      icon: Layers,
      contextIcon: SquareStack,
      count: 4,
      description: 'Single, double, triple glazing',
      contextText: 'Glazing performance layers',
      cumulative: 12 // 3×4
    },
    { 
      id: 3, 
      label: 'HVAC Systems', 
      color: '#42a5f5', 
      icon: Zap,
      contextIcon: Wind,
      count: 2,
      description: 'Heat pump or gas boiler',
      contextText: 'Climate control systems',
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

  // Generate particle burst positions
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: Math.cos((i / 12) * Math.PI * 2) * 80,
    y: Math.sin((i / 12) * Math.PI * 2) * 80,
  }));

  return (
    <Box 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 3,
        paddingTop: 8, // Move entire component down
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
            const ContextIcon = step.contextIcon;
            const isActive = activeStep === index;
            const isPast = activeStep > index;
            
            return (
              <React.Fragment key={step.id}>
                {/* Step indicator with context card */}
                <Box sx={{ flex: 1, position: 'relative' }}>
                  {/* Context card - slides in from top */}
                  {isActive && (
                    <Slide direction="down" in timeout={500}>
                      <Paper
                        sx={{
                          position: 'absolute',
                          top: -120,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)',
                          border: `2px solid ${step.color}`,
                          boxShadow: `0 4px 20px ${step.color}40`,
                          minWidth: 140,
                          zIndex: 10,
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: `${step.color}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ContextIcon size={18} style={{ color: step.color }} />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: step.color }}>
                            {step.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                          {step.contextText}
                        </Typography>
                      </Paper>
                    </Slide>
                  )}

                  {/* Main step indicator - varied motion */}
                  {index % 2 === 0 ? (
                    <Zoom in timeout={400}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        {/* Icon circle with ghost effect */}
                        <Box sx={{ position: 'relative' }}>
                          {/* Ghost/pulse for past steps */}
                          {isPast && (
                            <Box
                              sx={{
                                position: 'absolute',
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                border: `2px solid ${step.color}`,
                                animation: 'ghostPulse 2s infinite',
                                '@keyframes ghostPulse': {
                                  '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                                  '50%': { opacity: 0.6, transform: 'scale(1.15)' },
                                },
                              }}
                            />
                          )}

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
                              transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              position: 'relative',
                            }}
                          >
                            <Icon size={28} color="#fff" style={{ 
                              transform: isActive ? 'rotate(360deg)' : 'rotate(0deg)',
                              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
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
                        </Box>

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

                        {step.cumulative && (
                          <Grow in={isActive || isPast} timeout={600}>
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
                          </Grow>
                        )}
                      </Box>
                    </Zoom>
                  ) : (
                    <Slide direction="up" in timeout={600}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ position: 'relative' }}>
                          {isPast && (
                            <Box
                              sx={{
                                position: 'absolute',
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                border: `2px solid ${step.color}`,
                                animation: 'ghostPulse 2s infinite',
                                '@keyframes ghostPulse': {
                                  '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                                  '50%': { opacity: 0.6, transform: 'scale(1.15)' },
                                },
                              }}
                            />
                          )}

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
                              transition: 'all 0.4s ease-out',
                              position: 'relative',
                            }}
                          >
                            <Icon size={28} color="#fff" style={{ 
                              transform: isActive ? 'rotate(360deg)' : 'rotate(0deg)',
                              transition: 'transform 0.6s ease-in-out'
                            }} />
                            
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
                        </Box>

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

                        {step.cumulative && (
                          <Grow in={isActive || isPast} timeout={600}>
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
                          </Grow>
                        )}
                      </Box>
                    </Slide>
                  )}
                </Box>

                {/* Animated glowing path connector */}
                {index < steps.length - 1 && (
                  <Box sx={{ position: 'relative', width: 40, height: 3 }}>
                    {/* Background line */}
                    <Box
                      sx={{
                        position: 'absolute',
                        width: '100%',
                        height: 3,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        borderRadius: 2,
                      }}
                    />
                    
                    {/* Animated glowing line */}
                    {isPast && (
                      <Box
                        component="svg"
                        width="40"
                        height="3"
                        sx={{ position: 'absolute', top: 0, left: 0 }}
                      >
                        <line
                          x1="0"
                          y1="1.5"
                          x2="40"
                          y2="1.5"
                          stroke={steps[index + 1].color}
                          strokeWidth="3"
                          strokeDasharray="40"
                          strokeDashoffset="0"
                          style={{
                            filter: `drop-shadow(0 0 4px ${steps[index + 1].color})`,
                            animation: `${drawPath} 0.6s ease-out`,
                          }}
                        />
                      </Box>
                    )}

                    {/* Arrow head */}
                    <Box
                      sx={{
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
                        filter: isPast ? `drop-shadow(0 0 3px ${steps[index + 1].color})` : 'none',
                      }}
                    />
                  </Box>
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

      {/* Final Calculation with Animation & Particle Burst */}
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
            overflow: 'visible',
          }}
        >
          {/* Particle burst effect */}
          {showCalculation && particles.map((particle, i) => (
            <Box
              key={i}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#1976d2',
                opacity: 0,
                '--x': `${particle.x}px`,
                '--y': `${particle.y}px`,
                animation: `${particleBurst} 0.8s ease-out ${i * 0.05}s`,
                boxShadow: '0 0 8px #1976d2',
              }}
            />
          ))}

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

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
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
              
              {/* Animated "Continue" pulse hint */}
              <Grow in={showCalculation} timeout={800} style={{ transitionDelay: '600ms' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#1976d2',
                    animation: 'nudge 2s infinite',
                    '@keyframes nudge': {
                      '0%, 100%': { transform: 'translateX(0px)', opacity: 0.7 },
                      '50%': { transform: 'translateX(4px)', opacity: 1 },
                    },
                  }}
                >
                  <ArrowRight size={18} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Sign in to explore
                  </Typography>
                </Box>
              </Grow>
            </Box>
          </Box>
        </Paper>
      </Zoom>
    </Box>
  );
};

export default LoginPageExplainer;
