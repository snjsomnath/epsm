import { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper
} from '@mui/material';
import MaterialsTab from './MaterialsTab';
import WindowGlazingTab from './WindowGlazingTab';
import ConstructionsTab from './ConstructionsTab';
import ConstructionSetsTab from './ConstructionSetsTab';

const tabPaths = [
  '/database/materials',
  '/database/glazing',
  '/database/constructions',
  '/database/sets'
];

const DatabasePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine which tab is active based on the current path
  const getCurrentTabIndex = () => {
    const path = location.pathname;
    const index = tabPaths.findIndex(tabPath => path === tabPath);
    return index >= 0 ? index : 0;
  };

  const [tabIndex, setTabIndex] = useState(getCurrentTabIndex());

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    navigate(tabPaths[newValue]);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Database Management
      </Typography>
      <Typography variant="body1" paragraph>
        Create, edit, and manage building materials, window glazing, constructions, and construction sets.
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Materials" />
          <Tab label="Window Glazing" />
          <Tab label="Constructions" />
          <Tab label="Construction Sets" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Routes>
          <Route path="/" element={<MaterialsTab />} />
          <Route path="/materials" element={<MaterialsTab />} />
          <Route path="/glazing" element={<WindowGlazingTab />} />
          <Route path="/constructions" element={<ConstructionsTab />} />
          <Route path="/sets" element={<ConstructionSetsTab />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default DatabasePage;