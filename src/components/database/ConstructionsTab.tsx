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
  Chip,
  Tooltip,
  Card,
  CardContent,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Search, Plus, Edit, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { mockConstructions } from '../../data/mockData';

type Construction = {
  id: number;
  name: string;
  element_type: 'wall' | 'roof' | 'floor' | 'ceiling' | 'window';
  is_window: boolean;
  u_value_w_m2k: number;
  gwp_kgco2e_per_m2: number;
  cost_sek_per_m2: number;
  author: string;
  date_created: string;
  layers: {
    id: number;
    name: string;
    thickness_m: number;
    is_glazing_layer: boolean;
  }[];
};

interface HeadCell {
  id: keyof Construction | string;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  width?: string;
}

const headCells: HeadCell[] = [
  { id: 'id', label: 'ID', numeric: true, disablePadding: false, width: '50px' },
  { id: 'name', label: 'Name', numeric: false, disablePadding: false },
  { id: 'element_type', label: 'Type', numeric: false, disablePadding: false },
  { id: 'u_value_w_m2k', label: 'U-Value (W/m²K)', numeric: true, disablePadding: false },
  { id: 'layers_count', label: 'Layers', numeric: true, disablePadding: false, width: '80px' },
  { id: 'gwp_kgco2e_per_m2', label: 'GWP (kg CO₂e/m²)', numeric: true, disablePadding: false },
  { id: 'cost_sek_per_m2', label: 'Cost (SEK/m²)', numeric: true, disablePadding: false },
  { id: 'author', label: 'Author', numeric: false, disablePadding: false },
];

const ConstructionsTab = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [constructions] = useState<Construction[]>(mockConstructions);
  
  const handleRequestSort = (property: string) => {
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

  const handleExpandRow = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filter and sort constructions
  const filteredConstructions = constructions.filter(construction => 
    construction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    construction.element_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    construction.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConstructions = filteredConstructions.sort((a, b) => {
    if (orderBy === 'layers_count') {
      return order === 'asc' 
        ? a.layers.length - b.layers.length
        : b.layers.length - a.layers.length;
    }
    
    const aValue = a[orderBy as keyof Construction];
    const bValue = b[orderBy as keyof Construction];
    
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
                <TableCell padding="checkbox" />
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
              {paginatedConstructions.map((construction) => (
                <>
                  <TableRow
                    hover
                    key={construction.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <IconButton size="small" onClick={() => handleExpandRow(construction.id)}>
                        {expandedId === construction.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </IconButton>
                    </TableCell>
                    <TableCell align="right">{construction.id}</TableCell>
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
                    <TableCell align="right">{construction.layers.length}</TableCell>
                    <TableCell align="right">{construction.gwp_kgco2e_per_m2.toFixed(2)}</TableCell>
                    <TableCell align="right">{construction.cost_sek_per_m2.toFixed(2)}</TableCell>
                    <TableCell>{construction.author}</TableCell>
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
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                      <Collapse in={expandedId === construction.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, padding: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom component="div">
                            Layer Structure (Outside to Inside)
                          </Typography>
                          <List dense>
                            {construction.layers.map((layer, index) => (
                              <div key={layer.id}>
                                <ListItem>
                                  <ListItemText
                                    primary={layer.name}
                                    secondary={`Thickness: ${layer.thickness_m.toFixed(4)} m${layer.is_glazing_layer ? ' (Glazing)' : ''}`}
                                  />
                                </ListItem>
                                {index < construction.layers.length - 1 && <Divider />}
                              </div>
                            ))}
                          </List>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))}
              {paginatedConstructions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No constructions found
                  </TableCell>
                </TableRow>
              )}
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
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Plus />
      </Fab>
    </Box>
  );
};

export default ConstructionsTab;