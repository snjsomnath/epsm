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
  Chip
} from '@mui/material';
import { Search, Plus, Edit, Info, X } from 'lucide-react';
import { mockMaterials } from '../../data/mockData';

type Material = {
  id: number;
  name: string;
  roughness: string;
  thickness_m: number;
  conductivity_w_mk: number;
  density_kg_m3: number;
  specific_heat_j_kgk: number;
  thermal_absorptance: number;
  solar_absorptance: number;
  visible_absorptance: number;
  gwp_kgco2e_per_m2: number;
  cost_sek_per_m2: number;
  wall_allowed: boolean;
  roof_allowed: boolean;
  floor_allowed: boolean;
  window_layer_allowed: boolean;
  author: string;
  date_created: string;
  date_modified: string;
  source: string;
};

interface HeadCell {
  id: keyof Material;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  width?: string;
}

const headCells: HeadCell[] = [
  { id: 'id', label: 'ID', numeric: true, disablePadding: false, width: '50px' },
  { id: 'name', label: 'Name', numeric: false, disablePadding: false },
  { id: 'roughness', label: 'Roughness', numeric: false, disablePadding: false },
  { id: 'thickness_m', label: 'Thickness (m)', numeric: true, disablePadding: false },
  { id: 'conductivity_w_mk', label: 'Conductivity (W/m·K)', numeric: true, disablePadding: false },
  { id: 'density_kg_m3', label: 'Density (kg/m³)', numeric: true, disablePadding: false },
  { id: 'gwp_kgco2e_per_m2', label: 'GWP (kg CO₂e/m²)', numeric: true, disablePadding: false },
  { id: 'cost_sek_per_m2', label: 'Cost (SEK/m²)', numeric: true, disablePadding: false },
  { id: 'author', label: 'Author', numeric: false, disablePadding: false },
];

const roughnessOptions = [
  'VeryRough',
  'Rough',
  'MediumRough',
  'MediumSmooth',
  'Smooth',
  'VerySmooth'
];

const MaterialsTab = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof Material>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [materials] = useState<Material[]>(mockMaterials);
  
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

  const openEditModal = (material: Material) => {
    setSelectedMaterial(material);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedMaterial(null);
  };

  const handleAddNew = () => {
    setSelectedMaterial(null);
    setOpenModal(true);
  };

  // Filter and sort materials
  const filteredMaterials = materials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.roughness.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMaterials = filteredMaterials.sort((a, b) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return order === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (aValue === null) return order === 'asc' ? -1 : 1;
    if (bValue === null) return order === 'asc' ? 1 : -1;
    
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

      <Paper sx={{ width: '100%', mb: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 750 }} size="medium">
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.disablePadding ? 'none' : 'normal'}
                    sortDirection={orderBy === headCell.id ? order : false}
                    style={{ width: headCell.width }}
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
                  <TableCell align="right">{material.id}</TableCell>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>{material.roughness}</TableCell>
                  <TableCell align="right">{material.thickness_m.toFixed(4)}</TableCell>
                  <TableCell align="right">{material.conductivity_w_mk.toFixed(4)}</TableCell>
                  <TableCell align="right">{material.density_kg_m3.toFixed(1)}</TableCell>
                  <TableCell align="right">{material.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="right">{material.cost_sek_per_m2.toFixed(2)}</TableCell>
                  <TableCell>{material.author}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => openEditModal(material)}>
                      <Edit size={18} />
                    </IconButton>
                    <IconButton size="small">
                      <Info size={18} />
                    </IconButton>
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
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleAddNew}
      >
        <Plus />
      </Fab>

      {/* Material Form Modal */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedMaterial ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Material Name"
                  variant="outlined"
                  value={selectedMaterial?.name || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="roughness-label">Roughness</InputLabel>
                  <Select
                    labelId="roughness-label"
                    value={selectedMaterial?.roughness || ''}
                    label="Roughness"
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
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 0.001 }}
                  value={selectedMaterial?.thickness_m || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Conductivity (W/m·K)"
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={selectedMaterial?.conductivity_w_mk || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Density (kg/m³)"
                  variant="outlined"
                  type="number"
                  value={selectedMaterial?.density_kg_m3 || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Specific Heat (J/kg·K)"
                  variant="outlined"
                  type="number"
                  value={selectedMaterial?.specific_heat_j_kgk || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GWP (kg CO₂e/m²)"
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={selectedMaterial?.gwp_kgco2e_per_m2 || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cost (SEK/m²)"
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={selectedMaterial?.cost_sek_per_m2 || ''}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Application
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip 
                    label="Wall" 
                    color={selectedMaterial?.wall_allowed ? "primary" : "default"} 
                    variant={selectedMaterial?.wall_allowed ? "filled" : "outlined"} 
                  />
                  <Chip 
                    label="Roof" 
                    color={selectedMaterial?.roof_allowed ? "primary" : "default"} 
                    variant={selectedMaterial?.roof_allowed ? "filled" : "outlined"} 
                  />
                  <Chip 
                    label="Floor" 
                    color={selectedMaterial?.floor_allowed ? "primary" : "default"} 
                    variant={selectedMaterial?.floor_allowed ? "filled" : "outlined"} 
                  />
                  <Chip 
                    label="Window" 
                    color={selectedMaterial?.window_layer_allowed ? "primary" : "default"} 
                    variant={selectedMaterial?.window_layer_allowed ? "filled" : "outlined"} 
                  />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Source"
                  variant="outlined"
                  multiline
                  rows={2}
                  value={selectedMaterial?.source || ''}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button variant="contained" color="primary">
            {selectedMaterial ? 'Save Changes' : 'Add Material'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaterialsTab;