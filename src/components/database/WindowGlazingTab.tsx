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
  Tooltip
} from '@mui/material';
import { Search, Plus, Edit, Info, X } from 'lucide-react';
import { mockWindowGlazing } from '../../data/mockData';

type WindowGlazing = {
  id: number;
  name: string;
  thickness_m: number;
  conductivity_w_mk: number;
  solar_transmittance: number;
  visible_transmittance: number;
  infrared_transmittance: number;
  front_ir_emissivity: number;
  back_ir_emissivity: number;
  gwp_kgco2e_per_m2: number;
  cost_sek_per_m2: number;
  author: string;
  date_created: string;
};

interface HeadCell {
  id: keyof WindowGlazing;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  width?: string;
}

const headCells: HeadCell[] = [
  { id: 'id', label: 'ID', numeric: true, disablePadding: false, width: '50px' },
  { id: 'name', label: 'Name', numeric: false, disablePadding: false },
  { id: 'thickness_m', label: 'Thickness (m)', numeric: true, disablePadding: false },
  { id: 'conductivity_w_mk', label: 'Conductivity (W/m·K)', numeric: true, disablePadding: false },
  { id: 'solar_transmittance', label: 'Solar Trans.', numeric: true, disablePadding: false },
  { id: 'visible_transmittance', label: 'Visible Trans.', numeric: true, disablePadding: false },
  { id: 'gwp_kgco2e_per_m2', label: 'GWP (kg CO₂e/m²)', numeric: true, disablePadding: false },
  { id: 'cost_sek_per_m2', label: 'Cost (SEK/m²)', numeric: true, disablePadding: false },
  { id: 'author', label: 'Author', numeric: false, disablePadding: false },
];

const WindowGlazingTab = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<keyof WindowGlazing>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [glazings] = useState<WindowGlazing[]>(mockWindowGlazing);
  
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

  // Filter and sort glazings
  const filteredGlazings = glazings.filter(glazing => 
    glazing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    glazing.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedGlazings = filteredGlazings.sort((a, b) => {
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

  const paginatedGlazings = sortedGlazings.slice(
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
              {paginatedGlazings.map((glazing) => (
                <TableRow
                  hover
                  key={glazing.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell align="right">{glazing.id}</TableCell>
                  <TableCell>{glazing.name}</TableCell>
                  <TableCell align="right">{glazing.thickness_m.toFixed(4)}</TableCell>
                  <TableCell align="right">{glazing.conductivity_w_mk.toFixed(4)}</TableCell>
                  <TableCell align="right">{glazing.solar_transmittance.toFixed(3)}</TableCell>
                  <TableCell align="right">{glazing.visible_transmittance.toFixed(3)}</TableCell>
                  <TableCell align="right">{glazing.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                  <TableCell align="right">{glazing.cost_sek_per_m2.toFixed(2)}</TableCell>
                  <TableCell>{glazing.author}</TableCell>
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
              {paginatedGlazings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
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
          count={filteredGlazings.length}
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
      >
        <Plus />
      </Fab>
    </Box>
  );
};

export default WindowGlazingTab;