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
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  Search, 
  Plus, 
  Edit, 
  Info, 
  X,
  Thermometer,
  Box as BoxIcon,
  Sun,
  Leaf,
  ArrowUpDown
} from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { Material, MaterialInsert } from '../../lib/database.types';

const roughnessOptions = [
  'VeryRough',
  'Rough',
  'MediumRough',
  'MediumSmooth',
  'Smooth',
  'VerySmooth'
];

const defaultMaterial: MaterialInsert = {
  name: '',
  roughness: 'MediumRough',
  thickness_m: 0,
  conductivity_w_mk: 0,
  density_kg_m3: 0,
  specific_heat_j_kgk: 0,
  thermal_absorptance: 0.9,
  solar_absorptance: 0.7,
  visible_absorptance: 0.7,
  gwp_kgco2e_per_m2: 0,
  cost_sek_per_m2: 0,
  wall_allowed: false,
  roof_allowed: false,
  floor_allowed: false,
  window_layer_allowed: false,
  author_id: '00000000-0000-0000-0000-000000000000',
  source: null
};

interface HeadCell {
  id: keyof Material;
  label: string;
  numeric: boolean;
  width?: string;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', numeric: false },
  { id: 'roughness', label: 'Roughness', numeric: false },
  { id: 'thickness_m', label: 'Thickness (m)', numeric: true },
  { id: 'conductivity_w_mk', label: 'Conductivity (W/m·K)', numeric: true },
  { id: 'density_kg_m3', label: 'Density (kg/m³)', numeric: true },
  { id: 'specific_heat_j_kgk', label: 'Specific Heat (J/kg·K)', numeric: true },
  { id: 'gwp_kgco2e_per_m2', label: 'GWP (kg CO₂e/m²)', numeric: true },
  { id: 'cost_sek_per_m2', label: 'Cost (SEK/m²)', numeric: true }
];

const MaterialsTab = () => {
  const { isAuthenticated } = useAuth();
  const { materials, addMaterial, updateMaterial, error: dbError } = useDatabase();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Material>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MaterialInsert>(defaultMaterial);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const handleRequestSort = (property: keyof Material) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleInputChange = (field: keyof MaterialInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      ...material,
      author_id: material.author_id || '00000000-0000-0000-0000-000000000000'
    });
    setOpenModal(true);
  };

  const handleViewDetails = (material: Material) => {
    setSelectedMaterial(material);
    setOpenDetailsDialog(true);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      if (!formData.name || !formData.thickness_m || !formData.conductivity_w_mk) {
        throw new Error('Please fill in all required fields');
      }

      if (!isAuthenticated) {
        throw new Error('You must be logged in to manage materials');
      }

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, formData);
      } else {
        await addMaterial(formData);
      }

      setOpenModal(false);
      setFormData(defaultMaterial);
      setEditingMaterial(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setFormData(defaultMaterial);
    setEditingMaterial(null);
    setFormError(null);
  };

  // Filter and sort materials
  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.roughness.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMaterials = filteredMaterials.sort((a, b) => {
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

  const paginatedMaterials = sortedMaterials.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate thermal properties
  const calculateThermalResistance = (thickness: number, conductivity: number) => {
    return thickness / conductivity;
  };

  const calculateHeatCapacity = (density: number, specificHeat: number, thickness: number) => {
    return density * specificHeat * thickness;
  };

  const getBenchmarkStatus = (value: number, type: 'gwp' | 'r-value' | 'heat-capacity' | 'solar') => {
    const benchmarks = {
      gwp: { low: 50, high: 100 },
      'r-value': { low: 0.2, high: 0.5 },
      'heat-capacity': { low: 75000, high: 150000 },
      solar: { low: 0.4, high: 0.7 }
    };

    const threshold = benchmarks[type];
    
    if (value <= threshold.low) return { color: 'success', label: 'Low Impact' };
    if (value >= threshold.high) return { color: 'error', label: 'High Impact' };
    return { color: 'warning', label: 'Moderate' };
  };

  const PropertyCard = ({ 
    icon, 
    title, 
    tooltip,
    children 
  }: { 
    icon: React.ReactNode, 
    title: string,
    tooltip: string,
    children: React.ReactNode 
  }) => (
    <Tooltip title={tooltip} placement="top">
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            {icon}
            <Typography variant="h6">{title}</Typography>
          </Box>
          {children}
        </CardContent>
      </Card>
    </Tooltip>
  );

  const MaterialProperty = ({ 
    label, 
    value, 
    unit, 
    tooltip 
  }: { 
    label: string, 
    value: string | number, 
    unit?: string,
    tooltip: string 
  }) => (
    <Tooltip title={tooltip} placement="top">
      <ListItem>
        <ListItemText 
          primary={label}
          secondary={unit ? `${value} ${unit}` : value}
          secondaryTypography={{ 
            sx: { 
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }
          }}
        />
      </ListItem>
    </Tooltip>
  );

  const AbsorptanceProperty = ({ 
    label, 
    value, 
    tooltip 
  }: { 
    label: string, 
    value: number,
    tooltip: string 
  }) => (
    <Tooltip title={tooltip} placement="top">
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={value * 100} 
            sx={{ 
              flexGrow: 1,
              height: 8,
              borderRadius: 4
            }}
          />
          <Typography variant="body2" sx={{ minWidth: 45 }}>
            {(value * 100).toFixed(1)}%
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Building Materials</Typography>
        <TextField
          placeholder="Search materials..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
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
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === headCell.id ? order : false}
                    sx={{ width: headCell.width }}
                  >
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(headCell.id)}
                    >
                      {headCell.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align="center">Applications</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMaterials.map((material) => (
                <TableRow
                  hover
                  key={material.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{material.name}</TableCell>
                  <TableCell>{material.roughness}</TableCell>
                  <TableCell align="right">{material.thickness_m.toFixed(4)}</TableCell>
                  <TableCell align="right">{material.conductivity_w_mk.toFixed(4)}</TableCell>
                  <TableCell align="right">{material.density_kg_m3.toFixed(1)}</TableCell>
                  <TableCell align="right">{material.specific_heat_j_kgk.toFixed(1)}</TableCell>
                  <TableCell align="right">{material.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="right">{material.cost_sek_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {material.wall_allowed && (
                        <Chip label="Wall" size="small" color="primary" variant="outlined" />
                      )}
                      {material.roof_allowed && (
                        <Chip label="Roof" size="small" color="secondary" variant="outlined" />
                      )}
                      {material.floor_allowed && (
                        <Chip label="Floor" size="small" color="success" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(material)}>
                        <Edit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Details">
                      <IconButton size="small" onClick={() => handleViewDetails(material)}>
                        <Info size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedMaterials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No materials found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredMaterials.length}
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

      {/* Material Details Dialog */}
      <Dialog
        open={openDetailsDialog}
        onClose={() => setOpenDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMaterial && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedMaterial.name}</Typography>
                <Chip 
                  label={selectedMaterial.roughness} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Physical Properties */}
                <Grid item xs={12} md={6}>
                  <PropertyCard 
                    icon={<BoxIcon size={24} />}
                    title="Physical Properties"
                    tooltip="Basic material characteristics that define its physical structure"
                  >
                    <List dense>
                      <MaterialProperty
                        label="Thickness"
                        value={selectedMaterial.thickness_m.toFixed(4)}
                        unit="m"
                        tooltip="The thickness of the material layer, used in calculating thermal resistance"
                      />
                      <MaterialProperty
                        label="Density"
                        value={selectedMaterial.density_kg_m3.toFixed(1)}
                        unit="kg/m³"
                        tooltip="Mass per unit volume of the material. Affects thermal mass and structural performance"
                      />
                      <MaterialProperty
                        label="Specific Heat"
                        value={selectedMaterial.specific_heat_j_kgk.toFixed(1)}
                        unit="J/kg·K"
                        tooltip="Amount of energy required to raise the temperature of 1 kg of the material by 1°C"
                      />
                    </List>
                  </PropertyCard>
                </Grid>

                {/* Thermal Properties */}
                <Grid item xs={12} md={6}>
                  <PropertyCard 
                    icon={<Thermometer size={24} />}
                    title="Thermal Properties"
                    tooltip="Properties that determine the material's heat transfer characteristics"
                  >
                    <List dense>
                      <MaterialProperty
                        label="Conductivity"
                        value={selectedMaterial.conductivity_w_mk.toFixed(4)}
                        unit="W/m·K"
                        tooltip="Rate at which heat passes through the material. Lower values mean better insulation"
                      />
                      {(() => {
                        const rValue = calculateThermalResistance(
                          selectedMaterial.thickness_m,
                          selectedMaterial.conductivity_w_mk
                        );
                        const status = getBenchmarkStatus(rValue, 'r-value');
                        return (
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>Thermal Resistance (R-value)</span>
                                  <Chip 
                                    label={status.label} 
                                    color={status.color as any} 
                                    size="small"
                                  />
                                </Box>
                              }
                              secondary={`${rValue.toFixed(4)} m²·K/W`}
                            />
                          </ListItem>
                        );
                      })()}
                      {(() => {
                        const heatCapacity = calculateHeatCapacity(
                          selectedMaterial.density_kg_m3,
                          selectedMaterial.specific_heat_j_kgk,
                          selectedMaterial.thickness_m
                        );
                        const status = getBenchmarkStatus(heatCapacity, 'heat-capacity');
                        return (
                          <ListItem>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>Heat Capacity</span>
                                  <Chip 
                                    label={status.label} 
                                    color={status.color as any} 
                                    size="small"
                                  />
                                </Box>
                              }
                              secondary={`${heatCapacity.toFixed(1)} J/m²·K`}
                            />
                          </ListItem>
                        );
                      })()}
                    </List>
                  </PropertyCard>
                </Grid>

                {/* Optical Properties */}
                <Grid item xs={12} md={6}>
                  <PropertyCard 
                    icon={<Sun size={24} />}
                    title="Optical Properties"
                    tooltip="Properties that determine how the material interacts with radiation"
                  >
                    <AbsorptanceProperty
                      label="Thermal Absorptance"
                      value={selectedMaterial.thermal_absorptance}
                      tooltip="Fraction of incident thermal radiation absorbed by the surface"
                    />
                    <AbsorptanceProperty
                      label="Solar Absorptance"
                      value={selectedMaterial.solar_absorptance}
                      tooltip="Fraction of solar energy absorbed by the surface"
                    />
                    <AbsorptanceProperty
                      label="Visible Absorptance"
                      value={selectedMaterial.visible_absorptance}
                      tooltip="Fraction of visible light absorbed by the surface"
                    />
                  </PropertyCard>
                </Grid>

                {/* Environmental & Economic Impact */}
                <Grid item xs={12} md={6}>
                  <PropertyCard 
                    icon={<Leaf size={24} />}
                    title="Impact & Applications"
                    tooltip="Environmental impact and economic considerations"
                  >
                    {(() => {
                      const gwpStatus = getBenchmarkStatus(selectedMaterial.gwp_kgco2e_per_m2, 'gwp');
                      return (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Global Warming Potential
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6">
                              {selectedMaterial.gwp_kgco2e_per_m2.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              kg CO₂e/m²
                            </Typography>
                            <Chip 
                              label={gwpStatus.label} 
                              color={gwpStatus.color as any} 
                              size="small"
                            />
                          </Box>
                        </Box>
                      );
                    })()}
                    
                    <Typography variant="body2" gutterBottom sx={{ mt: 2 }}>
                      Cost
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {selectedMaterial.cost_sek_per_m2.toFixed(2)} SEK/m²
                    </Typography>

                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" gutterBottom>
                      Allowed Applications
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip 
                        label="Wall" 
                        color={selectedMaterial.wall_allowed ? "primary" : "default"} 
                        variant={selectedMaterial.wall_allowed ? "filled" : "outlined"} 
                      />
                      <Chip 
                        label="Roof" 
                        color={selectedMaterial.roof_allowed ? "primary" : "default"} 
                        variant={selectedMaterial.roof_allowed ? "filled" : "outlined"} 
                      />
                      <Chip 
                        label="Floor" 
                        color={selectedMaterial.floor_allowed ? "primary" : "default"} 
                        variant={selectedMaterial.floor_allowed ? "filled" : "outlined"} 
                      />
                      <Chip 
                        label="Window" 
                        color={selectedMaterial.window_layer_allowed ? "primary" : "default"} 
                        variant={selectedMaterial.window_layer_allowed ? "filled" : "outlined"} 
                      />
                    </Stack>
                  </PropertyCard>
                </Grid>

                {/* Source Information */}
                {selectedMaterial.source && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Source Information
                        </Typography>
                        <Typography variant="body2">
                          {selectedMaterial.source}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleEdit(selectedMaterial)} color="primary">
                Edit Material
              </Button>
              <Button onClick={() => setOpenDetailsDialog(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add/Edit Material Dialog */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMaterial ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Material Name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Roughness</InputLabel>
                <Select
                  value={formData.roughness}
                  label="Roughness"
                  onChange={(e) => handleInputChange('roughness', e.target.value)}
                >
                  {roughnessOptions.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Thickness (m)"
                type="number"
                required
                inputProps={{ step: 0.0001, min: 0 }}
                value={formData.thickness_m}
                onChange={(e) => handleInputChange('thickness_m', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Conductivity (W/m·K)"
                type="number"
                required
                inputProps={{ step: 0.001, min: 0 }}
                value={formData.conductivity_w_mk}
                onChange={(e) => handleInputChange('conductivity_w_mk', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Density (kg/m³)"
                type="number"
                required
                inputProps={{ step: 1, min: 0 }}
                value={formData.density_kg_m3}
                onChange={(e) => handleInputChange('density_kg_m3', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Specific Heat (J/kg·K)"
                type="number"
                required
                inputProps={{ step: 1, min: 0 }}
                value={formData.specific_heat_j_kgk}
                onChange={(e) => handleInputChange('specific_heat_j_kgk', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GWP (kg CO₂e/m²)"
                type="number"
                required
                inputProps={{ step: 0.1, min: 0 }}
                value={formData.gwp_kgco2e_per_m2}
                onChange={(e) => handleInputChange('gwp_kgco2e_per_m2', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cost (SEK/m²)"
                type="number"
                required
                inputProps={{ step: 0.1, min: 0 }}
                value={formData.cost_sek_per_m2}
                onChange={(e) => handleInputChange('cost_sek_per_m2', Number(e.target.value))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Applications
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip 
                  label="Wall" 
                  color={formData.wall_allowed ? "primary" : "default"} 
                  variant={formData.wall_allowed ? "filled" : "outlined"} 
                  onClick={() => handleInputChange('wall_allowed', !formData.wall_allowed)}
                />
                <Chip 
                  label="Roof" 
                  color={formData.roof_allowed ? "primary" : "default"} 
                  variant={formData.roof_allowed ? "filled" : "outlined"} 
                  onClick={() => handleInputChange('roof_allowed', !formData.roof_allowed)}
                />
                <Chip 
                  label="Floor" 
                  color={formData.floor_allowed ? "primary" : "default"} 
                  variant={formData.floor_allowed ? "filled" : "outlined"} 
                  onClick={() => handleInputChange('floor_allowed', !formData.floor_allowed)}
                />
                <Chip 
                  label="Window" 
                  color={formData.window_layer_allowed ? "primary" : "default"} 
                  variant={formData.window_layer_allowed ? "filled" : "outlined"} 
                  onClick={() => handleInputChange('window_layer_allowed', !formData.window_layer_allowed)}
                />
              </Stack>
            </Grid>
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
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {editingMaterial ? 'Save Changes' : 'Add Material'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialsTab;