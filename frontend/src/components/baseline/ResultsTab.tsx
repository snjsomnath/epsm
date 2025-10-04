import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Pagination,
  TextField,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Download, FileText, Zap, Thermometer, Snowflake, Clock, ChevronDown, Lightbulb, Cpu, Droplet, Wind, Sun, Activity } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ResultsTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
  simulationResults: any;
}

const ResultsTab = ({ uploadedFiles, simulationComplete, simulationResults }: ResultsTabProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [rawDataRendered, setRawDataRendered] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [linesPerPage, setLinesPerPage] = useState(100);
  const [isLoadingRawData, setIsLoadingRawData] = useState(false);
  const [rawDataChunks, setRawDataChunks] = useState<string[]>([]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Only render raw data when the tab is actually selected
    if (newValue === 2 && !rawDataRendered) {
      setRawDataRendered(true);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleLinesPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLinesPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Format energy use data for the chart (normalized per m²)
  const formatEnergyUseData = (energyUse: any, floorArea: number = 1) => {
    if (!energyUse) return null;

    const adjustedFloorArea = floorArea > 0 ? floorArea : 1;

    const categories = Object.keys(energyUse).filter(key => {
      const entry = energyUse[key];
      const total = toOptionalNumber(entry?.total);
      return total !== null && total > 0;
    });

    // Create two main labels for the stacks
    const labels = ['Electric', 'District Heating'];

    // Color palettes
    const blueShades = [
      'rgba(13, 71, 161, 0.8)',   // Dark blue
      'rgba(25, 118, 210, 0.8)',  // Medium blue
      'rgba(66, 165, 245, 0.8)',  // Light blue
      'rgba(100, 181, 246, 0.8)', // Lighter blue
      'rgba(144, 202, 249, 0.8)', // Very light blue
    ];

    const redPinkShades = [
      'rgba(183, 28, 28, 0.8)',   // Dark red
      'rgba(211, 47, 47, 0.8)',   // Medium red
      'rgba(244, 67, 54, 0.8)',   // Red
      'rgba(239, 83, 80, 0.8)',   // Light red
      'rgba(255, 138, 128, 0.8)', // Pink
    ];

    const datasets: any[] = [];
    let blueIndex = 0;
    let redIndex = 0;

    categories.forEach(category => {
      const entry = energyUse[category] || {};
      const electricity = (toOptionalNumber(entry.electricity) || 0) / adjustedFloorArea;
      const districtHeating = (toOptionalNumber(entry.district_heating) || 0) / adjustedFloorArea;

      if (electricity > 0) {
        datasets.push({
          label: `${category} (Electric)`,
          data: [electricity, 0], // First bar (Electric), zero for second bar
          backgroundColor: blueShades[blueIndex % blueShades.length],
          borderColor: blueShades[blueIndex % blueShades.length].replace('0.8', '1'),
          borderWidth: 1,
          stack: 'stack0',
        });
        blueIndex++;
      }

      if (districtHeating > 0) {
        datasets.push({
          label: `${category} (Heating)`,
          data: [0, districtHeating], // Zero for first bar, second bar (Heating)
          backgroundColor: redPinkShades[redIndex % redPinkShades.length],
          borderColor: redPinkShades[redIndex % redPinkShades.length].replace('0.8', '1'),
          borderWidth: 1,
          stack: 'stack0',
        });
        redIndex++;
      }
    });

    return {
      labels: labels,
      datasets: datasets
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: false, // Hide legend to save space
      },
      title: {
        display: true,
        text: 'Energy Use by End Use',
        font: { size: 14 }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            if (value === 0) return undefined; // Don't show zero values
            return `${context.dataset.label}: ${value.toFixed(1)} kWh/m²`;
          },
          footer: function(tooltipItems: any[]) {
            // Calculate totals for the hovered bar
            const dataIndex = tooltipItems[0].dataIndex;
            const datasets = tooltipItems[0].chart.data.datasets;
            
            let total = 0;
            
            datasets.forEach((dataset: any) => {
              const value = dataset.data[dataIndex] || 0;
              total += value;
            });
            
            return total > 0 ? `Total: ${total.toFixed(1)} kWh/m²` : '';
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'kWh/m²'
        }
      }
    }
  };

  const toNumber = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const toOptionalNumber = (value: unknown): number | null => {
    if (value === undefined || value === null || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const pickNumberFromKeys = (source: any, keys: string[]): number | null => {
    if (!source) return null;
    for (const key of keys) {
      const candidate = toOptionalNumber(source?.[key]);
      if (candidate !== null) return candidate;
    }
    return null;
  };

  const getResultArea = (result: any): number => {
    const area = pickNumberFromKeys(result, [
      'buildingArea',
      'building_area',
      'floorArea',
      'floor_area',
      'totalArea',
      'total_area',
      'totalArea_m2',
      'total_area_m2',
      'grossFloorArea',
      'gross_floor_area',
      'area',
    ]);
    return area && area > 0 ? area : 0;
  };

  const getNormalizedMetric = (
    result: any,
    normalizedKeys: string[],
    totalKeys: string[] = []
  ): number => {
    const normalized = pickNumberFromKeys(result, normalizedKeys);
    if (normalized !== null) return normalized;

    if (totalKeys.length === 0) return 0;
    const area = getResultArea(result);
    if (area <= 0) return 0;

    const total = pickNumberFromKeys(result, totalKeys);
    if (total === null) return 0;
    return total / area;
  };

  const buildEnergyBreakdownChartData = (items: any[]) => {
    const labels = items.map((result, idx) => result.fileName || `Result ${idx + 1}`);
    const heating = items.map(result => getNormalizedMetric(
      result,
      ['heatingDemand', 'heating_demand', 'heatingIntensity', 'heating_intensity', 'heating_per_m2'],
      ['heating', 'heating_kwh', 'totalHeating', 'total_heating']
    ));
    const cooling = items.map(result => getNormalizedMetric(
      result,
      ['coolingDemand', 'cooling_demand', 'coolingIntensity', 'cooling_intensity', 'cooling_per_m2'],
      ['cooling', 'cooling_kwh', 'totalCooling', 'total_cooling']
    ));
    const lighting = items.map(result => getNormalizedMetric(
      result,
      ['lightingDemand', 'lighting_demand', 'lightingIntensity', 'lighting_intensity', 'lighting_per_m2'],
      ['lighting', 'lighting_kwh', 'totalLighting', 'total_lighting']
    ));
    const equipment = items.map(result => getNormalizedMetric(
      result,
      ['equipmentDemand', 'equipment_demand', 'equipmentIntensity', 'equipment_intensity', 'equipment_per_m2'],
      ['equipment', 'equipment_kwh', 'totalEquipment', 'total_equipment']
    ));
    const electricity = lighting.map((value, idx) => Math.max(0, value + equipment[idx]));

    return {
      labels,
      datasets: [
        {
          label: 'Heating (kWh/m²)',
          data: heating,
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
          borderColor: 'rgba(211, 47, 47, 1)',
          borderWidth: 1,
          stack: 'energy'
        },
        {
          label: 'Cooling (kWh/m²)',
          data: cooling,
          backgroundColor: 'rgba(33, 150, 243, 0.8)',
          borderColor: 'rgba(25, 118, 210, 1)',
          borderWidth: 1,
          stack: 'energy'
        },
        {
          label: 'Electric (kWh/m²)',
          data: electricity,
          backgroundColor: 'rgba(255, 193, 7, 0.8)',
          borderColor: 'rgba(255, 160, 0, 1)',
          borderWidth: 1,
          stack: 'energy'
        }
      ]
    };
  };

  const energyBreakdownChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: { 
        position: 'top' as const,
        display: false // Hide legend to save space
      },
      title: { 
        display: true, 
        text: 'Heating vs Cooling vs Electric',
        font: { size: 14 }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const rawValue = typeof context.raw === 'number' ? context.raw : Number(context.raw || 0);
            return `${context.dataset.label}: ${rawValue.toFixed(1)} kWh/m²`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: { display: false },
        ticks: { display: false } // Hide x-axis labels to save space
      },
      y: {
        stacked: true,
        title: { display: true, text: 'kWh/m²' }
      }
    }
  };

  if (!simulationComplete) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Run the baseline simulation to view results.
      </Alert>
    );
  }

  if (!simulationResults) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No simulation results available.
      </Alert>
    );
  }

  // Allow viewing results even without uploaded files (for historical runs)
  if (uploadedFiles.length === 0 && !simulationResults) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please upload IDF files to view simulation results.
      </Alert>
    );
  }

  // Ensure simulationResults is an array for consistency
  const resultsArray = Array.isArray(simulationResults) 
    ? simulationResults 
    : [simulationResults];

  // Get chart data from the first result (if multiple files)
  // Extract floor area from first result (fallback to 1 if not available)
  const primaryResult = resultsArray[0];
  const floorAreaRaw = primaryResult ? getResultArea(primaryResult) : 0;
  const floorArea = floorAreaRaw > 0 ? floorAreaRaw : 1;
  const chartData = formatEnergyUseData(primaryResult?.energy_use, floorArea);
  const energyBreakdownChartData = buildEnergyBreakdownChartData(resultsArray);

  // Process raw data in chunks to avoid freezing the UI
  useEffect(() => {
    if (!rawDataRendered) {
      setRawDataChunks([]);
      setIsLoadingRawData(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingRawData(true);

    // Process in the next tick to avoid blocking the render
    const processData = async () => {
      try {
        const jsonString = JSON.stringify(resultsArray, null, 2);
        
        // Split into lines
        const lines = jsonString.split('\n');
        
        if (isCancelled) return;
        
        setRawDataChunks(lines);
        setIsLoadingRawData(false);
      } catch (error) {
        console.error('Error processing raw data:', error);
        if (!isCancelled) {
          setIsLoadingRawData(false);
        }
      }
    };

    // Delay slightly to ensure tab switch animation completes
    const timeoutId = setTimeout(processData, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [resultsArray, rawDataRendered]);

  // Calculate pagination for raw data
  const totalPages = useMemo(() => 
    Math.ceil(rawDataChunks.length / linesPerPage),
    [rawDataChunks.length, linesPerPage]
  );

  const paginatedRawData = useMemo(() => {
    const startIndex = (currentPage - 1) * linesPerPage;
    const endIndex = startIndex + linesPerPage;
    return rawDataChunks.slice(startIndex, endIndex).join('\n');
  }, [rawDataChunks, currentPage, linesPerPage]);

  // Parse hourly timeseries datasets from simulation results
  const hourlyTimeseriesData = useMemo(() => {
    if (!resultsArray || resultsArray.length === 0) return [];
    
    const firstResult = resultsArray[0];
    const timeseries: Array<{name: string, data: number[], label: string}> = [];
    
    // Helper function to create clean labels from variable names
    const createCleanLabel = (key: string): string => {
      // Remove common prefixes and suffixes
      let cleaned = key
        .replace(/_Energy_J$/g, '')
        .replace(/_Electricity_Energy_J$/g, '')
        .replace(/_Gas_Energy_J$/g, '')
        .replace(/_J$/g, '')
        .replace(/_Energy$/g, '');
      
      // Extract zone name if present (pattern: something_Zone_...)
      const zoneMatch = cleaned.match(/(.+?)_Zone_(.+)/);
      if (zoneMatch) {
        const zoneName = zoneMatch[1];
        const measurement = zoneMatch[2];
        
        // Clean up zone name - remove building/floor prefixes if they're concatenated
        let cleanZone = zoneName
          .replace(/^FLR\d+_?/gi, '') // Remove FLR1, FLR2, etc.
          .replace(/^FLOOR\d+_?/gi, '') // Remove FLOOR1, FLOOR2, etc.
          .replace(/^BLD\d+_?/gi, '') // Remove BLD1, BLD2, etc.
          .replace(/^BUILDING\d+_?/gi, ''); // Remove BUILDING1, etc.
        
        // Extract floor and room info if present
        const floorMatch = cleanZone.match(/FLOOR(\d+)_?ROOM(\d+)/i);
        let zoneInfo = cleanZone;
        
        if (floorMatch) {
          const floor = floorMatch[1];
          const room = floorMatch[2];
          // Remove the FLOOR#ROOM# part and use what's before it as building name
          const buildingName = cleanZone.replace(/FLOOR\d+_?ROOM\d+/i, '').replace(/_+$/, '');
          zoneInfo = buildingName ? `${buildingName} Floor ${floor} Room ${room}` : `Floor ${floor} Room ${room}`;
        } else {
          // Just clean up underscores and capitalize
          zoneInfo = cleanZone.replace(/_/g, ' ').trim();
        }
        
        // Clean up measurement name
        let cleanMeasurement = measurement
          .replace(/_Electricity$/i, '')
          .replace(/_Gas$/i, '')
          .replace(/_/g, ' ')
          .trim();
        
        // Detect energy type
        let energyType = '';
        if (key.includes('Electricity')) {
          energyType = ' (Electricity)';
        } else if (key.includes('Gas')) {
          energyType = ' (Gas)';
        }
        
        // Capitalize first letter of each word
        const capitalize = (str: string) => str.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        return `${capitalize(zoneInfo)} - ${capitalize(cleanMeasurement)}${energyType}`;
      }
      
      // Fallback: just clean up underscores and capitalize
      return cleaned
        .replace(/_/g, ' ')
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    // Check for the specific structure with hourly_timeseries.series
    if (firstResult.hourly_timeseries?.series) {
      const seriesData = firstResult.hourly_timeseries.series;
      
      Object.keys(seriesData).forEach(key => {
        const data = seriesData[key];
        
        // Check if it's an array with hourly values (8760 or 8784 for leap year)
        if (Array.isArray(data) && (data.length === 8760 || data.length === 8784)) {
          const label = createCleanLabel(key);
          
          timeseries.push({
            name: key,
            data: data,
            label: label
          });
        }
      });
    }
    // Fallback: Check for other possible locations of hourly data
    else {
      const possibleKeys = [
        'hourly_data',
        'hourlyData', 
        'timeseries',
        'hourly',
        'annual_hourly',
        'annualHourly'
      ];
      
      let hourlyDataSource: any = null;
      
      for (const key of possibleKeys) {
        if (firstResult[key]) {
          hourlyDataSource = firstResult[key];
          break;
        }
      }
      
      if (hourlyDataSource && typeof hourlyDataSource === 'object') {
        // Iterate through all keys in the hourly data object
        Object.keys(hourlyDataSource).forEach(key => {
          const data = hourlyDataSource[key];
          
          // Check if it's an array with hourly values (8760 or 8784 for leap year)
          if (Array.isArray(data) && (data.length === 8760 || data.length === 8784)) {
            const label = createCleanLabel(key);
            
            timeseries.push({
              name: key,
              data: data,
              label: label
            });
          }
        });
      }
    }
    
    // Sort timeseries alphabetically by label for better organization
    timeseries.sort((a, b) => a.label.localeCompare(b.label));
    
    return timeseries;
  }, [resultsArray]);

  // Group timeseries by end use category
  const groupedTimeseries = useMemo(() => {
    const groups: Record<string, Array<{name: string, data: number[], label: string}>> = {};
    
    hourlyTimeseriesData.forEach(ts => {
      // Determine category from label or name
      let category = 'Other';
      
      if (ts.label.includes('Lights') || ts.name.includes('Lights')) {
        category = 'Lighting';
      } else if (ts.label.includes('Equipment') || ts.name.includes('Equipment')) {
        category = 'Equipment';
      } else if (ts.label.includes('Heating') || ts.name.includes('Heating') || ts.name.includes('Heat')) {
        category = 'Heating';
      } else if (ts.label.includes('Cooling') || ts.name.includes('Cooling') || ts.name.includes('Cool')) {
        category = 'Cooling';
      } else if (ts.label.includes('Water') || ts.name.includes('Water')) {
        category = 'Water Systems';
      } else if (ts.label.includes('Ventilation') || ts.name.includes('Ventilation') || ts.name.includes('Fan')) {
        category = 'Ventilation';
      } else if (ts.label.includes('Solar') || ts.name.includes('Solar')) {
        category = 'Solar';
      }
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(ts);
    });
    
    return groups;
  }, [hourlyTimeseriesData]);

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Lighting':
        return <Lightbulb size={18} />;
      case 'Equipment':
        return <Cpu size={18} />;
      case 'Heating':
        return <Thermometer size={18} />;
      case 'Cooling':
        return <Snowflake size={18} />;
      case 'Water Systems':
        return <Droplet size={18} />;
      case 'Ventilation':
        return <Wind size={18} />;
      case 'Solar':
        return <Sun size={18} />;
      default:
        return <Activity size={18} />;
    }
  };

  // Get color for category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Lighting':
        return '#FFA726'; // Orange
      case 'Equipment':
        return '#42A5F5'; // Blue
      case 'Heating':
        return '#EF5350'; // Red
      case 'Cooling':
        return '#66BB6A'; // Green
      case 'Water Systems':
        return '#26C6DA'; // Cyan
      case 'Ventilation':
        return '#AB47BC'; // Purple
      case 'Solar':
        return '#FFEE58'; // Yellow
      default:
        return '#78909C'; // Gray
    }
  };

  const getTimeseriesMeta = (name: string, label: string) => {
    const key = String(name || '').toLowerCase();
    const labelKey = String(label || '').toLowerCase();
    const combined = `${key} ${labelKey}`;

    const isEnergy = combined.includes('energy') || combined.includes('electric');
    const isJoules = key.includes('_j') || key.includes('energy_j') || combined.includes('[j]') || combined.includes(' joule');
    const unit = isEnergy
      ? 'kWh'
      : combined.includes('temperature')
        ? '°C'
        : combined.includes('power')
          ? 'W'
          : '';

    return {
      unit,
      conversionFactor: isEnergy && isJoules ? 1 / 3_600_000 : 1,
    };
  };

  // Create chart data for a specific timeseries
  const createTimeseriesChartData = (timeseriesData: number[], label: string, name: string) => {
    const meta = getTimeseriesMeta(name, label);

    const samplingRate = 24; // Show daily averages
    const sampledData: number[] = [];
    const sampledLabels: string[] = [];

    for (let i = 0; i < timeseriesData.length; i += samplingRate) {
      const slice = timeseriesData.slice(i, i + samplingRate);
      const average = slice.reduce((sum, val) => sum + val, 0) / slice.length;
      sampledData.push(average * meta.conversionFactor);
      sampledLabels.push(`Day ${Math.floor(i / 24) + 1}`);
    }

    return {
      chart: {
        labels: sampledLabels,
        datasets: [
          {
            label: `${label}${meta.unit ? ` (${meta.unit})` : ''}`,
            data: sampledData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
          }
        ],
      },
      unit: meta.unit,
      conversionFactor: meta.conversionFactor,
    };
  };

  const getTimeseriesChartOptions = (unit: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Day of Year'
        },
        ticks: {
          maxTicksLimit: 12,
          autoSkip: true
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: unit || 'Value'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Baseline Simulation Results
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {resultsArray.map((result, index) => {
          const totalEnergy = getNormalizedMetric(
            result,
            [
              'totalEnergyUse',
              'total_energy_use',
              'eui_total',
              'totalEnergy',
              'total_energy',
              'totalEnergyUsePerArea',
              'totalEnergyIntensity',
              'energyUsePerArea',
              'energy_use_intensity',
            ],
            [
              'totalEnergy_kwh',
              'total_energy_kwh',
              'totalEnergyUse_kwh',
              'energy',
              'energy_kwh',
              'annual_energy',
              'annual_kwh',
              'total',
            ]
          );
          const heatingIntensity = getNormalizedMetric(
            result,
            ['heatingDemand', 'heating_demand', 'heatingIntensity', 'heating_intensity', 'heating_per_m2'],
            ['heating', 'heating_kwh', 'totalHeating', 'total_heating']
          );
          const coolingIntensity = getNormalizedMetric(
            result,
            ['coolingDemand', 'cooling_demand', 'coolingIntensity', 'cooling_intensity', 'cooling_per_m2'],
            ['cooling', 'cooling_kwh', 'totalCooling', 'total_cooling']
          );
          const areaForBreakdownRaw = getResultArea(result);
          const areaForBreakdown = areaForBreakdownRaw > 0 ? areaForBreakdownRaw : 1;
          const energyUseEntries = result?.energy_use && typeof result.energy_use === 'object'
            ? Object.entries(result.energy_use)
            : [];
          const normalizedEnergyUse = energyUseEntries
            .map(([endUse, values]: [string, any]) => {
              const total = toOptionalNumber(values?.total) || 0;
              return {
                endUse,
                intensity: total / areaForBreakdown,
              };
            })
            .filter(item => item.intensity > 0)
            .sort((a, b) => b.intensity - a.intensity);
          const hasEnergyUse = normalizedEnergyUse.length > 0;
          const sumOfEndUses = hasEnergyUse
            ? normalizedEnergyUse.reduce((sum, item) => sum + item.intensity, 0)
            : 0;

          return (
            <Grid item xs={12} md={6} key={`result-card-${index}-${result.simulationId}`}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  {result.fileName || 'Simulation Result'}
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Zap size={16} /> Total Energy:
                    </Typography>
                    <Typography variant="h5">
                      {totalEnergy.toFixed(1)} kWh/m²
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Clock size={16} /> Simulation Runtime:
                    </Typography>
                    <Typography variant="h5">
                      {(Number(result.runTime ?? result.run_time ?? result.elapsedSeconds ?? 0)).toFixed(1)} seconds
                    </Typography>
                  </Grid>
                  
                  {hasEnergyUse ? (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                          End Use Breakdown:
                        </Typography>
                      </Grid>
                      {normalizedEnergyUse.map(({ endUse, intensity }) => {
                        const lower = endUse.toLowerCase();
                        let icon = <Activity size={14} />;
                        let color = 'text.primary';

                        if (lower.includes('heating')) {
                          icon = <Thermometer size={14} />;
                          color = 'error.main';
                        } else if (lower.includes('cooling')) {
                          icon = <Snowflake size={14} />;
                          color = 'info.main';
                        } else if (lower.includes('light')) {
                          icon = <Lightbulb size={14} />;
                          color = 'warning.main';
                        } else if (lower.includes('equipment') || lower.includes('plug')) {
                          icon = <Cpu size={14} />;
                          color = 'primary.main';
                        } else if (lower.includes('water') || lower.includes('pump')) {
                          icon = <Droplet size={14} />;
                          color = 'info.dark';
                        } else if (lower.includes('fan') || lower.includes('ventilation')) {
                          icon = <Wind size={14} />;
                          color = 'secondary.main';
                        }

                        return (
                          <Grid item xs={6} sm={4} key={endUse}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}
                            >
                              {icon} {endUse}:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                              {intensity.toFixed(1)} kWh/m²
                            </Typography>
                          </Grid>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Thermometer size={16} /> Heating:
                        </Typography>
                        <Typography variant="h6" color="error.main">
                          {heatingIntensity.toFixed(1)} kWh/m²
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Snowflake size={16} /> Cooling:
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {coolingIntensity.toFixed(1)} kWh/m²
                        </Typography>
                      </Grid>
                    </>
                  )}
                  
                  {/* Show sum verification */}
                  {hasEnergyUse && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Sum of End Uses:
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {sumOfEndUses.toFixed(1)} kWh/m²
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
                
                {result.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {result.error}
                  </Alert>
                )}
              </CardContent>
              <Divider />
              <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                <Button 
                  startIcon={<FileText size={18} />} 
                  size="small"
                  onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/download/`, '_blank')}
                >
                  View HTML Report
                </Button>
                <Button 
                  startIcon={<Download size={18} />} 
                  size="small" 
                  variant="outlined"
                  onClick={() => window.open(`http://localhost:8000/api/simulation/${result.simulationId}/results/`, '_blank')}
                >
                  Download Results
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Summary" />
          <Tab label="Energy Use" />
          <Tab label="Hourly Data" />
          <Tab label="Raw Data" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Simulation Summary
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>File</TableCell>
                      <TableCell align="right">Total Energy Use (kWh/m²)</TableCell>
                      <TableCell align="right">Heating (kWh/m²)</TableCell>
                      <TableCell align="right">Cooling (kWh/m²)</TableCell>
                      <TableCell align="right">Lighting (kWh/m²)</TableCell>
                      <TableCell align="right">Equipment (kWh/m²)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultsArray.map((result, idx) => {
                      const totalEnergyValue = getNormalizedMetric(
                        result,
                        [
                          'totalEnergyUse',
                          'total_energy_use',
                          'eui_total',
                          'totalEnergy',
                          'total_energy',
                          'totalEnergyUsePerArea',
                          'totalEnergyIntensity',
                          'energyUsePerArea',
                          'energy_use_intensity',
                        ],
                        [
                          'totalEnergy_kwh',
                          'total_energy_kwh',
                          'totalEnergyUse_kwh',
                          'energy',
                          'energy_kwh',
                          'annual_energy',
                          'annual_kwh',
                          'total',
                        ]
                      );
                      const heatingValue = getNormalizedMetric(
                        result,
                        ['heatingDemand', 'heating_demand', 'heatingIntensity', 'heating_intensity', 'heating_per_m2'],
                        ['heating', 'heating_kwh', 'totalHeating', 'total_heating']
                      );
                      const coolingValue = getNormalizedMetric(
                        result,
                        ['coolingDemand', 'cooling_demand', 'coolingIntensity', 'cooling_intensity', 'cooling_per_m2'],
                        ['cooling', 'cooling_kwh', 'totalCooling', 'total_cooling']
                      );
                      const lightingValue = getNormalizedMetric(
                        result,
                        ['lightingDemand', 'lighting_demand', 'lightingIntensity', 'lighting_intensity', 'lighting_per_m2'],
                        ['lighting', 'lighting_kwh', 'totalLighting', 'total_lighting', 'lights', 'lights_kwh']
                      );
                      const equipmentValue = getNormalizedMetric(
                        result,
                        ['equipmentDemand', 'equipment_demand', 'equipmentIntensity', 'equipment_intensity', 'equipment_per_m2'],
                        ['equipment', 'equipment_kwh', 'totalEquipment', 'total_equipment']
                      );

                      return (
                        <TableRow key={`summary-row-${idx}-${result.simulationId}`}>
                          <TableCell>{result.fileName || `Result ${idx+1}`}</TableCell>
                          <TableCell align="right">{totalEnergyValue.toFixed(1)}</TableCell>
                          <TableCell align="right">{heatingValue.toFixed(1)}</TableCell>
                          <TableCell align="right">{coolingValue.toFixed(1)}</TableCell>
                          <TableCell align="right">{lightingValue.toFixed(1)}</TableCell>
                          <TableCell align="right">{equipmentValue.toFixed(1)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Place charts side by side to save space */}
              <Grid container spacing={2} sx={{ mt: 4 }}>
                {resultsArray.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 350 }}>
                      <Bar data={energyBreakdownChartData} options={energyBreakdownChartOptions} />
                    </Box>
                  </Grid>
                )}

                {/* Only show the single IDF chart if only one result */}
                {resultsArray.length === 1 && chartData && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 350 }}>
                      <Bar data={chartData} options={chartOptions} />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          
          {tabValue === 1 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Energy Use Breakdown (Normalized per m²)
              </Typography>
              {resultsArray.length > 0 && resultsArray[0].energy_use ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>End Use</TableCell>
                        <TableCell align="right">Electricity (kWh/m²)</TableCell>
                        <TableCell align="right">District Heating (kWh/m²)</TableCell>
                        <TableCell align="right">Total (kWh/m²)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(resultsArray[0].energy_use).map(([endUse, values]: [string, any], idx) => (
                        <TableRow key={`energy-row-${idx}-${endUse}`}>
                          <TableCell>{endUse}</TableCell>
                          <TableCell align="right">{((values.electricity || 0) / floorArea).toFixed(1)}</TableCell>
                          <TableCell align="right">{((values.district_heating || 0) / floorArea).toFixed(1)}</TableCell>
                          <TableCell align="right">{((values.total || 0) / floorArea).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No detailed energy use data available.</Alert>
              )}
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Hourly Timeseries Data
              </Typography>
              
              {hourlyTimeseriesData.length > 0 ? (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Found {hourlyTimeseriesData.length} hourly timeseries dataset{hourlyTimeseriesData.length !== 1 ? 's' : ''} 
                    grouped into {Object.keys(groupedTimeseries).length} categor{Object.keys(groupedTimeseries).length !== 1 ? 'ies' : 'y'}. 
                    Each plot shows daily average values (8760 hourly values averaged to 365 daily values).
                  </Alert>
                  
                  {Object.entries(groupedTimeseries).map(([category, timeseriesList]) => (
                    <Accordion key={`category-${category}`} defaultExpanded={false} sx={{ mb: 2 }}>
                      <AccordionSummary
                        expandIcon={<ChevronDown size={20} />}
                        aria-controls={`category-${category}-content`}
                        id={`category-${category}-header`}
                        sx={{ 
                          bgcolor: `${getCategoryColor(category)}15`,
                          borderLeft: `4px solid ${getCategoryColor(category)}`,
                          '&:hover': {
                            bgcolor: `${getCategoryColor(category)}25`,
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Box sx={{ color: getCategoryColor(category), display: 'flex', alignItems: 'center' }}>
                            {getCategoryIcon(category)}
                          </Box>
                          <Typography variant="h6" sx={{ color: getCategoryColor(category), fontWeight: 600 }}>
                            {category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
                            {timeseriesList.length} dataset{timeseriesList.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 2 }}>
                      {timeseriesList.map((ts, idx) => {
                        const chartConfig = createTimeseriesChartData(ts.data, ts.label, ts.name);
                        const convertedValues = ts.data
                          .map((val: number) => Number(val) * chartConfig.conversionFactor)
                          .filter((val: number) => Number.isFinite(val));
                        const minVal = convertedValues.length ? Math.min(...convertedValues) : 0;
                        const maxVal = convertedValues.length ? Math.max(...convertedValues) : 0;
                        const avgVal = convertedValues.length
                          ? convertedValues.reduce((sum, val) => sum + val, 0) / convertedValues.length
                          : 0;
                        const unitSuffix = chartConfig.unit ? ` ${chartConfig.unit}` : '';
                        const csvHeader = chartConfig.unit ? `${ts.label} (${chartConfig.unit})` : ts.label;

                        return (
                          <Accordion key={`timeseries-${category}-${idx}-${ts.name}`} defaultExpanded={false} sx={{ mb: 1 }}>
                            <AccordionSummary
                              expandIcon={<ChevronDown size={20} />}
                              aria-controls={`panel-${category}-${idx}-content`}
                              id={`panel-${category}-${idx}-header`}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <Box sx={{ color: getCategoryColor(category), display: 'flex', alignItems: 'center' }}>
                                  {getCategoryIcon(category)}
                                </Box>
                                <Typography variant="subtitle2">
                                  {ts.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 2 }}>
                                  {ts.data.length} hourly values
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Box sx={{ height: 300 }}>
                                <Line 
                                  data={chartConfig.chart} 
                                  options={getTimeseriesChartOptions(chartConfig.unit)} 
                                />
                              </Box>
                              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  Min: {minVal.toFixed(2)}{unitSuffix} | 
                                  Max: {maxVal.toFixed(2)}{unitSuffix} | 
                                  Avg: {avgVal.toFixed(2)}{unitSuffix}
                                </Typography>
                                <Button 
                                  size="small" 
                                  startIcon={<Download size={16} />}
                                  onClick={() => {
                                    const csv = convertedValues.map((val, i) => `${i + 1},${val}`).join('\n');
                                    const blob = new Blob([`Hour,${csvHeader}\n${csv}`], { type: 'text/csv' });
                                    const a = document.createElement('a');
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `${ts.name}_hourly_data.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                >
                                  Download CSV
                                </Button>
                              </Box>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              ) : (
                <Alert severity="warning">
                  No hourly timeseries data found in simulation results. 
                  Hourly data may be stored in a different format or location.
                </Alert>
              )}
            </Box>
          )}
          
          {tabValue === 3 && (
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  Raw Simulation Data
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    select
                    size="small"
                    label="Lines per page"
                    value={linesPerPage}
                    onChange={handleLinesPerPageChange}
                    sx={{ minWidth: 150 }}
                  >
                    <MenuItem value={50}>50 lines</MenuItem>
                    <MenuItem value={100}>100 lines</MenuItem>
                    <MenuItem value={200}>200 lines</MenuItem>
                    <MenuItem value={500}>500 lines</MenuItem>
                    <MenuItem value={1000}>1000 lines</MenuItem>
                  </TextField>
                  {rawDataChunks.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Total lines: {rawDataChunks.length.toLocaleString()}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {isLoadingRawData ? (
                <Paper sx={{ p: 2, minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading raw data...
                    </Typography>
                  </Box>
                </Paper>
              ) : rawDataChunks.length > 0 ? (
                <>
                  <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto', bgcolor: '#f5f5f5' }}>
                    <Typography 
                      component="pre" 
                      sx={{ 
                        margin: 0, 
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {paginatedRawData}
                    </Typography>
                  </Paper>
                  
                  {totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Pagination 
                        count={totalPages} 
                        page={currentPage} 
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Showing lines {((currentPage - 1) * linesPerPage) + 1} to {Math.min(currentPage * linesPerPage, rawDataChunks.length)} of {rawDataChunks.length.toLocaleString()}
                  </Alert>
                </>
              ) : (
                <Paper sx={{ p: 2, minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography color="text.secondary">
                    No raw data available
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Download size={18} />}
          onClick={() => {
            // Create a Blob with the JSON data
            const blob = new Blob([JSON.stringify(resultsArray, null, 2)], { type: 'application/json' });
            // Create a link element and click it to download
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'simulation-results.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Results as JSON
        </Button>
      </Box>
    </Box>
  );
};

export default ResultsTab;
