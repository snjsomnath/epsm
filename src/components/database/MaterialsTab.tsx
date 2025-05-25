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
  Chip,
  Alert,
  Stack,
  Tooltip
} from '@mui/material';
import { Search, Plus, Edit, Info, X } from 'lucide-react';
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
  author_id: null,
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
  const { user } = useAuth();
  const { materials, addMaterial, error: dbError } = useDatabase();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Material>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MaterialInsert>(defaultMaterial);

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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      // Validate required fields
      if (!formData.name || !formData.thickness_m || !formData.conductivity_w_mk) {
        throw new Error('Please fill in all required fields');
      }

      if (!user?.id) {
        throw new Error('You must be logged in to add materials');
      }

      // Add author_id from current user
      const materialWithAuthor = {
        ...formData,
        author_id: user.id
      };

      await addMaterial(materialWithAuthor);
      setOpenModal(false);
      setFormData(defaultMaterial);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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

      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add New Material
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
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            Add Material
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialsTab;