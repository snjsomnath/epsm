import { useState } from 'react';
import { 
  Box, 
  Grid,
  Card, 
  CardContent, 
  CardActions,
  Typography, 
  TextField, 
  InputAdornment,
  IconButton,
  Button,
  Fab,
  Chip,
  Avatar,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { Search, Plus, Edit, Trash2, X, Copy } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { ConstructionSetInsert } from '../../lib/database.types';

const defaultConstructionSet: ConstructionSetInsert = {
  name: '',
  description: '',
  wall_construction_id: null,
  roof_construction_id: null,
  floor_construction_id: null,
  window_construction_id: null,
  author_id: null
};

const ConstructionSetsTab = () => {
  const { isAuthenticated, user } = useAuth();
  const { constructions, constructionSets, addConstructionSet, updateConstructionSet, deleteConstructionSet, error: dbError } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ConstructionSetInsert>(defaultConstructionSet);
  const [editingSet, setEditingSet] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleInputChange = (field: keyof ConstructionSetInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (set: typeof constructionSets[0]) => {
    setEditingSet(set.id);
    setFormData({
      name: set.name,
      description: set.description,
      wall_construction_id: set.wall_construction_id,
      roof_construction_id: set.roof_construction_id,
      floor_construction_id: set.floor_construction_id,
      window_construction_id: set.window_construction_id,
      author_id: set.author_id
    });
    setOpenDialog(true);
  };

  const handleCopy = (set: typeof constructionSets[0]) => {
    setFormData({
      name: `${set.name} (Copy)`,
      description: set.description,
      wall_construction_id: set.wall_construction_id,
      roof_construction_id: set.roof_construction_id,
      floor_construction_id: set.floor_construction_id,
      window_construction_id: set.window_construction_id,
      author_id: user?.id || null
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConstructionSet(id);
      setConfirmDelete(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete construction set');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      if (!formData.name) {
        throw new Error('Please provide a name for the construction set');
      }

      if (!isAuthenticated || !user) {
        throw new Error('You must be logged in to manage construction sets');
      }

      if (editingSet) {
        await updateConstructionSet(editingSet, {
          ...formData,
          author_id: user.id
        });
      } else {
        await addConstructionSet({
          ...formData,
          author_id: user.id
        });
      }

      setOpenDialog(false);
      setFormData(defaultConstructionSet);
      setEditingSet(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(defaultConstructionSet);
    setEditingSet(null);
    setFormError(null);
  };

  // Filter construction sets
  const filteredSets = constructionSets.filter(set => 
    set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter constructions by type
  const wallConstructions = constructions.filter(c => c.element_type === 'wall');
  const roofConstructions = constructions.filter(c => c.element_type === 'roof');
  const floorConstructions = constructions.filter(c => c.element_type === 'floor');
  const windowConstructions = constructions.filter(c => c.element_type === 'window');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Construction Sets</Typography>
        <TextField
          placeholder="Search construction sets..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: '300px' }}
        />
      </Box>

      {dbError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dbError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {filteredSets.map((set) => (
          <Grid item xs={12} sm={6} md={4} key={set.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
              }
            }} className="card-hover">
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {set.name}
                  </Typography>
                  <Chip 
                    size="small" 
                    label={`ID: ${set.id}`} 
                    variant="outlined" 
                  />
                </Box>
                
                {set.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {set.description}
                  </Typography>
                )}
                
                <Divider sx={{ my: 1.5 }} />
                
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" color="primary">
                      Wall Construction
                    </Typography>
                    {set.wall_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.wall_construction.name}</span>
                        <span>U: {set.wall_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="secondary">
                      Roof Construction
                    </Typography>
                    {set.roof_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.roof_construction.name}</span>
                        <span>U: {set.roof_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="success.main">
                      Floor Construction
                    </Typography>
                    {set.floor_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.floor_construction.name}</span>
                        <span>U: {set.floor_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="info.main">
                      Window Construction
                    </Typography>
                    {set.window_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.window_construction.name}</span>
                        <span>U: {set.window_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
              
              <Box sx={{ mt: 'auto', p: 1.5, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {user?.email?.charAt(0).toUpperCase() || '?'}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email || 'Unknown Author'}
                  </Typography>
                </Box>
                
                <CardActions sx={{ p: 0 }}>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleEdit(set)}
                  >
                    <Edit size={18} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleCopy(set)}
                  >
                    <Copy size={18} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => setConfirmDelete(set.id)}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </CardActions>
              </Box>
            </Card>
          </Grid>
        ))}
        
        {filteredSets.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No construction sets found
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<Plus size={16} />}
                sx={{ mt: 2 }}
                onClick={() => setOpenDialog(true)}
              >
                Create New Set
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      <Fab 
        color="primary" 
        aria-label="add" 
        onClick={() => setOpenDialog(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Plus />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSet ? 'Edit Construction Set' : 'Add New Construction Set'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Set Name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Wall Construction</InputLabel>
                <Select
                  value={formData.wall_construction_id || ''}
                  label="Wall Construction"
                  onChange={(e) => handleInputChange('wall_construction_id', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {wallConstructions.map((construction) => (
                    <MenuItem key={construction.id} value={construction.id}>
                      {construction.name} (U: {construction.u_value_w_m2k.toFixed(3)} W/m²K)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Roof Construction</InputLabel>
                <Select
                  value={formData.roof_construction_id || ''}
                  label="Roof Construction"
                  onChange={(e) => handleInputChange('roof_construction_id', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {roofConstructions.map((construction) => (
                    <MenuItem key={construction.id} value={construction.id}>
                      {construction.name} (U: {construction.u_value_w_m2k.toFixed(3)} W/m²K)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Floor Construction</InputLabel>
                <Select
                  value={formData.floor_construction_id || ''}
                  label="Floor Construction"
                  onChange={(e) => handleInputChange('floor_construction_id', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {floorConstructions.map((construction) => (
                    <MenuItem key={construction.id} value={construction.id}>
                      {construction.name} (U: {construction.u_value_w_m2k.toFixed(3)} W/m²K)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Window Construction</InputLabel>
                <Select
                  value={formData.window_construction_id || ''}
                  label="Window Construction"
                  onChange={(e) => handleInputChange('window_construction_id', e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {windowConstructions.map((construction) => (
                    <MenuItem key={construction.id} value={construction.id}>
                      {construction.name} (U: {construction.u_value_w_m2k.toFixed(3)} W/m²K)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {editingSet ? 'Save Changes' : 'Add Construction Set'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this construction set? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => confirmDelete && handleDelete(confirmDelete)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConstructionSetsTab;