import { useState, useEffect } from 'react';
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Plus, Save, Trash2, Copy, Edit, HelpCircle, CalculatorIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import type { Scenario, Construction } from '../../lib/database.types';

const ScenarioPage = () => {
  const { user } = useAuth();
  const { constructions, scenarios, addScenario, updateScenario, deleteScenario, error: dbError } = useDatabase();
  const [selectedConstructions, setSelectedConstructions] = useState<{
    walls: string[];
    roofs: string[];
    floors: string[];
    windows: string[];
  }>({
    walls: [],
    roofs: [],
    floors: [],
    windows: []
  });
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const constructionsByType = {
    wall: constructions.filter(c => c.element_type === 'wall'),
    roof: constructions.filter(c => c.element_type === 'roof'),
    floor: constructions.filter(c => c.element_type === 'floor'),
    window: constructions.filter(c => c.element_type === 'window')
  };

  const calculateTotalSimulations = () => {
    const wallCount = selectedConstructions.walls.length || 1;
    const roofCount = selectedConstructions.roofs.length || 1;
    const floorCount = selectedConstructions.floors.length || 1;
    const windowCount = selectedConstructions.windows.length || 1;
    return wallCount * roofCount * floorCount * windowCount;
  };

  const handleSaveScenario = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.name) {
        throw new Error('Please provide a name for the scenario');
      }

      const constructionsArray = [
        ...selectedConstructions.walls.map(id => ({ constructionId: id, elementType: 'wall' })),
        ...selectedConstructions.roofs.map(id => ({ constructionId: id, elementType: 'roof' })),
        ...selectedConstructions.floors.map(id => ({ constructionId: id, elementType: 'floor' })),
        ...selectedConstructions.windows.map(id => ({ constructionId: id, elementType: 'window' }))
      ];

      if (editingScenario) {
        await updateScenario(editingScenario.id, {
          ...formData,
          total_simulations: calculateTotalSimulations(),
          author_id: user?.id
        }, constructionsArray);
      } else {
        await addScenario({
          ...formData,
          total_simulations: calculateTotalSimulations(),
          author_id: user?.id
        }, constructionsArray);
      }

      // Reset form
      setFormData({ name: '', description: '' });
      setSelectedConstructions({ walls: [], roofs: [], floors: [], windows: [] });
      setEditingScenario(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setFormData({
      name: scenario.name,
      description: scenario.description || ''
    });

    // Group constructions by type
    const constructionsByType = scenario.scenario_constructions?.reduce((acc, sc) => {
      const type = sc.element_type + 's' as keyof typeof selectedConstructions;
      acc[type] = [...(acc[type] || []), sc.construction_id];
      return acc;
    }, {} as Record<string, string[]>);

    setSelectedConstructions({
      walls: constructionsByType?.walls || [],
      roofs: constructionsByType?.roofs || [],
      floors: constructionsByType?.floors || [],
      windows: constructionsByType?.windows || []
    });
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteScenario(id);
      setConfirmDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = (scenario: Scenario) => {
    setFormData({
      name: `${scenario.name} (Copy)`,
      description: scenario.description || ''
    });

    // Copy constructions
    const constructionsByType = scenario.scenario_constructions?.reduce((acc, sc) => {
      const type = sc.element_type + 's' as keyof typeof selectedConstructions;
      acc[type] = [...(acc[type] || []), sc.construction_id];
      return acc;
    }, {} as Record<string, string[]>);

    setSelectedConstructions({
      walls: constructionsByType?.walls || [],
      roofs: constructionsByType?.roofs || [],
      floors: constructionsByType?.floors || [],
      windows: constructionsByType?.windows || []
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

      {(error || dbError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || dbError}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Form Section */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingScenario ? 'Edit Scenario' : 'New Scenario'}
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
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={1}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Wall Constructions</InputLabel>
                  <Select
                    multiple
                    value={selectedConstructions.walls}
                    onChange={(e) => setSelectedConstructions(prev => ({ 
                      ...prev, 
                      walls: e.target.value as string[] 
                    }))}
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
                        <Checkbox checked={selectedConstructions.walls.indexOf(construction.id) > -1} />
                        <ListItemText 
                          primary={construction.name} 
                          secondary={`U-value: ${construction.u_value_w_m2k.toFixed(3)} W/m²K`} 
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Add similar FormControl components for roof, floor, and window constructions */}
              {/* ... */}
              
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
                    Walls: {selectedConstructions.walls.length || 1} × 
                    Roofs: {selectedConstructions.roofs.length || 1} × 
                    Floors: {selectedConstructions.floors.length || 1} × 
                    Windows: {selectedConstructions.windows.length || 1}
                  </Typography>
                </Stack>
              </Box>
              <Button 
                variant="contained" 
                startIcon={<Save size={18} />}
                onClick={handleSaveScenario}
                disabled={loading || !formData.name}
              >
                {editingScenario ? 'Update Scenario' : 'Save Scenario'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Saved Scenarios Section */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Saved Scenarios
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {!scenarios || scenarios.length === 0 ? (
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
                      {scenario.description && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {scenario.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Combinations:</strong> {scenario.total_simulations} simulations
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {scenario.scenario_constructions && (
                            <>
                              <Chip 
                                label={`${scenario.scenario_constructions.filter(sc => sc.element_type === 'wall').length || 0} Walls`} 
                                size="small" 
                                color="primary"
                                variant="outlined"
                              />
                              <Chip 
                                label={`${scenario.scenario_constructions.filter(sc => sc.element_type === 'roof').length || 0} Roofs`} 
                                size="small" 
                                color="secondary"
                                variant="outlined"
                              />
                              <Chip 
                                label={`${scenario.scenario_constructions.filter(sc => sc.element_type === 'floor').length || 0} Floors`} 
                                size="small" 
                                color="success"
                                variant="outlined"
                              />
                              <Chip 
                                label={`${scenario.scenario_constructions.filter(sc => sc.element_type === 'window').length || 0} Windows`} 
                                size="small" 
                                color="info"
                                variant="outlined"
                              />
                            </>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(scenario)}>
                          <Edit size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => handleDuplicate(scenario)}>
                          <Copy size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => setConfirmDelete(scenario.id)}
                        >
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this scenario? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => confirmDelete && handleDelete(confirmDelete)}
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScenarioPage;