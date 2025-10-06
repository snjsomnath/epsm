import React, { useState, useMemo, useCallback, useRef } from 'react';
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
  Alert,
  Stack,
  Chip,
  Grid,
  IconButton,
  Collapse,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { FileDown, ChevronDown, ChevronUp, ArrowLeftRight, Camera } from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useTheme, alpha } from '@mui/material/styles';

// Using Recharts for scatter plots for scalability with many simulations.

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  if (!hex) return null;
  const sanitized = hex.replace('#', '');
  if (sanitized.length !== 3 && sanitized.length !== 6) return null;
  const expanded = sanitized.length === 3
    ? sanitized.split('').map((char) => char + char).join('')
    : sanitized;
  const parsed = Number.parseInt(expanded, 16);
  if (Number.isNaN(parsed)) return null;
  return {
    r: (parsed >> 16) & 0xff,
    g: (parsed >> 8) & 0xff,
    b: parsed & 0xff,
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const componentToHex = (component: number) => {
    const clamped = Math.round(Math.min(255, Math.max(0, component)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

const interpolateHex = (start: string, end: string, ratio: number) => {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  if (!startRgb || !endRgb) return start || end;
  const clampedRatio = clamp(ratio);
  const r = startRgb.r + (endRgb.r - startRgb.r) * clampedRatio;
  const g = startRgb.g + (endRgb.g - startRgb.g) * clampedRatio;
  const b = startRgb.b + (endRgb.b - startRgb.b) * clampedRatio;
  return rgbToHex(r, g, b);
};

interface SimulationResultsViewProps {
  results: any[];
}

type MetricKey = 'totalEnergy' | 'heating' | 'cooling' | 'gwp' | 'cost' | 'runtime';

const SimulationResultsView = ({ results }: SimulationResultsViewProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [openCS, setOpenCS] = useState<Record<string, boolean>>({});
  const [openResult, setOpenResult] = useState<Record<string, boolean>>({});
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [xAxis, setXAxis] = useState<MetricKey>('gwp');
  const [yAxis, setYAxis] = useState<MetricKey>('heating');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const metricConfig: Record<MetricKey, { label: string; unit: string; getValue: (r: any) => number; getMin: () => number; getMax: () => number }> = {
    totalEnergy: {
      label: 'Total Energy',
      unit: 'kWh/m²',
      getValue: (r) => r.totalEnergyPerArea,
      getMin: () => minTotalEnergy,
      getMax: () => maxTotalEnergy
    },
    heating: {
      label: 'Heating',
      unit: 'kWh/m²',
      getValue: (r) => r.heatingPerArea,
      getMin: () => minHeating,
      getMax: () => maxHeating
    },
    cooling: {
      label: 'Cooling',
      unit: 'kWh/m²',
      getValue: (r) => r.coolingPerArea,
      getMin: () => minCooling,
      getMax: () => maxCooling
    },
    gwp: {
      label: 'GWP',
      unit: 'kg CO₂e',
      getValue: (r) => r.gwpTotal,
      getMin: () => minGwp,
      getMax: () => maxGwp
    },
    cost: {
      label: 'Cost',
      unit: 'SEK',
      getValue: (r) => r.costTotal,
      getMin: () => minCost,
      getMax: () => maxCost
    },
    runtime: {
      label: 'Runtime',
      unit: 'seconds',
      getValue: (r) => r.runTime,
      getMin: () => minRuntime,
      getMax: () => maxRuntime
    }
  };

  const handleXAxisChange = (event: SelectChangeEvent<MetricKey>) => {
    const newValue = event.target.value as MetricKey;
    setXAxis(newValue);
    // If Y axis is the same, swap them
    if (newValue === yAxis) {
      setYAxis(xAxis);
    }
  };

  const handleYAxisChange = (event: SelectChangeEvent<MetricKey>) => {
    const newValue = event.target.value as MetricKey;
    setYAxis(newValue);
    // If X axis is the same, swap them
    if (newValue === xAxis) {
      setXAxis(yAxis);
    }
  };

  const handleSwapAxes = () => {
    setXAxis(yAxis);
    setYAxis(xAxis);
  };

  const handleSaveScreenshot = async () => {
    if (!chartRef.current) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: theme.palette.background.paper,
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `chart-${xAxis}-vs-${yAxis}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Failed to save screenshot:', error);
      // Fallback: just alert the user
      alert('Screenshot feature requires html2canvas library. Please install it: npm install html2canvas');
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Normalize incoming results to support both snake_case and camelCase
  const normalizedResults = useMemo(() => (results || []).map((r: any) => {
    const raw = r.raw_json || {};
    const fileName = r.fileName || r.file_name || raw.fileName || raw.file_name || r.originalFileName || r.file || 'Unknown';
    const totalEnergyUse = Number(
      r.totalEnergyUse ?? r.total_energy_use ?? raw.totalEnergyUse ?? raw.total_energy_use ?? r.total_energy_use
    ) || 0;
    const heatingDemand = Number(
      r.heatingDemand ?? r.heating_demand ?? raw.heatingDemand ?? raw.heating_demand
    ) || 0;
    const coolingDemand = Number(
      r.coolingDemand ?? r.cooling_demand ?? raw.coolingDemand ?? raw.cooling_demand
    ) || 0;
    const runTime = Number(r.runTime ?? r.run_time ?? raw.runTime ?? raw.run_time ?? r.run_time) || 0;
    const totalArea = Number(r.totalArea ?? r.total_area ?? raw.totalArea ?? raw.total_area ?? r.total_area) || 0;
    const constructionSet = r.construction_set ?? r.constructionSet ?? raw.construction_set ?? raw.constructionSet ?? null;
    const gwpTotal = Number(r.gwp_total ?? r.gwpTotal ?? r.gwp ?? raw.gwp_total ?? raw.gwpTotal ?? raw.gwp) || 0;
    const costTotal = Number(r.cost_total ?? r.costTotal ?? r.cost ?? raw.cost_total ?? raw.costTotal ?? raw.cost) || 0;
    return {
      ...r,
      fileName,
      totalEnergyUse,
      heatingDemand,
      coolingDemand,
      runTime,
      totalArea,
      constructionSet,
      gwpTotal,
      costTotal
    };
  }), [results]);

  // Replace the "per-area" block with the corrected logic
  const resultsWithPerArea = useMemo(() => normalizedResults.map((r: any) => {
    const area = Number(r.totalArea) || 0;
    const totalEnergyIntensity = Number(r.totalEnergyUse) || 0; // kWh/m²
    const heatingIntensity      = Number(r.heatingDemand) || 0;  // kWh/m²
    const coolingIntensity      = Number(r.coolingDemand) || 0;  // kWh/m²

    return {
      ...r,
      // keep names that the rest of the component expects:
      totalEnergyPerArea: totalEnergyIntensity,
      heatingPerArea: heatingIntensity,
      coolingPerArea: coolingIntensity,

      // optional whole-building totals (kWh):
      totalEnergy_kWh: area ? totalEnergyIntensity * area : undefined,
      heating_kWh:     area ? heatingIntensity * area     : undefined,
      cooling_kWh:     area ? coolingIntensity * area     : undefined,
    };
  }), [normalizedResults]);

  // Calculate min and max values for each metric for dynamic color scaling
  const minHeating = Math.min(...resultsWithPerArea.map(r => r.heatingPerArea));
  const maxHeating = Math.max(...resultsWithPerArea.map(r => r.heatingPerArea));
  const minCooling = Math.min(...resultsWithPerArea.map(r => r.coolingPerArea));
  const maxCooling = Math.max(...resultsWithPerArea.map(r => r.coolingPerArea));
  const minTotalEnergy = Math.min(...resultsWithPerArea.map(r => r.totalEnergyPerArea));
  const maxTotalEnergy = Math.max(...resultsWithPerArea.map(r => r.totalEnergyPerArea));
  const minRuntime = Math.min(...resultsWithPerArea.map(r => r.runTime));
  const maxRuntime = Math.max(...resultsWithPerArea.map(r => r.runTime));
  const minGwp = Math.min(...resultsWithPerArea.map(r => r.gwpTotal));
  const maxGwp = Math.max(...resultsWithPerArea.map(r => r.gwpTotal));
  const minCost = Math.min(...resultsWithPerArea.map(r => r.costTotal));
  const maxCost = Math.max(...resultsWithPerArea.map(r => r.costTotal));

  const baseLowColor = theme.palette.success.main;
  const baseMidColor = theme.palette.warning.main;
  const baseHighColor = theme.palette.error.main;
  const fallbackColor = theme.palette.info.main;

  const getBaseColor = useCallback((value: number, min: number, max: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max === min) {
      return fallbackColor;
    }
    const normalized = clamp((value - min) / (max - min));
    if (!Number.isFinite(normalized)) {
      return fallbackColor;
    }
    if (normalized <= 0.5) {
      const segmentRatio = normalized / 0.5;
      return interpolateHex(baseLowColor, baseMidColor, segmentRatio);
    }
    const segmentRatio = (normalized - 0.5) / 0.5;
    return interpolateHex(baseMidColor, baseHighColor, segmentRatio);
  }, [baseLowColor, baseMidColor, baseHighColor, fallbackColor]);

  const getColorFromValue = useCallback((value: number, min: number, max: number, opacity = 0.24) => {
    return alpha(getBaseColor(value, min, max), opacity);
  }, [getBaseColor]);

  const getColorFromHeating = useCallback((heating: number, minHeating: number, maxHeating: number) => {
    return getColorFromValue(heating, minHeating, maxHeating, 0.65);
  }, [getColorFromValue]);

  // Format data for chart (use normalized results)
  // Scatter plot data: x and y based on selected metrics
  // Sort results based on current sort column and direction
  const sortedResults = useMemo(() => {
    if (!sortColumn) return resultsWithPerArea;
    
    const sorted = [...resultsWithPerArea].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortColumn) {
        case 'fileName':
          aVal = a.fileName || '';
          bVal = b.fileName || '';
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        case 'totalEnergy':
          aVal = a.totalEnergyPerArea || 0;
          bVal = b.totalEnergyPerArea || 0;
          break;
        case 'heating':
          aVal = a.heatingPerArea || 0;
          bVal = b.heatingPerArea || 0;
          break;
        case 'cooling':
          aVal = a.coolingPerArea || 0;
          bVal = b.coolingPerArea || 0;
          break;
        case 'gwp':
          aVal = a.gwpTotal || 0;
          bVal = b.gwpTotal || 0;
          break;
        case 'cost':
          aVal = a.costTotal || 0;
          bVal = b.costTotal || 0;
          break;
        case 'runtime':
          aVal = a.runTime || 0;
          bVal = b.runTime || 0;
          break;
        default:
          return 0;
      }
      
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sorted;
  }, [resultsWithPerArea, sortColumn, sortDirection]);

  // Precompute colors for scatterData based on heating energy
  // Adjust color scaling logic for heating energy to fit the dataset range
  const scatterData = useMemo(() => {
    const xConfig = metricConfig[xAxis];
    const yConfig = metricConfig[yAxis];
    
    return resultsWithPerArea.map((r: any, i: number) => {
      const color = getColorFromHeating(r.heatingPerArea, minHeating, maxHeating);
      return {
        x: Number(xConfig.getValue(r)) || 0,
        y: Number(yConfig.getValue(r)) || 0,
        fileName: r.fileName,
        heating: r.heatingPerArea,
        cooling: r.coolingPerArea,
        index: i,
        color
      };
    });
  }, [getColorFromHeating, resultsWithPerArea, minHeating, maxHeating, xAxis, yAxis, metricConfig]);

  const fmt = (v: any, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
    return Number(v).toFixed(digits);
  };

  const fmtWithComma = (v: any, digits = 1) => {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };

  return (
    <Box>
      <Paper sx={{ mt: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Summary" />
          <Tab label="Details" />
          <Tab label="Raw Data" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Simulation Results Summary
              </Typography>
              {!resultsWithPerArea || resultsWithPerArea.length === 0 ? (
                <Alert severity="info">No simulation results to display.</Alert>
              ) : (
                <>
                  {/* Chart Controls */}
                  <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>X-Axis</InputLabel>
                      <Select
                        value={xAxis}
                        label="X-Axis"
                        onChange={handleXAxisChange}
                      >
                        {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
                          <MenuItem 
                            key={key} 
                            value={key}
                            disabled={key === yAxis}
                          >
                            {metricConfig[key].label} ({metricConfig[key].unit})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                      <InputLabel>Y-Axis</InputLabel>
                      <Select
                        value={yAxis}
                        label="Y-Axis"
                        onChange={handleYAxisChange}
                      >
                        {(Object.keys(metricConfig) as MetricKey[]).map((key) => (
                          <MenuItem 
                            key={key} 
                            value={key}
                            disabled={key === xAxis}
                          >
                            {metricConfig[key].label} ({metricConfig[key].unit})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Tooltip title="Swap X and Y axes">
                      <IconButton 
                        onClick={handleSwapAxes}
                        size="small"
                        sx={{ 
                          border: 1, 
                          borderColor: 'divider',
                          '&:hover': { 
                            backgroundColor: 'action.hover' 
                          }
                        }}
                      >
                        <ArrowLeftRight size={20} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Save chart as image">
                      <IconButton 
                        onClick={handleSaveScreenshot}
                        size="small"
                        sx={{ 
                          border: 1, 
                          borderColor: 'divider',
                          '&:hover': { 
                            backgroundColor: 'action.hover' 
                          }
                        }}
                      >
                        <Camera size={20} />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Chart */}
                  <Box ref={chartRef} sx={{ height: '400px', mb: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          name={metricConfig[xAxis].label}
                          tick={{ fontSize: 11 }}
                          label={{ 
                            value: `${metricConfig[xAxis].label} (${metricConfig[xAxis].unit})`, 
                            position: 'insideBottom', 
                            offset: -10,
                            style: { fontSize: 12 }
                          }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="y" 
                          name={metricConfig[yAxis].label}
                          tick={{ fontSize: 11 }}
                          label={{ 
                            value: `${metricConfig[yAxis].label} (${metricConfig[yAxis].unit})`, 
                            angle: -90, 
                            position: 'insideLeft',
                            offset: 10,
                            style: { fontSize: 12, textAnchor: 'middle' }
                          }}
                        />
                        <RechartsTooltip 
                          formatter={(value: any, name: any) => [value, name]}
                          labelFormatter={(label: any) => `Value: ${label}`} 
                        />
                        {scatterData.map((point, index) => (
                          <Scatter key={index} data={[point]} fill={point.color} />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </>
              )}

              {/* Quick debug summary so users can see data present without opening Raw Data */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Found <strong>{resultsWithPerArea.length}</strong> result(s). First file: <strong>{resultsWithPerArea[0]?.fileName ?? '—'}</strong>
                </Typography>
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        onClick={() => handleSort('fileName')}
                        sx={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          File
                          {sortColumn === 'fileName' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('totalEnergy')}
                        onMouseEnter={() => setHoveredColumn('totalEnergy')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              Total Energy
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              kWh/m²
                            </Typography>
                          </Box>
                          {sortColumn === 'totalEnergy' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('heating')}
                        onMouseEnter={() => setHoveredColumn('heating')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              Heating
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              kWh/m²
                            </Typography>
                          </Box>
                          {sortColumn === 'heating' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('cooling')}
                        onMouseEnter={() => setHoveredColumn('cooling')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              Cooling
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              kWh/m²
                            </Typography>
                          </Box>
                          {sortColumn === 'cooling' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('gwp')}
                        onMouseEnter={() => setHoveredColumn('gwp')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              GWP
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              kg CO₂e
                            </Typography>
                          </Box>
                          {sortColumn === 'gwp' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('cost')}
                        onMouseEnter={() => setHoveredColumn('cost')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              Cost
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              SEK
                            </Typography>
                          </Box>
                          {sortColumn === 'cost' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell 
                        align="right"
                        onClick={() => handleSort('runtime')}
                        onMouseEnter={() => setHoveredColumn('runtime')}
                        onMouseLeave={() => setHoveredColumn(null)}
                        sx={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                              Runtime
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              seconds
                            </Typography>
                          </Box>
                          {sortColumn === 'runtime' && (
                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.fileName}</TableCell>
                        <TableCell 
                          align="right"
                          onMouseEnter={() => setHoveredColumn('totalEnergy')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'totalEnergy' 
                              ? getColorFromValue(result.totalEnergyPerArea, minTotalEnergy, maxTotalEnergy)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmt(result.totalEnergyPerArea)}
                        </TableCell>
                        <TableCell
                          align="right"
                          onMouseEnter={() => setHoveredColumn('heating')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'heating'
                              ? getColorFromValue(result.heatingPerArea, minHeating, maxHeating)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmt(result.heatingPerArea)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          onMouseEnter={() => setHoveredColumn('cooling')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'cooling'
                              ? getColorFromValue(result.coolingPerArea, minCooling, maxCooling)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmt(result.coolingPerArea)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          onMouseEnter={() => setHoveredColumn('gwp')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'gwp'
                              ? getColorFromValue(result.gwpTotal, minGwp, maxGwp)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmtWithComma(result.gwpTotal, 0)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          onMouseEnter={() => setHoveredColumn('cost')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'cost'
                              ? getColorFromValue(result.costTotal, minCost, maxCost)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmtWithComma(result.costTotal, 0)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          onMouseEnter={() => setHoveredColumn('runtime')}
                          onMouseLeave={() => setHoveredColumn(null)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: hoveredColumn === 'runtime'
                              ? getColorFromValue(result.runTime, minRuntime, maxRuntime)
                              : 'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {fmt(result.runTime)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Detailed Results
              </Typography>
              <Stack spacing={2}>
                {resultsWithPerArea.map((result, index) => {
                  // Build a key that will be unique even when simulation_id is duplicated
                  const baseId = result.simulation_id ?? result.run_id ?? result.id ?? 'res';
                  const variantPart = result.variant_idx ?? result.variantIdx ?? 0;
                  const resKey = `${baseId}-${variantPart}-${index}`;
                  const expanded = !!openResult?.[resKey];
                  return (
                    <Paper key={resKey} variant="outlined" sx={{ p: 0, mb: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, height: 48, minHeight: 48 }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Tooltip title={result.fileName} enterDelay={0} leaveDelay={50}>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem', cursor: 'default' }}>
                              {result.fileName} {result.variant_idx !== undefined ? `(variant ${result.variant_idx})` : ''}
                            </Typography>
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {fmt(result.totalEnergyPerArea)} kWh/m² • {fmt(result.runTime)}s
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => setOpenResult(prev => ({ ...prev, [resKey]: !prev[resKey] }))} sx={{ p: 0.25 }}>
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </IconButton>
                        </Box>
                      </Box>

                      <Collapse in={expanded} timeout="auto">
                        <Box sx={{ p: 2 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Building: {result.building || '-'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Area: {fmt(result.totalArea)} m²
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                GWP: {fmtWithComma(result.gwpTotal, 0)} kg CO₂e
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Cost: {fmtWithComma(result.costTotal, 0)} SEK
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary" component="div">
                                <span>Status: </span>
                                {result.status === 'error'
                                  ? <Chip size="small" label="error" color="error" />
                                  : <Chip size="small" label={result.status} color="success" />
                                }
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Runtime: {fmt(result.runTime)} seconds
                              </Typography>
                            </Grid>
                          </Grid>

                          {/* Construction set (roof / floor / window) */}
                          {result.constructionSet ? (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2">Construction Set</Typography>
                              <Grid container spacing={1} sx={{ mt: 1 }}>
                                {['roof', 'floor', 'window'].map((k) => {
                                  const cs = result.constructionSet[k];
                                  if (!cs) return null;
                                  const key = `${index}-${k}`;
                                  const isOpenCS = !!openCS[key];
                                  return (
                                    <Grid item xs={12} sm={4} key={`${index}-cs-${k}`}>
                                      <Paper variant="outlined" sx={{ p: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <Box sx={{ minWidth: 0 }}>
                                            <Tooltip title={cs.name} enterDelay={0} leaveDelay={50}>
                                              <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', cursor: 'default' }}>{k.toUpperCase()}</Typography>
                                            </Tooltip>
                                            <Tooltip title={cs.name} enterDelay={0} leaveDelay={50}>
                                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', cursor: 'default' }}>{cs.name}</Typography>
                                            </Tooltip>
                                          </Box>
                                          <Box>
                                            <Tooltip title={isOpenCS ? 'Collapse' : 'Expand'} enterDelay={0} leaveDelay={50}>
                                              <IconButton size="small" onClick={() => setOpenCS(prev => ({ ...prev, [key]: !prev[key] }))}>
                                                {isOpenCS ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </Box>
                                        <Collapse in={isOpenCS} timeout="auto">
                                          <Box sx={{ mt: 1 }}>
                                            {Array.isArray(cs.layers) && cs.layers.length > 0 ? (
                                              cs.layers.map((layer: string, li: number) => (
                                                <Typography key={li} variant="caption" display="block">- {layer}</Typography>
                                              ))
                                            ) : (
                                              <Typography variant="caption" color="text.secondary">No layers</Typography>
                                            )}
                                          </Box>
                                        </Collapse>
                                      </Paper>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No construction set available.</Typography>
                          )}

                          {/* Add optional totals in the Details panel */}
                          {result.totalEnergy_kWh !== undefined && (
                            <Typography variant="body2" color="text.secondary">
                              Whole-building Energy: {fmt(result.totalEnergy_kWh)} kWh
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Raw Data
              </Typography>
              <Paper sx={{ p: 2, maxHeight: '500px', overflow: 'auto' }}>
                <pre>{JSON.stringify(resultsWithPerArea, null, 2)}</pre>
              </Paper>
            </Box>
          )}
        </Box>
      </Paper>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<FileDown />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(resultsWithPerArea, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'simulation-results.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Results
        </Button>
      </Box>
    </Box>
  );
};

export default SimulationResultsView;
