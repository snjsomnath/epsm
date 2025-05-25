import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TextField,
  Button,
  Alert,
  Slider,
  InputAdornment,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { Save, RefreshCw, HelpCircle } from 'lucide-react';

interface InfiltrationTabProps {
  uploadedFiles: File[];
  simulationComplete: boolean;
}

interface ZoneInfiltration {
  id: number;
  fileName: string;
  zoneName: string;
  designFlowRate: number;
  flowPerZoneArea: number;
  flowPerExteriorArea: number;
  airChangesPerHour: number;
}

const InfiltrationTab = ({ uploadedFiles, simulationComplete }: InfiltrationTabProps) => {
  const [infiltrations, setInfiltrations] = useState<ZoneInfiltration[]>([
    {
      id: 1,
      fileName: 'office.idf',
      zoneName: 'ZONE_1_OFFICE',
      designFlowRate: 0.0,
      flowPerZoneArea: 0.0,
      flowPerExteriorArea: 0.0,
      airChangesPerHour: 0.6
    },
    {
      id: 2,
      fileName: 'office.idf',
      zoneName: 'ZONE_2_MEETING',
      designFlowRate: 0.0,
      flowPerZoneArea: 0.0,
      flowPerExteriorArea: 0.0,
      airChangesPerHour: 0.7
    },
    {
      id: 3,
      fileName: 'residential.idf',
      zoneName: 'APARTMENT_ZONE',
      designFlowRate: 0.0,
      flowPerZoneArea: 0.0,
      flowPerExteriorArea: 0.0,
      airChangesPerHour: 0.5
    }
  ]);

  const handleInfiltrationChange = (id: number, field: keyof ZoneInfiltration, value: number) => {
    setInfiltrations(prevState => 
      prevState.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleResetDefaults = () => {
    setInfiltrations(prevState => 
      prevState.map(item => ({
        ...item,
        designFlowRate: 0.0,
        flowPerZoneArea: 0.0,
        flowPerExteriorArea: 0.0,
        airChangesPerHour: 0.6
      }))
    );
  };

  if (uploadedFiles.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Please upload IDF files to view infiltration settings.
      </Alert>
    );
  }

  if (!simulationComplete) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        Run the baseline simulation to configure infiltration rates.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Infiltration Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adjust the infiltration rates for each zone before running simulations.
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<RefreshCw size={18} />}
          onClick={handleResetDefaults}
        >
          Reset to Defaults
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Quick Settings
          <Tooltip title="Choose one infiltration method: either Air Changes per Hour (ACH) or flow per exterior surface area">
            <IconButton size="small" sx={{ ml: 1, mb: 1 }}>
              <HelpCircle size={16} />
            </IconButton>
          </Tooltip>
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" gutterBottom>
              Air Changes per Hour (ACH) - All Zones
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={0.6}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                sx={{ flexGrow: 1 }}
              />
              <TextField
                value={0.6}
                type="number"
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">ACH</InputAdornment>,
                }}
                sx={{ width: '120px' }}
              />
              <Button variant="contained" size="small">Apply</Button>
            </Box>
          </Box>
          
          <Box>
            <Typography variant="body2" gutterBottom>
              Flow per Exterior Surface Area - All Zones
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                value={0}
                min={0}
                max={0.01}
                step={0.0001}
                valueLabelDisplay="auto"
                sx={{ flexGrow: 1 }}
              />
              <TextField
                value={0}
                type="number"
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end">m³/s·m²</InputAdornment>,
                }}
                sx={{ width: '120px' }}
              />
              <Button variant="contained" size="small">Apply</Button>
            </Box>
          </Box>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Zone</TableCell>
              <TableCell align="right">Design Flow Rate (m³/s)</TableCell>
              <TableCell align="right">Flow per Zone Area (m³/s·m²)</TableCell>
              <TableCell align="right">Flow per Exterior Area (m³/s·m²)</TableCell>
              <TableCell align="right">Air Changes per Hour</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {infiltrations.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.fileName}</TableCell>
                <TableCell>{row.zoneName}</TableCell>
                <TableCell align="right">
                  <TextField
                    value={row.designFlowRate}
                    onChange={(e) => handleInfiltrationChange(row.id, 'designFlowRate', Number(e.target.value))}
                    type="number"
                    size="small"
                    inputProps={{ step: 0.01, min: 0 }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={row.flowPerZoneArea}
                    onChange={(e) => handleInfiltrationChange(row.id, 'flowPerZoneArea', Number(e.target.value))}
                    type="number"
                    size="small"
                    inputProps={{ step: 0.0001, min: 0 }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={row.flowPerExteriorArea}
                    onChange={(e) => handleInfiltrationChange(row.id, 'flowPerExteriorArea', Number(e.target.value))}
                    type="number"
                    size="small"
                    inputProps={{ step: 0.0001, min: 0 }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <TextField
                    value={row.airChangesPerHour}
                    onChange={(e) => handleInfiltrationChange(row.id, 'airChangesPerHour', Number(e.target.value))}
                    type="number"
                    size="small"
                    inputProps={{ step: 0.1, min: 0 }}
                    sx={{ width: '100px' }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Save size={18} />}
        >
          Save Infiltration Settings
        </Button>
      </Box>
    </Box>
  );
};

export default InfiltrationTab;