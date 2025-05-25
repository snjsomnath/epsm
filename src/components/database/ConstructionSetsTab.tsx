import { useState } from 'react';
import { 
  Box, 
  Grid,
  Card, 
  CardContent, 
  CardActions,
  Typography, 
  TextField, 
  InputAdornment,
  IconButton,
  Button,
  Fab,
  Chip,
  Avatar,
  Divider,
  Stack
} from '@mui/material';
import { Search, Plus, Edit, Trash2, X, Copy } from 'lucide-react';
import { mockConstructionSets } from '../../data/mockData';

type ConstructionSet = {
  id: number;
  name: string;
  description: string;
  wall_construction: {
    id: number;
    name: string;
    u_value_w_m2k: number;
  } | null;
  roof_construction: {
    id: number;
    name: string;
    u_value_w_m2k: number;
  } | null;
  floor_construction: {
    id: number;
    name: string;
    u_value_w_m2k: number;
  } | null;
  window_construction: {
    id: number;
    name: string;
    u_value_w_m2k: number;
  } | null;
  author: string;
  date_created: string;
};

const ConstructionSetsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [constructionSets] = useState<ConstructionSet[]>(mockConstructionSets);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Filter construction sets
  const filteredSets = constructionSets.filter(set => 
    set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (set.description && set.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    set.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
        <Typography variant="h5">Construction Sets</Typography>
        <TextField
          placeholder="Search construction sets..."
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

      <Grid container spacing={3}>
        {filteredSets.map((set) => (
          <Grid item xs={12} sm={6} md={4} key={set.id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
              }
            }} className="card-hover">
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {set.name}
                  </Typography>
                  <Chip 
                    size="small" 
                    label={`ID: ${set.id}`} 
                    variant="outlined" 
                  />
                </Box>
                
                {set.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {set.description}
                  </Typography>
                )}
                
                <Divider sx={{ my: 1.5 }} />
                
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle2" color="primary">
                      Wall Construction
                    </Typography>
                    {set.wall_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.wall_construction.name}</span>
                        <span>U: {set.wall_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="secondary">
                      Roof Construction
                    </Typography>
                    {set.roof_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.roof_construction.name}</span>
                        <span>U: {set.roof_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="success.main">
                      Floor Construction
                    </Typography>
                    {set.floor_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.floor_construction.name}</span>
                        <span>U: {set.floor_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="info.main">
                      Window Construction
                    </Typography>
                    {set.window_construction ? (
                      <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{set.window_construction.name}</span>
                        <span>U: {set.window_construction.u_value_w_m2k.toFixed(3)} W/m²K</span>
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Not specified
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
              
              <Box sx={{ mt: 'auto', p: 1.5, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                    {set.author.charAt(0)}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {set.author}
                  </Typography>
                </Box>
                
                <CardActions sx={{ p: 0 }}>
                  <IconButton size="small" color="primary">
                    <Edit size={18} />
                  </IconButton>
                  <IconButton size="small" color="primary">
                    <Copy size={18} />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <Trash2 size={18} />
                  </IconButton>
                </CardActions>
              </Box>
            </Card>
          </Grid>
        ))}
        
        {filteredSets.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No construction sets found
              </Typography>
              <Button 
                variant="outlined" 
                startIcon={<Plus size={16} />}
                sx={{ mt: 2 }}
              >
                Create New Set
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

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

export default ConstructionSetsTab;