import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Container,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Database as DatabaseIcon,
  Home,
  FlaskConical,
  Activity as ActivityIcon,
  Sun,
  Moon,
  LogOut,
  Menu as MenuIcon,
  BarChart2,
  FileDown,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useDatabase } from '../../context/DatabaseContext';
import AboutDialog from '../about/AboutDialog';

const drawerWidth = 280;

const navItems = [
  { text: 'Home', icon: <Home size={24} />, path: '/' },
  { text: 'Database', icon: <DatabaseIcon size={24} />, path: '/database' },
  { text: 'Baseline', icon: <Home size={24} />, path: '/baseline' },
  { text: 'Scenario Setup', icon: <FlaskConical size={24} />, path: '/scenario' },
  { text: 'Simulation Runner', icon: <ActivityIcon size={24} />, path: '/simulation' },
  { text: 'Results', icon: <BarChart2 size={24} />, path: '/results' },
  { text: 'Export', icon: <FileDown size={24} />, path: '/export' }
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, signOut } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { materials, constructions, constructionSets, error: dbError } = useDatabase();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [dbStats, setDbStats] = useState({
    materials: 0,
    constructions: 0,
    sets: 0,
    lastUpdate: null as string | null
  });

  useEffect(() => {
    // Add a small delay to prevent flash of content
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
      }
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  // Update database stats when data changes
  useEffect(() => {
    if (materials && constructions && constructionSets) {
      setDbStats({
        materials: materials.length,
        constructions: constructions.length,
        sets: constructionSets.length,
        lastUpdate: new Date().toLocaleString()
      });
    }
  }, [materials, constructions, constructionSets]);

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleProfileMenuClose();
    await signOut();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            EnergyPlus Simulation Manager
          </Typography>
          
          <IconButton 
            color="inherit" 
            onClick={() => setAboutDialogOpen(true)} 
            sx={{ mr: 2 }}
          >
            <Info size={20} />
          </IconButton>

          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 2 }}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </IconButton>

          <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getInitials()}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                minWidth: 350,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
              },
            }}
          >
            <MenuItem>
              <Typography variant="subtitle2" color="text.secondary">
                Signed in as
              </Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="body2">
                {user?.email}
              </Typography>
            </MenuItem>

            <Divider />

            {/* Database Status */}
            <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DatabaseIcon size={16} />
                <Typography variant="body2">Database Status:</Typography>
                <Chip 
                  size="small"
                  label={dbError ? 'Error' : 'Connected'}
                  color={dbError ? 'error' : 'success'}
                />
              </Stack>
              <Stack spacing={0.5} sx={{ mt: 1, ml: 2 }}>
                <Typography variant="body2">
                  • {dbStats.materials} materials
                </Typography>
                <Typography variant="body2">
                  • {dbStats.constructions} constructions
                </Typography>
                <Typography variant="body2">
                  • {dbStats.sets} construction sets
                </Typography>
                {dbStats.lastUpdate && (
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {dbStats.lastUpdate}
                  </Typography>
                )}
              </Stack>
            </MenuItem>

            <Divider />
            <Divider />

            {user?.is_superuser && (
              <MenuItem onClick={() => { handleProfileMenuClose(); handleNavigation('/admin'); }}>
                <ListItemIcon>
                  <BarChart2 size={20} />
                </ListItemIcon>
                Admin
              </MenuItem>
            )}

            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogOut size={20} />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            transition: theme => theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            ...(!open && {
              width: theme => theme.spacing(7),
              overflowX: 'hidden',
            }),
          },
        }}
        open={open}
      >
        <Toolbar />
        <Box sx={{ overflow: 'hidden', height: '100%' }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    minHeight: 48,
                    px: 2.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'inherit',
                      }
                    }
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: 0, 
                      mr: open ? 3 : 'auto', 
                      justifyContent: 'center',
                      color: 'inherit'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && <ListItemText primary={item.text} />}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: 3,
          mt: 8,
          pb: 10,
          position: 'relative'
        }}
      >
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          <Outlet />
        </Container>

        <Box
          component="footer"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: open ? drawerWidth : 73,
            right: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            py: 1,
            px: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: (theme) => theme.zIndex.drawer - 1,
            transition: theme => theme.transitions.create(['left'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            EPSM v0.1 Beta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            © 2025 Chalmers University of Technology. All rights reserved.
          </Typography>
        </Box>
      </Box>

      <AboutDialog 
        open={aboutDialogOpen} 
        onClose={() => setAboutDialogOpen(false)} 
      />
    </Box>
  );
};

export default AppLayout;