import { useState } from 'react';
import { 
  Box, 
  Paper, 
  TableContainer, 
  Table, 
  TableHead, 
  TableBody, 
  TableRow, 
  TableCell, 
  TablePagination, 
  TableSortLabel,
  Fab, 
  TextField, 
  InputAdornment,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Stack,
  Tooltip,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { Search, Plus, Edit, Info, X, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { Construction, ConstructionInsert, Material, WindowGlazing, LayerInsert } from '../../lib/database.types';

interface Layer {
  id: string;
  type: 'material' | 'glazing';
  itemId: string;
  name: string;
  thickness: number;
  conductivity: number;
  gwp: number;
  cost: number;
}

const defaultConstruction: ConstructionInsert = {
  name: '',
  element_type: 'wall',
  is_window: false,
  u_value_w_m2k: 0,
  gwp_kgco2e_per_m2: 0,
  cost_sek_per_m2: 0,
  author_id: '00000000-0000-0000-0000-000000000000',
  source: null
};

const ConstructionsTab = () => {
  const { isAuthenticated } = useAuth();
  const { constructions, materials, windowGlazing, addConstruction, error: dbError } = useDatabase();
  const [openModal, setOpenModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ConstructionInsert>(defaultConstruction);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [componentSearchTerm, setComponentSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Construction>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const handleInputChange = (field: keyof ConstructionInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Update is_window when element_type changes
      ...(field === 'element_type' && { is_window: value === 'window' })
    }));
  };

  const calculateUValue = (layers: Layer[]): number => {
    if (layers.length === 0) return 0;
    
    // Calculate thermal resistance (R = thickness / conductivity)
    const totalR = layers.reduce((sum, layer) => {
      return sum + (layer.thickness / layer.conductivity);
    }, 0);

    // U-value is 1/R
    return totalR > 0 ? 1 / totalR : 0;
  };

  const calculateTotalGWP = (layers: Layer[]): number => {
    return layers.reduce((sum, layer) => sum + layer.gwp, 0);
  };

  const calculateTotalCost = (layers: Layer[]): number => {
    return layers.reduce((sum, layer) => sum + layer.cost, 0);
  };

  const handleAddLayer = (type: 'material' | 'glazing', item: Material | WindowGlazing) => {
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      type,
      itemId: item.id,
      name: item.name,
      thickness: item.thickness_m,
      conductivity: item.conductivity_w_mk,
      gwp: item.gwp_kgco2e_per_m2,
      cost: item.cost_sek_per_m2
    };
    
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);

    // Update construction values
    setFormData(prev => ({
      ...prev,
      u_value_w_m2k: calculateUValue(updatedLayers),
      gwp_kgco2e_per_m2: calculateTotalGWP(updatedLayers),
      cost_sek_per_m2: calculateTotalCost(updatedLayers)
    }));
  };

  const handleRemoveLayer = (layerId: string) => {
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(updatedLayers);

    // Update construction values
    setFormData(prev => ({
      ...prev,
      u_value_w_m2k: calculateUValue(updatedLayers),
      gwp_kgco2e_per_m2: calculateTotalGWP(updatedLayers),
      cost_sek_per_m2: calculateTotalCost(updatedLayers)
    }));
  };

  const handleMoveLayer = (index: number, direction: 'up' | 'down') => {
    const newLayers = [...layers];
    if (direction === 'up' && index > 0) {
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
    } else if (direction === 'down' && index < layers.length - 1) {
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    }
    setLayers(newLayers);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      if (!formData.name || !formData.element_type) {
        throw new Error('Please fill in all required fields');
      }

      if (layers.length === 0) {
        throw new Error('Please add at least one layer');
      }

      if (!isAuthenticated) {
        throw new Error('You must be logged in to add constructions');
      }

      // Convert layers to LayerInsert format
      const layerInserts: Omit<LayerInsert, 'construction_id'>[] = layers.map((layer, index) => ({
        material_id: layer.type === 'material' ? layer.itemId : null,
        glazing_id: layer.type === 'glazing' ? layer.itemId : null,
        layer_order: index + 1,
        is_glazing_layer: layer.type === 'glazing'
      }));

      await addConstruction(formData, layerInserts);
      setOpenModal(false);
      setFormData(defaultConstruction);
      setLayers([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter available components based on search
  const filteredMaterials = materials
    .filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(componentSearchTerm.toLowerCase());
      const matchesType = {
        wall: material.wall_allowed,
        roof: material.roof_allowed,
        floor: material.floor_allowed,
        window: material.window_layer_allowed
      }[formData.element_type];
      return matchesSearch && matchesType;
    });

  const filteredGlazing = windowGlazing
    .filter(glazing => 
      glazing.name.toLowerCase().includes(componentSearchTerm.toLowerCase())
    );

  // Table handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property: keyof Construction) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Filter and sort constructions
  const filteredConstructions = constructions.filter(construction => 
    construction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    construction.element_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConstructions = [...filteredConstructions].sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    return order === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const paginatedConstructions = sortedConstructions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Constructions</Typography>
        <TextField
          placeholder="Search constructions..."
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

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }} size="medium">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'element_type'}
                    direction={orderBy === 'element_type' ? order : 'asc'}
                    onClick={() => handleRequestSort('element_type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'u_value_w_m2k'}
                    direction={orderBy === 'u_value_w_m2k' ? order : 'asc'}
                    onClick={() => handleRequestSort('u_value_w_m2k')}
                  >
                    U-Value (W/m²K)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Layers</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'gwp_kgco2e_per_m2'}
                    direction={orderBy === 'gwp_kgco2e_per_m2' ? order : 'asc'}
                    onClick={() => handleRequestSort('gwp_kgco2e_per_m2')}
                  >
                    GWP (kg CO₂e/m²)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'cost_sek_per_m2'}
                    direction={orderBy === 'cost_sek_per_m2' ? order : 'asc'}
                    onClick={() => handleRequestSort('cost_sek_per_m2')}
                  >
                    Cost (SEK/m²)
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedConstructions.map((construction) => (
                <TableRow
                  hover
                  key={construction.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{construction.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={construction.element_type} 
                      color={
                        construction.element_type === 'wall' ? 'primary' :
                        construction.element_type === 'roof' ? 'secondary' :
                        construction.element_type === 'floor' ? 'success' :
                        construction.element_type === 'window' ? 'info' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{construction.u_value_w_m2k.toFixed(3)}</TableCell>
                  <TableCell align="right">{construction.layers?.length || 0}</TableCell>
                  <TableCell align="right">{construction.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="right">{construction.cost_sek_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <Edit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Details">
                      <IconButton size="small">
                        <Info size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredConstructions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Fab 
        color="primary" 
        aria-label="add" 
        onClick={() => setOpenModal(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Plus />
      </Fab>

      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Add New Construction
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Info */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label="Construction Name"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    <FormControl fullWidth required>
                      <InputLabel>Element Type</InputLabel>
                      <Select
                        value={formData.element_type}
                        label="Element Type"
                        onChange={(e) => handleInputChange('element_type', e.target.value)}
                      >
                        <MenuItem value="wall">Wall</MenuItem>
                        <MenuItem value="roof">Roof</MenuItem>
                        <MenuItem value="floor">Floor</MenuItem>
                        <MenuItem value="window">Window</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="U-Value (W/m²K)"
                      type="number"
                      required
                      inputProps={{ step: 0.001, min: 0 }}
                      value={formData.u_value_w_m2k}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="GWP (kg CO₂e/m²)"
                      type="number"
                      required
                      inputProps={{ step: 0.1, min: 0 }}
                      value={formData.gwp_kgco2e_per_m2}
                      disabled
                    />
                    <TextField
                      fullWidth
                      label="Cost (SEK/m²)"
                      type="number"
                      required
                      inputProps={{ step: 0.1, min: 0 }}
                      value={formData.cost_sek_per_m2}
                      disabled
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Layer Selection */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Components
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Click to add components to the construction layers
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search components..."
                    value={componentSearchTerm}
                    onChange={(e) => setComponentSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} />
                        </InputAdornment>
                      ),
                      endAdornment: componentSearchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setComponentSearchTerm('')}>
                            <X size={14} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />

                  <Divider sx={{ my: 2 }} />
                  
                  {formData.is_window ? (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Window Glazing</Typography>
                      {filteredGlazing.map((glazing) => (
                        <Chip
                          key={glazing.id}
                          label={glazing.name}
                          onClick={() => handleAddLayer('glazing', glazing)}
                          color="primary"
                          variant="outlined"
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Materials</Typography>
                      {filteredMaterials.map((material) => (
                        <Chip
                          key={material.id}
                          label={material.name}
                          onClick={() => handleAddLayer('material', material)}
                          color="primary"
                          variant="outlined"
                          sx={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Layer Order */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Construction Layers
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Arrange layers from outside to inside
                  </Typography>

                  <List>
                    {layers.map((layer, index) => (
                      <ListItem key={layer.id}>
                        <ListItemText
                          primary={layer.name}
                          secondary={`Thickness: ${layer.thickness.toFixed(4)} m`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleMoveLayer(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp size={18} />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleMoveLayer(index, 'down')}
                            disabled={index === layers.length - 1}
                          >
                            <ArrowDown size={18} />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveLayer(layer.id)}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                    {layers.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        No layers added yet
                      </Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Source Field */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Source"
                multiline
                rows={2}
                value={formData.source || ''}
                onChange={(e) => handleInputChange('source', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            Add Construction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConstructionsTab;