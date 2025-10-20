import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  History,
  Play,
  Trash2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  getRecentModels, 
  removeRecentModel, 
  clearRecentModels,
  cleanupInvalidModels,
  type RecentModel 
} from '../../utils/recentModels';

interface RecentModelsProps {
  onSelectModel: (model: RecentModel) => void;
  currentModelId?: string;
}

const RecentModels: React.FC<RecentModelsProps> = ({ onSelectModel, currentModelId }) => {
  const [models, setModels] = useState<RecentModel[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [confirmClearDialog, setConfirmClearDialog] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  // Number of models to show initially in sidebar
  const INITIAL_DISPLAY_COUNT = 5;

  // Load models on component mount
  useEffect(() => {
    console.log('🔄 RecentModels component mounted, loading models...');
    loadModels();
  }, []);

  const loadModels = () => {
    const recentModels = getRecentModels();
    console.log('📂 Loaded recent models:', recentModels.length, 'models');
    setModels(recentModels);
  };

  const handleRemoveModel = (id: string, name: string) => {
    try {
      removeRecentModel(id);
      setModels(prev => prev.filter(model => model.id !== id));
      console.log('✅ Removed model:', name);
    } catch (error) {
      console.error('Failed to remove model:', error);
    }
  };

  const handleClearAll = () => {
    try {
      clearRecentModels();
      setModels([]);
      setConfirmClearDialog(false);
      console.log('✅ Cleared all recent models');
    } catch (error) {
      console.error('Failed to clear all models:', error);
    }
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    try {
      const removedCount = await cleanupInvalidModels();
      loadModels(); // Reload the list
      
      if (removedCount > 0) {
        console.log(`✅ Cleaned up ${removedCount} invalid models`);
      }
    } catch (error) {
      console.error('Failed to cleanup models:', error);
    } finally {
      setCleaningUp(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      return 'Just now';
    }
  };

  const formatArea = (area: number): string => {
    const areaKm2 = area / 1_000_000;
    return `${areaKm2.toLocaleString('en-US', { maximumFractionDigits: 3 })} km²`;
  };

  const modelsToShow = showAll ? models : models.slice(0, INITIAL_DISPLAY_COUNT);

  return (
    <Paper sx={{ 
      p: 2, 
      mb: 2, 
      height: 'fit-content',
      maxHeight: 'calc(100vh - 200px)',
      overflow: 'auto'
    }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <History size={18} />
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          Recent Models
        </Typography>
        
        {models.length > 0 && (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Clean up invalid models">
              <span>
                <IconButton
                  size="small"
                  onClick={handleCleanup}
                  disabled={cleaningUp}
                >
                  {cleaningUp ? <CircularProgress size={14} /> : <RefreshCw size={14} />}
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Clear all recent models">
              <IconButton
                size="small"
                onClick={() => setConfirmClearDialog(true)}
                color="error"
              >
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {models.length === 0 ? (
        <Alert severity="info">
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            No recent models. Generate one by selecting an area and clicking "Fetch Area".
          </Typography>
        </Alert>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {models.length} model{models.length === 1 ? '' : 's'} saved locally
          </Typography>

          <List sx={{ py: 0, maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
            {modelsToShow.map((model) => (
              <ListItem
                key={model.id}
                sx={{
                  border: 1,
                  borderColor: currentModelId === model.id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  p: 1.5,
                  bgcolor: currentModelId === model.id ? 'primary.50' : 'background.paper',
                  '&:hover': {
                    bgcolor: currentModelId === model.id ? 'primary.100' : 'action.hover'
                  }
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600, 
                      flexGrow: 1,
                      fontSize: '0.875rem',
                      lineHeight: 1.2
                    }}>
                      {model.name}
                    </Typography>
                    {currentModelId === model.id && (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    )}
                  </Stack>
                  
                  <Stack spacing={0.5} sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={`${formatArea(model.downloadArea.area)}`}
                        size="small"
                        sx={{ 
                          bgcolor: '#ff6b3520', 
                          color: '#ff6b35',
                          height: 20,
                          fontSize: '0.75rem'
                        }}
                      />
                      {model.simulationArea && (
                        <Chip
                          label={`→ ${formatArea(model.simulationArea.area)}`}
                          size="small"
                          sx={{ 
                            bgcolor: '#4caf5020', 
                            color: '#4caf50',
                            height: 20,
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </Stack>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {formatDate(model.createdAt)}
                      {model.buildingsCount && ` • ${model.buildingsCount} buildings`}
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button
                      size="small"
                      variant={currentModelId === model.id ? "outlined" : "contained"}
                      startIcon={<Play size={14} />}
                      onClick={() => onSelectModel(model)}
                      disabled={currentModelId === model.id}
                      sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
                    >
                      Load
                    </Button>
                    
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (model.modelUrl) {
                          window.open(model.modelUrl, '_blank');
                        }
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <Download size={12} />
                    </IconButton>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveModel(model.id, model.name)}
                      sx={{ p: 0.5 }}
                    >
                      <Trash2 size={12} />
                    </IconButton>
                  </Stack>
                </Box>
              </ListItem>
            ))}
          </List>

          {!showAll && models.length > INITIAL_DISPLAY_COUNT && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setShowAll(true)}
                endIcon={<ChevronDown size={14} />}
                sx={{ fontSize: '0.75rem' }}
              >
                Show {models.length - INITIAL_DISPLAY_COUNT} more
              </Button>
            </Box>
          )}

          {showAll && models.length > INITIAL_DISPLAY_COUNT && (
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setShowAll(false)}
                endIcon={<ChevronUp size={14} />}
                sx={{ fontSize: '0.75rem' }}
              >
                Show fewer
              </Button>
            </Box>
          )}
        </>
      )}      {/* Confirm Clear All Dialog */}
      <Dialog
        open={confirmClearDialog}
        onClose={() => setConfirmClearDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clear All Recent Models?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove all {models.length} recent 3D models from your browser storage. 
            The actual files on the server will not be deleted, but you'll need to regenerate 
            the models if you want to use them again.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 600, color: 'warning.main' }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleClearAll}
            color="error"
            variant="contained"
            startIcon={<Trash2 size={16} />}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RecentModels;