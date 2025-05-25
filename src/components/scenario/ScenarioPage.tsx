import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  Button,
  TextField,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import { Plus, Save, Trash2, Copy, Edit, HelpCircle, CalculatorIcon } from 'lucide-react';
import { mockConstructions } from '../../data/mockData';

type ScenarioType = {
  id: number;
  name: string;
  description: string;
  walls: number[];
  roofs: number[];
  floors: number[];
  windows: number[];
  totalSimulations: number;
  dateCreated: string;
};

const ScenarioPage = () => {
  const [scenarios, setScenarios] = useState<ScenarioType[]>([
    {
      id: 1,
      name: 'Retrofit Package A',
      description: 'Basic retrofit with focus on wall and window improvements',
      walls: [1, 3],
      roofs: [5],
      floors: [8],
      windows: [2, 4],
      totalSimulations: 4,
      dateCreated: '2025-05-01'
    },
    {
      id: 2,
      name: 'Deep Energy Retrofit',
      description: 'Comprehensive package with multiple options for all elements',
      walls: [1, 2, 3],
      roofs: [4, 5],
      floors: [7, 8],
      windows: [1, 2, 3, 4],
      totalSimulations: 48,
      dateCreated: '2025-05-02'
    }
  ]);
  
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    walls: [] as number[],
    roofs: [] as number[],
    floors: [] as number[],
    windows: [] as number[]
  });
  
  const constructionsByType = {
    wall: mockConstructions.filter(c => c.element_type === 'wall'),
    roof: mockConstructions.filter(c => c.element_type === 'roof'),
    floor: mockConstructions.filter(c => c.element_type === 'floor'),
    window: mockConstructions.filter(c => c.element_type === 'window')
  };

  const handleInputChange = (field: string, value: any) => {
    setNewScenario(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalSimulations = () => {
    const wallCount = newScenario.walls.length || 1;
    const roofCount = newScenario.roofs.length || 1;
    const floorCount = newScenario.floors.length || 1;
    const windowCount = newScenario.windows.length || 1;
    
    return wallCount * roofCount * floorCount * windowCount;
  };

  const handleSaveScenario = () => {
    const newId = scenarios.length > 0 ? Math.max(...scenarios.map(s => s.id)) + 1 : 1;
    
    const scenario = {
      id: newId,
      name: newScenario.name,
      description: newScenario.description,
      walls: newScenario.walls,
      roofs: newScenario.roofs,
      floors: newScenario.floors,
      windows: newScenario.windows,
      totalSimulations: calculateTotalSimulations(),
      dateCreated: new Date().toISOString().split('T')[0]
    };
    
    setScenarios([...scenarios, scenario]);
    
    // Reset form
    setNewScenario({
      name: '',
      description: '',
      walls: [],
      roofs: [],
      floors: [],
      windows: []
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Scenario Setup
      </Typography>
      <Typography variant="body1" paragraph>
        Create and manage simulation scenarios by selecting construction combinations.
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              New Scenario
              <Tooltip title="Select multiple construction options for each building element. The total number of simulations will be the product of all selections.">
                <IconButton size="small" sx={{ ml: 1, mb: 1 }}>
                  <HelpCircle size={16} />
                </IconButton>
              </Tooltip>
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Scenario Name"
                  value={newScenario.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Description"
                  value={newScenario.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  multiline
                  rows={1}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Wall Constructions</InputLabel>
                  <Select
                    multiple
                    value={newScenario.walls}
                    onChange={(e) => handleInputChange('walls', e.target.value)}
                    input={<OutlinedInput label="Wall Constructions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const construction = constructionsByType.wall.find(c => c.id === value);
                          return construction ? (
                            <Chip 
                              key={value} 
                              label={construction.name} 
                              size="small" 
                              color="primary"
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {constructionsByType.wall.map((construction) => (
                      <MenuItem key={construction.id} value={construction.id}>
                        <Checkbox checked={newScenario.walls.indexOf(construction.id) > -1} />
                        <ListItemText 
                          primary={construction.name} 
                          secondary={`U-value: ${construction.u_value_w_m2k.toFixed(3)} W/m²K`} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Roof Constructions</InputLabel>
                  <Select
                    multiple
                    value={newScenario.roofs}
                    onChange={(e) => handleInputChange('roofs', e.target.value)}
                    input={<OutlinedInput label="Roof Constructions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const construction = constructionsByType.roof.find(c => c.id === value);
                          return construction ? (
                            <Chip 
                              key={value} 
                              label={construction.name} 
                              size="small" 
                              color="secondary"
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {constructionsByType.roof.map((construction) => (
                      <MenuItem key={construction.id} value={construction.id}>
                        <Checkbox checked={newScenario.roofs.indexOf(construction.id) > -1} />
                        <ListItemText 
                          primary={construction.name} 
                          secondary={`U-value: ${construction.u_value_w_m2k.toFixed(3)} W/m²K`} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Floor Constructions</InputLabel>
                  <Select
                    multiple
                    value={newScenario.floors}
                    onChange={(e) => handleInputChange('floors', e.target.value)}
                    input={<OutlinedInput label="Floor Constructions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const construction = constructionsByType.floor.find(c => c.id === value);
                          return construction ? (
                            <Chip 
                              key={value} 
                              label={construction.name} 
                              size="small" 
                              color="success"
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {constructionsByType.floor.map((construction) => (
                      <MenuItem key={construction.id} value={construction.id}>
                        <Checkbox checked={newScenario.floors.indexOf(construction.id) > -1} />
                        <ListItemText 
                          primary={construction.name} 
                          secondary={`U-value: ${construction.u_value_w_m2k.toFixed(3)} W/m²K`} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Window Constructions</InputLabel>
                  <Select
                    multiple
                    value={newScenario.windows}
                    onChange={(e) => handleInputChange('windows', e.target.value)}
                    input={<OutlinedInput label="Window Constructions" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const construction = constructionsByType.window.find(c => c.id === value);
                          return construction ? (
                            <Chip 
                              key={value} 
                              label={construction.name} 
                              size="small" 
                              color="info"
                            />
                          ) : null;
                        })}
                      </Box>
                    )}
                  >
                    {constructionsByType.window.map((construction) => (
                      <MenuItem key={construction.id} value={construction.id}>
                        <Checkbox checked={newScenario.windows.indexOf(construction.id) > -1} />
                        <ListItemText 
                          primary={construction.name} 
                          secondary={`U-value: ${construction.u_value_w_m2k.toFixed(3)} W/m²K`} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Box sx={{ 
              mt: 3, 
              p: 2, 
              backgroundColor: 'rgba(25, 118, 210, 0.08)', 
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalculatorIcon size={24} style={{ marginRight: '12px', color: '#1976d2' }} />
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">
                    Total Number of Simulations: <strong>{calculateTotalSimulations()}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Walls: {newScenario.walls.length || 1} × Roofs: {newScenario.roofs.length || 1} × 
                    Floors: {newScenario.floors.length || 1} × Windows: {newScenario.windows.length || 1}
                  </Typography>
                </Stack>
              </Box>
              <Button 
                variant="contained" 
                startIcon={<Save size={18} />}
                onClick={handleSaveScenario}
                disabled={!newScenario.name}
              >
                Save Scenario
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Saved Scenarios
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {scenarios.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                No scenarios saved yet. Create your first scenario using the form.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {scenarios.map(scenario => (
                  <Card key={scenario.id} variant="outlined">
                    <CardContent>
                      <Typography variant="h6" component="div">
                        {scenario.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {scenario.description}
                      </Typography>
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Combinations:</strong> {scenario.totalSimulations} simulations
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          <Chip 
                            label={`${scenario.walls.length} Walls`} 
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                          <Chip 
                            label={`${scenario.roofs.length} Roofs`} 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                          />
                          <Chip 
                            label={`${scenario.floors.length} Floors`} 
                            size="small" 
                            color="success"
                            variant="outlined"
                          />
                          <Chip 
                            label={`${scenario.windows.length} Windows`} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <IconButton size="small">
                          <Edit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small">
                          <Copy size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error">
                          <Trash2 size={18} />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ScenarioPage;