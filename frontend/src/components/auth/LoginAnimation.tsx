import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, Chip, LinearProgress, Fade, Grow } from '@mui/material';
import {
  Building,
  Database,
  Zap,
  BarChart3,
  Shield,
  Cpu,
  Lock,
  CheckCircle2,
} from 'lucide-react';

// EPSM Blue color scheme
const EPSM_COLORS = {
  primary: '#1976d2',
  primaryDark: '#1565c0',
  accent: '#2196f3',
  success: '#2e7d32',
};

const LoginAnimation: React.FC = () => {
  const [activeIcon, setActiveIcon] = useState(0);
  const [progress, setProgress] = useState(0);

  const authSteps = [
    { icon: <Shield size={48} />, label: 'Securing connection...', color: EPSM_COLORS.primary },
    { icon: <Database size={48} />, label: 'Connecting to database...', color: EPSM_COLORS.primaryDark },
    { icon: <Building size={48} />, label: 'Loading building data...', color: EPSM_COLORS.accent },
    { icon: <Cpu size={48} />, label: 'Initializing simulation engine...', color: EPSM_COLORS.primary },
    { icon: <Zap size={48} />, label: 'Preparing workspace...', color: EPSM_COLORS.primaryDark },
    { icon: <BarChart3 size={48} />, label: 'Loading analytics...', color: EPSM_COLORS.accent },
    { icon: <CheckCircle2 size={48} />, label: 'Ready!', color: EPSM_COLORS.success },
  ];

  useEffect(() => {
    const iconInterval = setInterval(() => {
      setActiveIcon((prev) => {
        const next = (prev + 1) % authSteps.length;
        if (next === authSteps.length - 1) {
          // Last step - show "Ready!" for longer
          setTimeout(() => {
            // Component will unmount when login completes
          }, 3000);
        }
        return next;
      });
    }, 5000); // Increased from 3000ms to 5000ms (5 seconds per step)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 5;
      });
    }, 800);

    return () => {
      clearInterval(iconInterval);
      clearInterval(progressInterval);
    };
  }, [authSteps.length]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: 3,
        p: 4,
        pt: 8,
      }}
    >
      {/* Main animated icon with energy pulse rings */}
      <Box sx={{ position: 'relative', mb: 6 }}>
        {/* Outer energy pulse rings */}
        {[0, 1, 2].map((ring) => (
          <Box
            key={ring}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 140 + ring * 50,
              height: 140 + ring * 50,
              borderRadius: '50%',
              border: '3px solid',
              borderColor: authSteps[activeIcon].color,
              opacity: 0,
              animation: `pulse ${2.5}s ease-out infinite`,
              animationDelay: `${ring * 0.5}s`,
              '@keyframes pulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  opacity: 0.8,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1.6)',
                  opacity: 0,
                },
              },
            }}
          />
        ))}

        {/* Center icon container with rotation */}
        <Grow in timeout={700}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 140,
              height: 140,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              boxShadow: `0 0 40px ${authSteps[activeIcon].color}50`,
              transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '4px solid',
              borderColor: authSteps[activeIcon].color,
            }}
          >
            {/* Rotating icons */}
            {authSteps.map((step, idx) => (
              <Fade key={idx} in={activeIcon === idx} timeout={700}>
                <Box
                  sx={{
                    position: 'absolute',
                    color: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: activeIcon === idx ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(180deg)',
                    transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {step.icon}
                </Box>
              </Fade>
            ))}
          </Box>
        </Grow>
      </Box>

      {/* Animated status text */}
      <Box sx={{ textAlign: 'center', minHeight: 90, mb: 2, mt: 3 }}>
        <Fade in timeout={600} key={activeIcon}>
          <Typography
            variant="h5"
            sx={{
              color: authSteps[activeIcon].color,
              fontWeight: 600,
              mb: 2,
              animation: 'fadeSlide 0.8s ease-in-out',
              '@keyframes fadeSlide': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(10px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {authSteps[activeIcon].label}
          </Typography>
        </Fade>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
          {activeIcon === authSteps.length - 1
            ? 'Welcome to EPSM!'
            : 'Preparing your workspace...'}
        </Typography>

        {/* Progress bar */}
        <Box sx={{ width: 500, maxWidth: '90vw', mx: 'auto' }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                bgcolor: authSteps[activeIcon].color,
                borderRadius: 5,
                transition: 'all 0.4s ease',
              },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
            {Math.round(Math.min(progress, 100))}% complete
          </Typography>
        </Box>
      </Box>

      {/* Floating status badges - similar to results page */}
      <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center" sx={{ mt: 2 }}>
        {[
          { icon: <Lock size={18} />, label: 'Secure Authentication', color: EPSM_COLORS.primary },
          { icon: <Database size={18} />, label: 'Database Connected', color: EPSM_COLORS.primaryDark },
          { icon: <Building size={18} />, label: 'Building Data', color: EPSM_COLORS.accent },
          { icon: <BarChart3 size={18} />, label: 'Analytics Engine', color: EPSM_COLORS.success },
        ].map((badge, idx) => (
          <Fade key={idx} in timeout={1000} style={{ transitionDelay: `${idx * 200}ms` }}>
            <Chip
              icon={badge.icon}
              label={badge.label}
              size="medium"
              sx={{
                bgcolor: 'background.paper',
                borderColor: badge.color,
                color: badge.color,
                border: '2px solid',
                boxShadow: 2,
                px: 1,
                py: 2.5,
                fontSize: '0.95rem',
                animation: 'float 3.5s ease-in-out infinite',
                animationDelay: `${idx * 0.4}s`,
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-8px)' },
                },
              }}
            />
          </Fade>
        ))}
      </Stack>

      {/* Chalmers branding */}
      <Fade in timeout={1500}>
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Powered by
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${EPSM_COLORS.primaryDark} 30%, ${EPSM_COLORS.accent} 90%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Chalmers University of Technology
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
};

export default LoginAnimation;
