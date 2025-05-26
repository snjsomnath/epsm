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
  Divider,
  Avatar
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
  Waves
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
  const { windowGlazing, addWindowGlazing, error: dbError } = useDatabase();
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError(null);

      if (!formData.name || !formData.thickness_m || !formData.conductivity_w_mk) {
        throw new Error('Please fill in all required fields');
      }

      if (!isAuthenticated) {
        throw new Error('You must be logged in to add window glazing');
      }

      const isDemoMode = sessionStorage.getItem('demoMode') === 'true';
      
      const glazingWithAuthor = {
        ...formData,
        author_id: isDemoMode ? '00000000-0000-0000-0000-000000000000' : formData.author_id
      };

      await addWindowGlazing(glazingWithAuthor);
      setOpenModal(false);
      setFormData(defaultGlazing);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const OpticalProperty = ({ 
    label, 
    value, 
    tooltip 
  }: { 
    label: string, 
    value: number | null, 
    tooltip: string 
  }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" gutterBottom>
        <Tooltip 
          title={tooltip}
          arrow
          placement="top"
          enterDelay={200}
          leaveDelay={0}
        >
          <span>{label}</span>
        </Tooltip>
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={(value || 0) * 100} 
          sx={{ 
            flexGrow: 1,
            height: 8,
            borderRadius: 4
          }}
        />
        <Typography variant="body2" sx={{ minWidth: 45 }}>
          {value ? (value * 100).toFixed(1) : '0'}%
        </Typography>
      </Box>
    </Box>
  );

  const PropertyValue = ({ 
    label, 
    value, 
    unit, 
    tooltip 
  }: { 
    label: string, 
    value: number | string, 
    unit?: string,
    tooltip: string 
  }) => (
    <ListItem>
      <ListItemText
        primary={
          <Tooltip 
            title={tooltip}
            arrow
            placement="top"
            enterDelay={200}
            leaveDelay={0}
          >
            <span>{label}</span>
          </Tooltip>
        }
        secondary={
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}
          >
            {typeof value === 'number' ? value.toFixed(4) : value}
            {unit && ` ${unit}`}
          </Typography>
        }
      />
    </ListItem>
  );

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
                      <IconButton size="small">
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

      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add New Window Glazing
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
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            Add Window Glazing
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedGlazing && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedGlazing.name}</Typography>
                <Chip 
                  label={`ID: ${selectedGlazing.id}`} 
                  variant="outlined" 
                  size="small"
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
                        <Waves size={24} />
                        <Typography variant="h6">Physical Properties</Typography>
                      </Box>
                      <List dense>
                        <PropertyValue
                          label="Thickness"
                          value={selectedGlazing.thickness_m}
                          unit="m"
                          tooltip="Physical thickness of the glazing layer. Typical range: 0.003 - 0.012 m. Affects thermal and optical properties."
                        />
                        <PropertyValue
                          label="Conductivity"
                          value={selectedGlazing.conductivity_w_mk}
                          unit="W/m·K"
                          tooltip="Thermal conductivity of the glass. Typical range: 0.8 - 1.1 W/m·K. Lower values indicate better insulation."
                        />
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
                      <OpticalProperty
                        label="Solar Transmittance"
                        value={selectedGlazing.solar_transmittance}
                        tooltip="Fraction of solar radiation that passes through. High: > 0.6, Moderate: 0.3-0.6, Low: < 0.3. Affects solar heat gain."
                      />
                      <OpticalProperty
                        label="Visible Transmittance"
                        value={selectedGlazing.visible_transmittance}
                        tooltip="Fraction of visible light transmitted. High: > 0.7, Moderate: 0.4-0.7, Low: < 0.4. Affects daylight and visibility."
                      />
                      <OpticalProperty
                        label="Infrared Transmittance"
                        value={selectedGlazing.infrared_transmittance}
                        tooltip="Fraction of infrared radiation transmitted. Typically very low for energy-efficient glazing. Affects heat transfer."
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Surface Properties */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                        <Thermometer size={24} />
                        <Typography variant="h6">Surface Properties</Typography>
                      </Box>
                      <List dense>
                        <PropertyValue
                          label="Front IR Emissivity"
                          value={selectedGlazing.front_ir_emissivity}
                          tooltip="Front surface infrared emission. Low-E: < 0.2, Standard: 0.84. Lower values reduce radiative heat transfer."
                        />
                        <PropertyValue
                          label="Back IR Emissivity"
                          value={selectedGlazing.back_ir_emissivity}
                          tooltip="Back surface infrared emission. Low-E: < 0.2, Standard: 0.84. Lower values reduce radiative heat transfer."
                        />
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Environmental & Economic Impact */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                        <Leaf size={24} />
                        <Typography variant="h6">Impact Assessment</Typography>
                      </Box>
                      <List dense>
                        <PropertyValue
                          label="Global Warming Potential"
                          value={selectedGlazing.gwp_kgco2e_per_m2}
                          unit="kg CO₂e/m²"
                          tooltip="Environmental impact (A1-A3). Low: < 30, Moderate: 30-60, High: > 60 kg CO₂e/m². Measures production emissions."
                        />
                        <PropertyValue
                          label="Cost"
                          value={selectedGlazing.cost_sek_per_m2}
                          unit="SEK/m²"
                          tooltip="Material cost per square meter, excluding framing and installation."
                        />
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Source Information */}
                {selectedGlazing.source && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Source Information
                        </Typography>
                        <Typography variant="body2">
                          {selectedGlazing.source}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default WindowGlazingTab;