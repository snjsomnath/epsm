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
  Stack
} from '@mui/material';
import { Search, Plus, Edit, Info, X } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { Material, MaterialInsert } from '../../lib/database.types';

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

  // ... (keep all the existing handlers)

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

  // ... (keep all the existing JSX and render logic)
};

export default MaterialsTab;