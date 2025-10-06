import React, { useMemo, useState, useEffect } from 'react';
import { Alert, Chip, Stack, Typography, Box, Fade, Grow } from '@mui/material';
import { Check, AlertTriangle, XCircle, Building, Thermometer, Zap, Wind, Cloud, Cpu, Activity, BarChart3 } from 'lucide-react';
import SectionCard from '../SectionCard';
import SimulationResultsView from '../SimulationResultsView';

// Animated loading component for simulation processing
const SimulationLoadingAnimation: React.FC = () => {
  const [activeIcon, setActiveIcon] = useState(0);

  const simulationSteps = [
    { icon: <Building size={40} />, label: 'Processing building models', color: '#1976d2' },
    { icon: <Cloud size={40} />, label: 'Applying weather data', color: '#0288d1' },
    { icon: <Thermometer size={40} />, label: 'Calculating thermal zones', color: '#d32f2f' },
    { icon: <Wind size={40} />, label: 'Simulating HVAC systems', color: '#00796b' },
    { icon: <Zap size={40} />, label: 'Computing energy use', color: '#f57c00' },
    { icon: <Cpu size={40} />, label: 'Running EnergyPlus engine', color: '#7b1fa2' },
    { icon: <BarChart3 size={40} />, label: 'Generating results', color: '#c62828' },
  ];

  useEffect(() => {
    const iconInterval = setInterval(() => {
      setActiveIcon((prev) => (prev + 1) % simulationSteps.length);
    }, 1200);

    return () => clearInterval(iconInterval);
  }, [simulationSteps.length]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 3,
        py: 6,
      }}
    >
      {/* Animated icon with pulsing rings */}
      <Box sx={{ position: 'relative', mb: 4 }}>
        {/* Outer energy pulse rings */}
        {[0, 1, 2].map((ring) => (
          <Box
            key={ring}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 100 + ring * 40,
              height: 100 + ring * 40,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: simulationSteps[activeIcon].color,
              opacity: 0,
              animation: `pulse ${2.5}s ease-out infinite`,
              animationDelay: `${ring * 0.5}s`,
              '@keyframes pulse': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.8)',
                  opacity: 0.6,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1.5)',
                  opacity: 0,
                },
              },
            }}
          />
        ))}

        {/* Center icon container */}
        <Grow in timeout={600}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              boxShadow: `0 0 30px ${simulationSteps[activeIcon].color}30`,
              transition: 'all 1s ease-in-out',
              border: '3px solid',
              borderColor: simulationSteps[activeIcon].color,
            }}
          >
            {/* Rotating icons */}
            {simulationSteps.map((step, idx) => (
              <Fade key={idx} in={activeIcon === idx} timeout={600}>
                <Box
                  sx={{
                    position: 'absolute',
                    color: step.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: activeIcon === idx ? 'scale(1) rotate(0deg)' : 'scale(0.5) rotate(180deg)',
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
      <Box sx={{ textAlign: 'center', minHeight: 60 }}>
        <Fade in timeout={500} key={activeIcon}>
          <Typography
            variant="h6"
            sx={{
              color: simulationSteps[activeIcon].color,
              fontWeight: 600,
              mb: 1,
              animation: 'fadeSlide 0.8s ease-in-out',
              '@keyframes fadeSlide': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(8px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {simulationSteps[activeIcon].label}
          </Typography>
        </Fade>
        
        <Typography variant="body2" color="text.secondary">
          Running simulations in parallel...
        </Typography>
      </Box>

      {/* Floating simulation status chips */}
      <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" sx={{ mt: 2, maxWidth: 600 }}>
        {[
          { icon: <Thermometer size={16} />, label: 'Thermal', color: '#d32f2f' },
          { icon: <Zap size={16} />, label: 'Energy', color: '#f57c00' },
          { icon: <Activity size={16} />, label: 'Load', color: '#1976d2' },
          { icon: <BarChart3 size={16} />, label: 'Metrics', color: '#7b1fa2' },
        ].map((metric, idx) => (
          <Fade key={idx} in timeout={800} style={{ transitionDelay: `${idx * 150}ms` }}>
            <Chip
              icon={metric.icon}
              label={metric.label}
              size="small"
              sx={{
                bgcolor: 'background.paper',
                borderColor: metric.color,
                color: metric.color,
                border: '1.5px solid',
                boxShadow: 1,
                animation: 'float 3s ease-in-out infinite',
                animationDelay: `${idx * 0.3}s`,
                '@keyframes float': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-8px)' },
                },
              }}
            />
          </Fade>
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 3, textAlign: 'center', maxWidth: 400 }}>
        Results will appear here automatically as simulations complete
      </Typography>
    </Box>
  );
};

export type ResultsSectionProps = {
  isComplete: boolean;
  isRunning: boolean;
  results: any[];
  error: string | null;
};

const ResultsSection: React.FC<ResultsSectionProps> = ({ isComplete, isRunning, results, error }) => {
  // Analyze results for errors
  const resultStats = useMemo(() => {
    if (!results || results.length === 0) {
      return { total: 0, success: 0, errors: 0, successRate: 0 };
    }
    
    const errorResults = results.filter(r => 
      r.status === 'error' || 
      r.raw_json?.status === 'error' ||
      r.raw_json?.error ||
      !r.total_energy_use
    );
    const successResults = results.filter(r => 
      r.status !== 'error' && 
      r.total_energy_use !== null
    );
    
    return {
      total: results.length,
      success: successResults.length,
      errors: errorResults.length,
      successRate: Math.round((successResults.length / results.length) * 100),
    };
  }, [results]);
  
  const hasResults = Array.isArray(results) && results.length > 0;
  const hasErrors = resultStats.errors > 0;
  const allFailed = resultStats.errors === resultStats.total && resultStats.total > 0;
  const showCachedNotice = !isRunning && !isComplete && hasResults;
  const subtitle = isComplete
    ? 'Latest finished batch'
    : hasResults
      ? 'Showing the most recent results'
      : 'Results appear once the batch completes';

  return (
    <SectionCard
      title="Simulation Results"
      subtitle={subtitle}
      actions={isComplete ? (
        hasErrors ? (
          allFailed ? (
            <Chip size="small" color="error" label="All Failed" icon={<XCircle size={16} />} />
          ) : (
            <Chip size="small" color="warning" label="Partial Success" icon={<AlertTriangle size={16} />} />
          )
        ) : (
          <Chip size="small" color="success" label="Ready" icon={<Check size={16} />} />
        )
      ) : undefined}
    >
      {error && (
        <Alert severity="error">{error}</Alert>
      )}
      
      {/* Show error summary if results have errors */}
      {isComplete && hasErrors && (
        <Alert severity={allFailed ? "error" : "warning"} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {allFailed 
                ? `All ${resultStats.total} simulations failed` 
                : `${resultStats.errors} of ${resultStats.total} simulations failed`
              }
            </Typography>
            <Typography variant="body2">
              Success rate: {resultStats.successRate}% ({resultStats.success}/{resultStats.total})
            </Typography>
            {allFailed && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Common issue: Check if weather file is valid. See console logs for details.
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {isRunning && !hasResults && (
        <SimulationLoadingAnimation />
      )}

      {showCachedNotice && (
        <Alert severity="info" sx={{ mb: hasResults ? 2 : 0 }}>
          Showing cached results from your last completed run.
        </Alert>
      )}

      {hasResults && (
        <SimulationResultsView results={results} />
      )}

      {!isRunning && !hasResults && (
        <Alert severity="info">
          Run a batch to view combined EnergyPlus outputs here.
        </Alert>
      )}
    </SectionCard>
  );
};

export default ResultsSection;
