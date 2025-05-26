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
  Grid,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Search, 
  Plus, 
  Edit, 
  Info, 
  X,
  Sun,
  Thermometer,
  Leaf,
  ArrowUpDown
} from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { WindowGlazing, WindowGlazingInsert } from '../../lib/database.types';

const defaultGlazing: WindowGlazingInsert = {
  name: '',
  thickness_m: 0,
  conductivity_w_mk: 0.9,
  solar_transmittance: null,
  visible_transmittance: null,
  infrared_transmittance: 0.0,
  front_ir_emissivity: 0.84,
  back_ir_emissivity: 0.84,
  gwp_kgco2e_per_m2: 0,
  cost_sek_per_m2: 0,
  author_id: '00000000-0000-0000-0000-000000000000',
  source: null
};

interface HeadCell {
  id: keyof WindowGlazing;
  label: string;
  numeric: boolean;
  width?: string;
}

const headCells: HeadCell[] = [
  { id: 'name', label: 'Name', numeric: false },
  { id: 'thickness_m', label: 'Thickness (m)', numeric: true },
  { id: 'conductivity_w_mk', label: 'Conductivity (W/m·K)', numeric: true },
  { id: 'solar_transmittance', label: 'Solar Trans.', numeric: true },
  { id: 'visible_transmittance', label: 'Visible Trans.', numeric: true },
  { id: 'gwp_kgco2e_per_m2', label: 'GWP (kg CO₂e/m²)', numeric: true },
  { id: 'cost_sek_per_m2', label: 'Cost (SEK/m²)', numeric: true }
];

const WindowGlazingTab = () => {
  const { isAuthenticated } = useAuth();
  const { windowGlazing, addWindowGlazing, updateWindowGlazing, error: dbError } = useDatabase();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof WindowGlazing>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<WindowGlazingInsert>(defaultGlazing);
  const [selectedGlazing, setSelectedGlazing] = useState<WindowGlazing | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingGlazing, setEditingGlazing] = useState<WindowGlazing | null>(null);

  const handleRequestSort = (property: keyof WindowGlazing) => {
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

  const handleInputChange = (field: keyof WindowGlazingInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewDetails = (glazing: WindowGlazing) => {
    setSelectedGlazing(glazing);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (glazing: WindowGlazing) => {
    setEditingGlazing(glazing);
    setFormData({
      name: glazing.name,
      thickness_m: glazing.thickness_m,
      conductivity_w_mk: glazing.conductivity_w_mk,
      solar_transmittance: glazing.solar_transmittance,
      visible_transmittance: glazing.visible_transmittance,
      infrared_transmittance: glazing.infrared_transmittance,
      front_ir_emissivity: glazing.front_ir_emissivity,
      back_ir_emissivity: glazing.back_ir_emissivity,
      gwp_kgco2e_per_m2: glazing.gwp_kgco2e_per_m2,
      cost_sek_per_m2: glazing.cost_sek_per_m2,
      author_id: glazing.author_id || '00000000-0000-0000-0000-000000000000',
      source: glazing.source
    });
    setDetailsDialogOpen(false); // Close details dialog before opening edit dialog
    setTimeout(() => setOpenModal(true), 100); // Slight delay to ensure smooth transition
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      if (!formData.name || !formData.thickness_m || !formData.conductivity_w_mk) {
        throw new Error('Please fill in all required fields');
      }

      if (!isAuthenticated) {
        throw new Error('You must be logged in to manage window glazing');
      }

      if (editingGlazing) {
        await updateWindowGlazing(editingGlazing.id, formData);
      } else {
        await addWindowGlazing(formData);
      }

      setOpenModal(false);
      setFormData(defaultGlazing);
      setEditingGlazing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setFormData(defaultGlazing);
    setEditingGlazing(null);
    setFormError(null);
  };

  // Calculate thermal resistance
  const calculateThermalResistance = (thickness: number, conductivity: number) => {
    return thickness / conductivity;
  };

  // Get benchmark status
  const getBenchmarkStatus = (value: number, type: 'solar' | 'visible' | 'thermal') => {
    const benchmarks = {
      solar: { low: 0.3, high: 0.6 },
      visible: { low: 0.5, high: 0.8 },
      thermal: { low: 0.8, high: 1.5 }
    };

    const threshold = benchmarks[type];
    
    if (value <= threshold.low) return { color: 'success', label: 'Low' };
    if (value >= threshold.high) return { color: 'error', label: 'High' };
    return { color: 'warning', label: 'Moderate' };
  };

  // Property display components
  const TransmittanceProperty = ({ 
    label, 
    value, 
    tooltip,
    type
  }: { 
    label: string, 
    value: number | null,
    tooltip: string,
    type: 'solar' | 'visible' | 'thermal'
  }) => {
    if (value === null) return null;
    
    const status = getBenchmarkStatus(value, type);
    
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <Tooltip title={tooltip} arrow placement="top">
            <span>{label}</span>
          </Tooltip>
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
          <Chip 
            label={status.label} 
            color={status.color} 
            size="small"
          />
        </Box>
      </Box>
    );
  };

  // Details Dialog
  const GlazingDetailsDialog = ({ 
    glazing, 
    onClose 
  }: { 
    glazing: WindowGlazing, 
    onClose: () => void 
  }) => {
    const rValue = calculateThermalResistance(glazing.thickness_m, glazing.conductivity_w_mk);
    const uValue = 1 / rValue;

    return (
      <Dialog
        open={true}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 1300 }} // Lower z-index for details dialog
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{glazing.name}</Typography>
            <Chip 
              label={`U-Value: ${uValue.toFixed(2)} W/m²K`}
              color={uValue < 1.2 ? "success" : uValue > 2.0 ? "error" : "warning"}
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Physical Properties */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <ArrowUpDown size={24} />
                    <Typography variant="h6">Physical Properties</Typography>
                  </Box>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Tooltip 
                            title="Glass pane thickness. Typical range: 3-12mm. Affects weight, cost, and thermal performance."
                            arrow
                            placement="top"
                          >
                            <span>Thickness</span>
                          </Tooltip>
                        }
                        secondary={`${glazing.thickness_m * 1000} mm`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Tooltip 
                            title="Heat transfer coefficient. Lower values indicate better insulation. Typical range: 0.8-1.1 W/m·K"
                            arrow
                            placement="top"
                          >
                            <span>Conductivity</span>
                          </Tooltip>
                        }
                        secondary={`${glazing.conductivity_w_mk.toFixed(3)} W/m·K`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Tooltip 
                            title="Thermal resistance (R-value). Higher values mean better insulation. Typical range: 0.003-0.01 m²·K/W"
                            arrow
                            placement="top"
                          >
                            <span>Thermal Resistance</span>
                          </Tooltip>
                        }
                        secondary={`${rValue.toFixed(4)} m²·K/W`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Optical Properties */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <Sun size={24} />
                    <Typography variant="h6">Optical Properties</Typography>
                  </Box>
                  <TransmittanceProperty
                    label="Solar Transmittance"
                    value={glazing.solar_transmittance}
                    type="solar"
                    tooltip="Fraction of solar radiation that passes through. Low: < 0.3, Moderate: 0.3-0.6, High: > 0.6. Lower values reduce solar heat gain."
                  />
                  <TransmittanceProperty
                    label="Visible Transmittance"
                    value={glazing.visible_transmittance}
                    type="visible"
                    tooltip="Fraction of visible light transmitted. Low: < 0.5, Moderate: 0.5-0.8, High: > 0.8. Higher values improve daylighting."
                  />
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    <Tooltip 
                      title="Surface properties affecting long-wave radiation exchange"
                      arrow
                      placement="top"
                    >
                      <span>Surface Properties</span>
                    </Tooltip>
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      Front IR Emissivity: {(glazing.front_ir_emissivity * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">
                      Back IR Emissivity: {(glazing.back_ir_emissivity * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Environmental & Economic Impact */}
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <Leaf size={24} />
                    <Typography variant="h6">Environmental & Economic Impact</Typography>
                  </Box>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" gutterBottom>
                        <Tooltip 
                          title="Global Warming Potential (A1-A3). Low: ≤ 25, Moderate: 25-50, High: > 50 kg CO₂e/m²"
                          arrow
                          placement="top"
                        >
                          <span>Global Warming Potential</span>
                        </Tooltip>
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {glazing.gwp_kgco2e_per_m2.toFixed(1)} kg CO₂e/m²
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" gutterBottom>
                        <Tooltip 
                          title="Material cost per square meter, excluding framing and installation"
                          arrow
                          placement="top"
                        >
                          <span>Cost</span>
                        </Tooltip>
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        {glazing.cost_sek_per_m2.toFixed(0)} SEK/m²
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Source Information */}
            {glazing.source && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Source Information
                    </Typography>
                    <Typography variant="body2">
                      {glazing.source}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleEdit(glazing)} color="primary">
            Edit Glazing
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Filter and sort glazing
  const filteredGlazing = windowGlazing.filter(glazing => 
    glazing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedGlazing = filteredGlazing.sort((a, b) => {
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

  const paginatedGlazing = sortedGlazing.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Window Glazing</Typography>
        <TextField
          placeholder="Search glazing..."
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
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedGlazing.map((glazing) => (
                <TableRow
                  hover
                  key={glazing.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>{glazing.name}</TableCell>
                  <TableCell align="right">{glazing.thickness_m.toFixed(4)}</TableCell>
                  <TableCell align="right">{glazing.conductivity_w_mk.toFixed(4)}</TableCell>
                  <TableCell align="right">
                    {glazing.solar_transmittance?.toFixed(3) ?? '-'}
                  </TableCell>
                  <TableCell align="right">
                    {glazing.visible_transmittance?.toFixed(3) ?? '-'}
                  </TableCell>
                  <TableCell align="right">{glazing.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="right">{glazing.cost_sek_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEdit(glazing)}>
                        <Edit size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Details">
                      <IconButton size="small" onClick={() => handleViewDetails(glazing)}>
                        <Info size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedGlazing.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No window glazing found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredGlazing.length}
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

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 1400 }} // Higher z-index for edit dialog
      >
        <DialogTitle>
          {editingGlazing ? 'Edit Window Glazing' : 'Add New Window Glazing'}
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
                label="Glazing Name"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
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
                label="Solar Transmittance"
                type="number"
                inputProps={{ step: 0.001, min: 0, max: 1 }}
                value={formData.solar_transmittance ?? ''}
                onChange={(e) => handleInputChange('solar_transmittance', e.target.value ? Number(e.target.value) : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Visible Transmittance"
                type="number"
                inputProps={{ step: 0.001, min: 0, max: 1 }}
                value={formData.visible_transmittance ?? ''}
                onChange={(e) => handleInputChange('visible_transmittance', e.target.value ? Number(e.target.value) : null)}
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
            {editingGlazing ? 'Save Changes' : 'Add Window Glazing'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      {selectedGlazing && (
        <GlazingDetailsDialog
          glazing={selectedGlazing}
          onClose={() => {
            setSelectedGlazing(null);
            setDetailsDialogOpen(false);
          }}
        />
      )}
    </Box>
  );
};

export default WindowGlazingTab;