import { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '../../lib/supabase';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit, Delete, Info } from '@mui/icons-material';

interface WindowGlazing {
  id: string;
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
  author_id: string | null;
  source?: string;
}

interface FormData {
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
  author_id: string;
  source?: string;
}

const WindowGlazingTab = () => {
  const user = useUser();
  const [glazingList, setGlazingList] = useState<WindowGlazing[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingGlazing, setEditingGlazing] = useState<WindowGlazing | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedGlazing, setSelectedGlazing] = useState<WindowGlazing | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    thickness_m: 0,
    conductivity_w_mk: 0,
    solar_transmittance: 0,
    visible_transmittance: 0,
    infrared_transmittance: 0,
    front_ir_emissivity: 0.84,
    back_ir_emissivity: 0.84,
    gwp_kgco2e_per_m2: 0,
    cost_sek_per_m2: 0,
    author_id: user?.id || '00000000-0000-0000-0000-000000000000',
    source: ''
  });

  useEffect(() => {
    fetchGlazing();
  }, []);

  const fetchGlazing = async () => {
    const { data, error } = await supabase
      .from('window_glazing')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching glazing:', error);
    } else {
      setGlazingList(data);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'source' ? value : parseFloat(value)
    }));
  };

  const handleSubmit = async () => {
    const glazingData = {
      ...formData,
      author_id: user?.id || '00000000-0000-0000-0000-000000000000'
    };

    if (editingGlazing) {
      const { error } = await supabase
        .from('window_glazing')
        .update(glazingData)
        .eq('id', editingGlazing.id);

      if (error) {
        console.error('Error updating glazing:', error);
      }
    } else {
      const { error } = await supabase
        .from('window_glazing')
        .insert([glazingData]);

      if (error) {
        console.error('Error creating glazing:', error);
      }
    }

    setOpenModal(false);
    setEditingGlazing(null);
    fetchGlazing();
    resetForm();
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
    setOpenModal(true);
    setDetailsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('window_glazing')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting glazing:', error);
    } else {
      fetchGlazing();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      thickness_m: 0,
      conductivity_w_mk: 0,
      solar_transmittance: 0,
      visible_transmittance: 0,
      infrared_transmittance: 0,
      front_ir_emissivity: 0.84,
      back_ir_emissivity: 0.84,
      gwp_kgco2e_per_m2: 0,
      cost_sek_per_m2: 0,
      author_id: user?.id || '00000000-0000-0000-0000-000000000000',
      source: ''
    });
  };

  const handleShowDetails = (glazing: WindowGlazing) => {
    setSelectedGlazing(glazing);
    setDetailsDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Window Glazing</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => {
            setEditingGlazing(null);
            resetForm();
            setOpenModal(true);
          }}
        >
          Add New Glazing
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Thickness (m)</TableCell>
              <TableCell>Conductivity (W/mK)</TableCell>
              <TableCell>Solar Transmittance</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {glazingList.map((glazing) => (
              <TableRow key={glazing.id}>
                <TableCell>{glazing.name}</TableCell>
                <TableCell>{glazing.thickness_m}</TableCell>
                <TableCell>{glazing.conductivity_w_mk}</TableCell>
                <TableCell>{glazing.solar_transmittance}</TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleShowDetails(glazing)}>
                      <Info />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleEdit(glazing)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(glazing.id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingGlazing ? 'Edit Glazing' : 'Add New Glazing'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 2 }}>
            <TextField
              name="name"
              label="Name"
              value={formData.name}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="thickness_m"
              label="Thickness (m)"
              type="number"
              value={formData.thickness_m}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="conductivity_w_mk"
              label="Conductivity (W/mK)"
              type="number"
              value={formData.conductivity_w_mk}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="solar_transmittance"
              label="Solar Transmittance"
              type="number"
              value={formData.solar_transmittance}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="visible_transmittance"
              label="Visible Transmittance"
              type="number"
              value={formData.visible_transmittance}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="infrared_transmittance"
              label="Infrared Transmittance"
              type="number"
              value={formData.infrared_transmittance}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="front_ir_emissivity"
              label="Front IR Emissivity"
              type="number"
              value={formData.front_ir_emissivity}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="back_ir_emissivity"
              label="Back IR Emissivity"
              type="number"
              value={formData.back_ir_emissivity}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="gwp_kgco2e_per_m2"
              label="GWP (kgCO2e/m²)"
              type="number"
              value={formData.gwp_kgco2e_per_m2}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="cost_sek_per_m2"
              label="Cost (SEK/m²)"
              type="number"
              value={formData.cost_sek_per_m2}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              name="source"
              label="Source"
              value={formData.source}
              onChange={handleInputChange}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingGlazing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Glazing Details</DialogTitle>
        <DialogContent>
          {selectedGlazing && (
            <Box sx={{ display: 'grid', gap: 2, pt: 2 }}>
              <Typography><strong>Name:</strong> {selectedGlazing.name}</Typography>
              <Typography><strong>Thickness:</strong> {selectedGlazing.thickness_m} m</Typography>
              <Typography><strong>Conductivity:</strong> {selectedGlazing.conductivity_w_mk} W/mK</Typography>
              <Typography><strong>Solar Transmittance:</strong> {selectedGlazing.solar_transmittance}</Typography>
              <Typography><strong>Visible Transmittance:</strong> {selectedGlazing.visible_transmittance}</Typography>
              <Typography><strong>Infrared Transmittance:</strong> {selectedGlazing.infrared_transmittance}</Typography>
              <Typography><strong>Front IR Emissivity:</strong> {selectedGlazing.front_ir_emissivity}</Typography>
              <Typography><strong>Back IR Emissivity:</strong> {selectedGlazing.back_ir_emissivity}</Typography>
              <Typography><strong>GWP:</strong> {selectedGlazing.gwp_kgco2e_per_m2} kgCO2e/m²</Typography>
              <Typography><strong>Cost:</strong> {selectedGlazing.cost_sek_per_m2} SEK/m²</Typography>
              {selectedGlazing.source && (
                <Typography><strong>Source:</strong> {selectedGlazing.source}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          {selectedGlazing && (
            <Button onClick={() => handleEdit(selectedGlazing)} color="primary">
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WindowGlazingTab;