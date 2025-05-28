import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Link,
  Divider,
  Stack,
  IconButton,
  useTheme
} from '@mui/material';
import { X, Brain, User, Users, Landmark, Coins, Target, Search, ExternalLink, Clock } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const AboutDialog = ({ open, onClose }: AboutDialogProps) => {
  const theme = useTheme();

  const Section = ({ 
    title, 
    icon, 
    children 
  }: { 
    title: string; 
    icon?: React.ReactNode;
    children: React.ReactNode 
  }) => (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h6" 
        gutterBottom 
        color="primary" 
        sx={{ 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '&::after': {
            content: '""',
            flexGrow: 1,
            height: '1px',
            bgcolor: 'divider',
            ml: 2
          }
        }}
      >
        {icon}
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        elevation: 24,
        sx: {
          borderRadius: 2,
          backgroundImage: theme.palette.mode === 'dark'
            ? 'linear-gradient(45deg, rgba(30,30,30,1), rgba(40,40,40,1))'
            : 'linear-gradient(45deg, rgba(255,255,255,1), rgba(250,250,250,1))',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography 
          variant="h5" 
          component="span" 
          sx={{ 
            fontWeight: 700,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #90caf9 30%, #42a5f5 90%)'
              : 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          About EPSM
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.1)'
            }
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography 
          variant="subtitle1" 
          paragraph 
          color="text.secondary"
          sx={{ 
            borderLeft: '4px solid',
            borderColor: 'primary.main',
            pl: 2,
            py: 1,
            bgcolor: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.05)'
              : 'rgba(25,118,210,0.05)',
            borderRadius: '0 4px 4px 0',
            mt: 2
          }}
        >
          EnergyPlus Simulation Manager (EPSM) is a user-friendly, web-based platform designed to simplify, 
          automate, and scale building energy simulation workflows.
        </Typography>

        <Section title="Project Background" icon={<Target size={20} />}>
          <Typography variant="body1" paragraph>
            Sweden's property sector faces critical challenges:
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body1">• Escalating energy prices</Typography>
            <Typography variant="body1">• High greenhouse gas emissions</Typography>
            <Typography variant="body1">• A slow and fragmented renovation rate</Typography>
          </Stack>
          <Typography variant="body1" paragraph>
            EPSM addresses these gaps by combining:
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body1">• Physics-based modeling through EnergyPlus</Typography>
            <Typography variant="body1">• Intelligent parameter exploration using machine learning</Typography>
            <Typography variant="body1">• Integration of embodied carbon and life cycle impact metrics</Typography>
          </Stack>
        </Section>

        <Section title="What EPSM Offers" icon={<Search size={20} />}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Interactive component database</Typography>
              <Typography variant="body2" color="text.secondary">
                Create, edit, and manage material libraries, constructions, and envelope templates with life cycle metrics.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Baseline model ingestion</Typography>
              <Typography variant="body2" color="text.secondary">
                Upload existing IDF files, parse geometry and schedules, and run base-case simulations in parallel.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Scenario builder</Typography>
              <Typography variant="body2" color="text.secondary">
                Define retrofit scenarios by selecting from stored construction templates and estimating total simulations and run times.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Simulation batch runner</Typography>
              <Typography variant="body2" color="text.secondary">
                Run and monitor large-scale simulations with real-time feedback, CPU usage tracking, and result visualization.
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>ML-Ready outputs</Typography>
              <Typography variant="body2" color="text.secondary">
                All simulations are logged and stored for later use in training surrogate models, enabling fast future evaluations.
              </Typography>
            </Box>
          </Stack>
        </Section>

        <Section title="Project Team" icon={<Users size={20} />}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <User size={18} /> Lead Developer
              </Typography>
              <Typography variant="body1">Sanjay Somanath</Typography>
              <Typography variant="body2" color="text.secondary">
                Chalmers University of Technology
                Department of Architecture and Civil Engineering
                Building Technology Division
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Brain size={18} /> Principal Investigator
              </Typography>
              <Typography variant="body1">Alexander Hollberg (Contact)</Typography>
              <Typography variant="body2" color="text.secondary">
                Chalmers, Architecture and Civil Engineering, Building Technology
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Users size={18} /> Team Members
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body1">Yinan Yu</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Department of Computer Science and Engineering, Functional Programming
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body1">Sanjay Somanath</Typography>
                  <Typography variant="body2" color="text.secondary">
                    (also lead developer)
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Section>

        <Section title="Collaborating Partners" icon={<Users size={20} />}>
          <Stack spacing={1}>
            <Typography variant="body1">• Lindholmen Science Park AB – Gothenburg, Sweden</Typography>
            <Typography variant="body1">• Sinom AB – Göteborg, Sweden</Typography>
            <Typography variant="body1">• Stiftelsen Chalmers Industriteknik – Gothenburg, Sweden</Typography>
          </Stack>
        </Section>

        <Section title="Funding" icon={<Coins size={20} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Landmark size={24} />
            <Box>
              <Typography variant="body1">Swedish Energy Agency</Typography>
              <Typography variant="body2" color="text.secondary">Project ID P2024-04053 (2025–2027)</Typography>
            </Box>
          </Box>
        </Section>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: 2
        }}>
          <Link 
            href="https://www.chalmers.se/en/projects/Pages/12229.aspx" 
            target="_blank"
            rel="noopener noreferrer"
            sx={{ 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
              '&:hover': {
                color: 'primary.dark'
              }
            }}
          >
            <ExternalLink size={16} />
            <Typography variant="body2">
              Chalmers Research Project – 12229
            </Typography>
          </Link>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Clock size={14} />
            Last updated: 6 May 2025
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AboutDialog;