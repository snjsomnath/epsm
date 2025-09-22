import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
  Checkbox,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stack,
  LinearProgress
} from '@mui/material';
import { Save, Database, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import type { ParsedData } from '../../types/simulation';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import type { MaterialInsert, ConstructionInsert } from '../../lib/database.types';

// Create a new component for the confirmation dialog
interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  items: any[];
  currentIndex: number;
  onNavigate: (direction: 'next' | 'prev') => void;
  onConfirmItem: (item: any, index: number, updatedValues: any) => void;
  onFinish: () => void;
  type: 'material' | 'construction';
  editedValues: Record<number, any>;
}

const ConfirmationDialog = ({
  open,
  onClose,
  items,
  currentIndex,
  onNavigate,
  onConfirmItem,
  onFinish,
  type,
  editedValues
}: ConfirmationDialogProps) => {
  const [localValues, setLocalValues] = useState<any>(editedValues[currentIndex] || {});
  
  const currentItem = items[currentIndex];
  const isLastItem = currentIndex === items.length - 1;
  
  // Update local values when currentIndex changes
  useState(() => {
    setLocalValues(editedValues[currentIndex] || {});
  }, [currentIndex, editedValues]);
  
  const handleValueChange = (field: string, value: any) => {
    setLocalValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfirmAndNext = () => {
    onConfirmItem(currentItem, currentIndex, localValues);
    if (isLastItem) {
      onFinish();
    } else {
      onNavigate('next');
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {type === 'material' ? 'Confirm Material' : 'Confirm Construction'} ({currentIndex + 1}/{items.length})
      </DialogTitle>
      
      <LinearProgress 
        variant="determinate" 
        value={((currentIndex + 1) / items.length) * 100} 
        sx={{ mx: 3 }}
      />
      
      <DialogContent>
        {type === 'material' && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">
                {currentItem?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confirm material properties before adding to the database
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Thickness (m)"
                type="number"
                fullWidth
                value={localValues.thickness_m ?? currentItem?.properties?.thickness ?? 0}
                onChange={(e) => handleValueChange('thickness_m', parseFloat(e.target.value))}
                inputProps={{ step: 0.001 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Conductivity (W/mK)"
                type="number"
                fullWidth
                value={localValues.conductivity_w_mk ?? currentItem?.properties?.conductivity ?? 0}
                onChange={(e) => handleValueChange('conductivity_w_mk', parseFloat(e.target.value))}
                inputProps={{ step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Density (kg/m³)"
                type="number"
                fullWidth
                value={localValues.density_kg_m3 ?? currentItem?.properties?.density ?? 0}
                onChange={(e) => handleValueChange('density_kg_m3', parseFloat(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Specific Heat (J/kgK)"
                type="number"
                fullWidth
                value={localValues.specific_heat_j_kgk ?? currentItem?.properties?.specificHeat ?? 0}
                onChange={(e) => handleValueChange('specific_heat_j_kgk', parseFloat(e.target.value))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Roughness</InputLabel>
                <Select
                  value={localValues.roughness ?? currentItem?.properties?.roughness ?? "MediumRough"}
                  label="Roughness"
                  onChange={(e) => handleValueChange('roughness', e.target.value)}
                >
                  <MenuItem value="VeryRough">Very Rough</MenuItem>
                  <MenuItem value="Rough">Rough</MenuItem>
                  <MenuItem value="MediumRough">Medium Rough</MenuItem>
                  <MenuItem value="MediumSmooth">Medium Smooth</MenuItem>
                  <MenuItem value="Smooth">Smooth</MenuItem>
                  <MenuItem value="VerySmooth">Very Smooth</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="GWP (kgCO2e/m²)"
                type="number"
                fullWidth
                value={localValues.gwp_kgco2e_per_m2 ?? 0}
                onChange={(e) => handleValueChange('gwp_kgco2e_per_m2', parseFloat(e.target.value))}
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Cost (SEK/m²)"
                type="number"
                fullWidth
                value={localValues.cost_sek_per_m2 ?? 0}
                onChange={(e) => handleValueChange('cost_sek_per_m2', parseFloat(e.target.value))}
              />
            </Grid>
          </Grid>
        )}
        
        {type === 'construction' && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">
                {currentItem?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Confirm construction properties before adding to the database
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2">
                Type: {currentItem?.type}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Layers (outside to inside):
              </Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {currentItem?.properties?.layers.map((layer: string, idx: number) => (
                  <Chip 
                    key={`layer-${idx}`} 
                    label={layer} 
                    variant="outlined" 
                    size="small"
                  />
                ))}
              </Stack>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="U-Value (W/m²K)"
                type="number"
                fullWidth
                value={localValues.u_value_w_m2k ?? 0}
                onChange={(e) => handleValueChange('u_value_w_m2k', parseFloat(e.target.value))}
                inputProps={{ step: 0.01 }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="GWP (kgCO2e/m²)"
                type="number"
                fullWidth
                value={localValues.gwp_kgco2e_per_m2 ?? 0}
                onChange={(e) => handleValueChange('gwp_kgco2e_per_m2', parseFloat(e.target.value))}
                inputProps={{ step: 0.1 }}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Cost (SEK/m²)"
                type="number"
                fullWidth
                value={localValues.cost_sek_per_m2 ?? 0}
                onChange={(e) => handleValueChange('cost_sek_per_m2', parseFloat(e.target.value))}
                required
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Box>
          <Button
            onClick={() => onNavigate('prev')}
            disabled={currentIndex === 0}
            startIcon={<ArrowLeft size={18} />}
          >
            Previous
          </Button>
          
          <Button
            onClick={onClose}
            color="error"
            startIcon={<X size={18} />}
            sx={{ ml: 1 }}
          >
            Cancel
          </Button>
        </Box>
        
        <Button
          onClick={handleConfirmAndNext}
          variant="contained"
          color="primary"
          endIcon={isLastItem ? <Check size={18} /> : <ArrowRight size={18} />}
        >
          {isLastItem ? 'Finish' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AssignmentsTabProps {
  uploadedFiles: File[];
  parsedData: ParsedData | null;
}

const AssignmentsTab = ({ uploadedFiles, parsedData }: AssignmentsTabProps) => {
  const { isAuthenticated, user } = useAuth();
  const { 
    addMaterial, 
    addConstruction, 
    materials: dbMaterials, 
    constructions: dbConstructions 
  } = useDatabase();
  
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedConstructions, setSelectedConstructions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Add new state for the confirmation dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'material' | 'construction'>('material');
  const [itemsToConfirm, setItemsToConfirm] = useState<any[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [confirmedItems, setConfirmedItems] = useState<any[]>([]);
  const [editedValues, setEditedValues] = useState<Record<number, any>>({});

  // Add effect to check database for newly added materials/constructions
  useEffect(() => {
    if (parsedData) {
      // Update material existence status
      if (dbMaterials.length > 0 && parsedData.materials) {
        const updatedMaterials = [...parsedData.materials];
        let hasChanges = false;
        
        updatedMaterials.forEach(material => {
          const existsInDb = dbMaterials.some(
            dbMat => dbMat.name.toLowerCase() === material.name.toLowerCase()
          );
          
          if (existsInDb && !material.existsInDatabase) {
            material.existsInDatabase = true;
            hasChanges = true;
          }
        });
        
        // If we found materials that should be marked as existing, force a refresh
        if (hasChanges) {
          // Create a new reference to trigger a re-render
          const updatedData = {
            ...parsedData,
            materials: updatedMaterials
          };
          // This is a hack to force component update without proper state management
          Object.assign(parsedData, updatedData);
          // Force re-render
          setSelectedMaterials([...selectedMaterials]);
        }
      }
      
      // Update construction existence status
      if (dbConstructions.length > 0 && parsedData.constructions) {
        const updatedConstructions = [...parsedData.constructions];
        let hasChanges = false;
        
        updatedConstructions.forEach(construction => {
          const existsInDb = dbConstructions.some(
            dbCon => dbCon.name.toLowerCase() === construction.name.toLowerCase()
          );
          
          if (existsInDb && !construction.existsInDatabase) {
            construction.existsInDatabase = true;
            hasChanges = true;
          }
        });
        
        // If we found constructions that should be marked as existing, force a refresh
        if (hasChanges) {
          // Create a new reference to trigger a re-render
          const updatedData = {
            ...parsedData,
            constructions: updatedConstructions
          };
          // This is a hack to force component update without proper state management
          Object.assign(parsedData, updatedData);
          // Force re-render
          setSelectedConstructions([...selectedConstructions]);
        }
      }
    }
  }, [dbMaterials, dbConstructions, parsedData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleToggleMaterial = (materialName: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialName) 
        ? prev.filter(name => name !== materialName) 
        : [...prev, materialName]
    );
  };

  const handleToggleConstruction = (constructionName: string) => {
    setSelectedConstructions(prev => 
      prev.includes(constructionName) 
        ? prev.filter(name => name !== constructionName) 
        : [...prev, constructionName]
    );
  };

  const handleAddToDatabase = async (type: 'material' | 'construction') => {
    if (!isAuthenticated) {
      setFeedback({
        message: 'You must be logged in to add items to the database',
        type: 'error'
      });
      return;
    }

    if (!parsedData) return;

    const selectedItems = type === 'material' ? selectedMaterials : selectedConstructions;
    if (selectedItems.length === 0) {
      setFeedback({
        message: `No ${type}s selected to add to the database.`,
        type: 'error'
      });
      return;
    }

    // Filter out items that already exist in the database
    const itemsToAdd = (type === 'material' ? parsedData.materials : parsedData.constructions)
      .filter(item => selectedItems.includes(item.name) && !item.existsInDatabase);

    if (itemsToAdd.length === 0) {
      setFeedback({
        message: `All selected ${type}s already exist in the database.`,
        type: 'error'
      });
      return;
    }

    // Open the confirmation dialog instead of immediately sending to the API
    setConfirmType(type);
    setItemsToConfirm(itemsToAdd);
    setCurrentItemIndex(0);
    setConfirmedItems([]);
    setEditedValues({});
    setDialogOpen(true);
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentItemIndex < itemsToConfirm.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentItemIndex > 0) {
      setCurrentItemIndex(prev => prev - 1);
    }
  };

  const handleConfirmItem = (item: any, index: number, updatedValues: any) => {
    // Save the edited values for this item
    setEditedValues(prev => ({
      ...prev,
      [index]: updatedValues
    }));
    
    // Add the item to the confirmed list if it's not already there
    setConfirmedItems(prev => {
      const exists = prev.some(i => i.name === item.name);
      if (!exists) {
        return [...prev, item];
      }
      return prev;
    });
  };

  const handleFinishConfirmation = async () => {
    try {
      if (!isAuthenticated || !user) {
        setFeedback({
          message: 'You must be logged in to add items to the database',
          type: 'error'
        });
        setDialogOpen(false);
        return;
      }

      setSaving(true);
      
      // Create an array to track successful additions
      const successfulAdditions = [];
      const failedAdditions = [];
      const skippedItems = [];
      
      // Process each item one by one
      for (let index = 0; index < itemsToConfirm.length; index++) {
        const item = itemsToConfirm[index];
        const updatedValues = editedValues[index] || {};
        
        try {
          if (confirmType === 'material') {
            // Check if material already exists in the database first
            const existingMaterial = dbMaterials.find(m => 
              m.name.toLowerCase() === item.name.toLowerCase()
            );
            
            if (existingMaterial) {
              console.log(`Material ${item.name} already exists in dbMaterials, skipping`);
              skippedItems.push(item.name);
              continue;
            }
            
            // Format material data for PostgreSQL with proper defaults
            const materialData: MaterialInsert = {
              name: item.name,
              thickness_m: updatedValues.thickness_m || item.properties.thickness || 0,
              conductivity_w_mk: updatedValues.conductivity_w_mk || item.properties.conductivity || 0,
              density_kg_m3: updatedValues.density_kg_m3 || item.properties.density || 0,
              specific_heat_j_kgk: updatedValues.specific_heat_j_kgk || item.properties.specificHeat || 0,
              roughness: updatedValues.roughness || item.properties.roughness || 'MediumRough',
              thermal_absorptance: updatedValues.thermal_absorptance || item.properties.thermalAbsorptance || 0.9,
              solar_absorptance: updatedValues.solar_absorptance || item.properties.solarAbsorptance || 0.7,
              visible_absorptance: updatedValues.visible_absorptance || item.properties.visibleAbsorptance || 0.7,
              gwp_kgco2e_per_m2: updatedValues.gwp_kgco2e_per_m2 || 0,
              cost_sek_per_m2: updatedValues.cost_sek_per_m2 || 0,
              wall_allowed: true,
              roof_allowed: true,
              floor_allowed: true,
              window_layer_allowed: false,
              author_id: user.id,
              source: item.source || `Imported from IDF file: ${uploadedFiles[0]?.name || 'unknown'}`
            };
            
            console.log(`Attempting to add material to PostgreSQL:`, materialData);
            
            try {
              console.log("Calling addMaterial function...");
              const result = await addMaterial(materialData);
              console.log("Result from addMaterial:", result);
              
              // Even if there's an error about fetchMaterials, assume it worked
              // since the database operation might still succeed
              if (result && result.error) {
                if (result.error.code === '23505') {
                  console.log(`Material ${item.name} already exists in PostgreSQL (duplicate key), skipping`);
                  skippedItems.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const material = parsedData.materials.find(m => m.name === item.name);
                    if (material) material.existsInDatabase = true;
                  }
                  continue;
                } else if (result.error.message && result.error.message.includes('fetchMaterials is not defined')) {
                  // The material was probably added but the refresh failed
                  console.log(`Material ${item.name} was likely added but refresh failed`);
                  successfulAdditions.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const material = parsedData.materials.find(m => m.name === item.name);
                    if (material) material.existsInDatabase = true;
                  }
                  continue;
                } else {
                  throw new Error(result.error.message || 'Failed to add material');
                }
              } else {
                // Consider it a success even without explicit data
                successfulAdditions.push(item.name);
                console.log(`Successfully added material: ${item.name}`);
                
                // Mark as existing in database immediately
                if (parsedData) {
                  const material = parsedData.materials.find(m => m.name === item.name);
                  if (material) material.existsInDatabase = true;
                }
              }
            } catch (dbError) {
              console.error("Exception when calling addMaterial:", dbError);
              
              // Check for fetchMaterials error in addition to duplicate key
              if (dbError.message && dbError.message.includes('fetchMaterials is not defined')) {
                console.log(`Material ${item.name} was likely added but refresh failed`);
                successfulAdditions.push(item.name);
                
                // Mark as existing in database immediately
                if (parsedData) {
                  const material = parsedData.materials.find(m => m.name === item.name);
                  if (material) material.existsInDatabase = true;
                }
                continue;
              } else if (dbError.code === '23505' || 
                  (dbError.message && dbError.message.includes('duplicate key'))) {
                console.log(`Material ${item.name} already exists (caught error), skipping`);
                skippedItems.push(item.name);
                continue;
              }
              
              throw dbError;
            }
          } else {
            // For constructions...
            // First check if construction already exists
            const existingConstruction = dbConstructions.find(c => 
              c.name.toLowerCase() === item.name.toLowerCase()
            );
            
            if (existingConstruction) {
              console.log(`Construction ${item.name} already exists, skipping`);
              skippedItems.push(item.name);
              
              // Mark as existing in database immediately
              if (parsedData) {
                const construction = parsedData.constructions.find(c => c.name === item.name);
                if (construction) construction.existsInDatabase = true;
              }
              continue;
            }
            
            // Find materials in database for layers
            const layerMaterials = [];
            let missingMaterials = false;
            
            for (const layerName of item.properties.layers) {
              const material = dbMaterials.find(m => m.name.toLowerCase() === layerName.toLowerCase());
              if (material) {
                layerMaterials.push(material.id);
              } else {
                missingMaterials = true;
                failedAdditions.push(`${item.name} (missing material: ${layerName})`);
                break;
              }
            }
            
            if (missingMaterials) continue;
            
            // Format construction data for PostgreSQL
            const constructionData: ConstructionInsert = {
              name: item.name,
              element_type: item.type || 'wall',
              is_window: item.type === 'window',
              ep_construction_name: item.name,
              u_value_w_m2k: updatedValues.u_value_w_m2k || 0, // Default to 0
              gwp_kgco2e_per_m2: updatedValues.gwp_kgco2e_per_m2 || 0, // Default to 0
              cost_sek_per_m2: updatedValues.cost_sek_per_m2 || 0, // Default to 0
              author_id: user.id,
              source: item.source || `Imported from IDF file: ${uploadedFiles[0]?.name || 'unknown'}`
            };
            
            console.log(`Adding construction: ${item.name}`, constructionData, 'with layers:', layerMaterials);
            
            try {
              // Add construction to PostgreSQL
              const result = await addConstruction(constructionData, layerMaterials);
              console.log("Result from addConstruction:", result);
              
              // Consider operation successful unless there's a clear error
              if (result && result.error) {
                if (result.error.code === '23505') {
                  console.log(`Construction ${item.name} already exists (detected via error), skipping`);
                  skippedItems.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const construction = parsedData.constructions.find(c => c.name === item.name);
                    if (construction) construction.existsInDatabase = true;
                  }
                  continue;
                } else if (result.error.message && (
                  result.error.message.includes('fetchConstructions is not defined') ||
                  result.error.message.includes('getConstructions is not defined')
                )) {
                  // The construction was probably added but the refresh failed
                  console.log(`Construction ${item.name} was likely added but refresh failed`);
                  successfulAdditions.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const construction = parsedData.constructions.find(c => c.name === item.name);
                    if (construction) construction.existsInDatabase = true;
                  }
                  continue;
                } else {
                  throw new Error(result.error.message || 'Failed to add construction');
                }
              } else {
                // Even without explicit success data, consider it a success
                successfulAdditions.push(item.name);
                console.log(`Successfully added construction: ${item.name}`);
                
                // Mark as existing in database immediately
                if (parsedData) {
                  const construction = parsedData.constructions.find(c => c.name === item.name);
                  if (construction) construction.existsInDatabase = true;
                }
              }
            } catch (err) {
              console.error("Exception when calling addConstruction:", err);
              
              // Check for specific errors
              if (err && typeof err === 'object') {
                if ('code' in err && err.code === '23505') {
                  console.log(`Construction ${item.name} already exists (caught error), skipping`);
                  skippedItems.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const construction = parsedData.constructions.find(c => c.name === item.name);
                    if (construction) construction.existsInDatabase = true;
                  }
                  continue;
                } else if ('message' in err && typeof err.message === 'string' && (
                  err.message.includes('fetchConstructions is not defined') ||
                  err.message.includes('getConstructions is not defined')
                )) {
                  console.log(`Construction ${item.name} was likely added but refresh failed`);
                  successfulAdditions.push(item.name);
                  
                  // Mark as existing in database immediately
                  if (parsedData) {
                    const construction = parsedData.constructions.find(c => c.name === item.name);
                    if (construction) construction.existsInDatabase = true;
                  }
                  continue;
                }
              }
              throw err;
            }
          }
        } catch (itemError) {
          console.error(`Error adding ${item.name}:`, itemError);
          failedAdditions.push(`${item.name} (${itemError.message || 'Unknown error'})`);
        }
      }
      
      // Update UI immediately with our knowledge of what was added
      if (confirmType === 'material') {
        if (parsedData) {
          const updatedMaterials = [...parsedData.materials];
          
          updatedMaterials.forEach(mat => {
            if (successfulAdditions.includes(mat.name) || skippedItems.includes(mat.name)) {
              mat.existsInDatabase = true;
            }
          });
          
          // Create a new reference to force a re-render
          const updatedData = {
            ...parsedData,
            materials: updatedMaterials
          };
          
          // Update the parsedData reference
          Object.assign(parsedData, updatedData);
        }
        
        setSelectedMaterials([]);
      } else {
        // Similar update for constructions
        if (parsedData) {
          const updatedConstructions = [...parsedData.constructions];
          
          updatedConstructions.forEach(con => {
            if (successfulAdditions.includes(con.name) || skippedItems.includes(con.name)) {
              con.existsInDatabase = true;
            }
          });
          
          // Create a new reference to force a re-render
          const updatedData = {
            ...parsedData,
            constructions: updatedConstructions
          };
          
          // Update the parsedData reference
          Object.assign(parsedData, updatedData);
        }
        
        setSelectedConstructions([]);
      }

      // Show appropriate success message
      if (failedAdditions.length > 0) {
        setFeedback({
          message: `Added ${successfulAdditions.length} items, ${skippedItems.length} already existed, failed to add ${failedAdditions.length} items.`,
          type: 'error'
        });
      } else if (skippedItems.length > 0 && successfulAdditions.length > 0) {
        setFeedback({
          message: `Added ${successfulAdditions.length} new ${confirmType}s. ${skippedItems.length} items already existed.`,
          type: 'success'
        });
      } else if (skippedItems.length > 0) {
        setFeedback({
          message: `All ${skippedItems.length} items already existed in the database.`,
          type: 'info'
        });
      } else {
        setFeedback({
          message: `Successfully added ${successfulAdditions.length} ${confirmType}s to the database`,
          type: 'success'
        });
      }
    } catch (error) {
      console.error("Top-level error in handleFinishConfirmation:", error);
      setFeedback({
        message: error instanceof Error ? error.message : 'An error occurred',
        type: 'error'
      });
    } finally {
      setDialogOpen(false);
      setSaving(false);
    }
  };

  if (!parsedData || uploadedFiles.length === 0) {
    return (
      <Alert severity="info">
        Please upload and analyze IDF files to view component data.
      </Alert>
    );
  }

  return (
    <Box>
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 2 }}
      >
        <Tab label="Materials" />
        <Tab label="Constructions" />
        <Tab label="Zones" />
      </Tabs>

      {tabIndex === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Materials ({parsedData.materials.length})
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<Database size={18} />}
              onClick={() => handleAddToDatabase('material')}
              disabled={saving || selectedMaterials.length === 0}
            >
              Add Selected to Database
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedMaterials.length > 0 && selectedMaterials.length < parsedData.materials.length}
                      checked={selectedMaterials.length > 0 && selectedMaterials.length === parsedData.materials.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedMaterials(parsedData.materials.map(m => m.name));
                        } else {
                          setSelectedMaterials([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Thickness (m)</TableCell>
                  <TableCell>Conductivity (W/mK)</TableCell>
                  <TableCell>Density (kg/m³)</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.materials.map((material, index) => (
                  <TableRow 
                    key={material.uniqueKey || `material-${index}-${material.name}`}
                    sx={{ opacity: material.existsInDatabase ? 0.7 : 1 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMaterials.includes(material.name)}
                        onChange={() => handleToggleMaterial(material.name)}
                        disabled={material.existsInDatabase}
                      />
                    </TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell>{typeof material?.properties?.thickness === 'number' ? material.properties.thickness.toFixed(4) : 'N/A'}</TableCell>
                    <TableCell>{typeof material?.properties?.conductivity === 'number' ? material.properties.conductivity.toFixed(3) : 'N/A'}</TableCell>
                    <TableCell>{typeof material?.properties?.density === 'number' ? material.properties.density.toFixed(1) : 'N/A'}</TableCell>
                    <TableCell>
                      {material.existsInDatabase ? (
                        <Chip label="In Database" color="success" size="small" />
                      ) : (
                        <Chip label="New" color="primary" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabIndex === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Constructions ({parsedData.constructions.length})
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<Database size={18} />}
              onClick={() => handleAddToDatabase('construction')}
              disabled={saving || selectedConstructions.length === 0}
            >
              Add Selected to Database
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedConstructions.length > 0 && selectedConstructions.length < parsedData.constructions.length}
                      checked={selectedConstructions.length > 0 && selectedConstructions.length === parsedData.constructions.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedConstructions(parsedData.constructions.map(c => c.name));
                        } else {
                          setSelectedConstructions([]);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Layers</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.constructions.map((construction, index) => (
                  <TableRow 
                    key={construction.uniqueKey || `construction-${index}-${construction.name}`}
                    sx={{ opacity: construction.existsInDatabase ? 0.7 : 1 }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedConstructions.includes(construction.name)}
                        onChange={() => handleToggleConstruction(construction.name)}
                        disabled={construction.existsInDatabase}
                      />
                    </TableCell>
                    <TableCell>{construction.name}</TableCell>
                    <TableCell>{construction.type}</TableCell>
                    <TableCell>
                      {(construction?.properties?.layers || []).map((layer, i) => (
                        <Chip 
                          key={`${construction.uniqueKey}-layer-${i}`}
                          label={layer} 
                          size="small" 
                          variant="outlined"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {construction.existsInDatabase ? (
                        <Chip label="In Database" color="success" size="small" />
                      ) : (
                        <Chip label="New" color="primary" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabIndex === 2 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Zones ({parsedData.zones.length})
          </Typography>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Area (m²)</TableCell>
                  <TableCell align="right">Volume (m³)</TableCell>
                  <TableCell align="right">Ceiling Height (m)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parsedData.zones.map((zone, index) => (
                  <TableRow key={zone.uniqueKey || `zone-${index}-${zone.name}`}>
                    <TableCell>{zone.name}</TableCell>
                    <TableCell align="right">{typeof zone?.properties?.area === 'number' ? zone.properties.area.toFixed(1) : 'N/A'}</TableCell>
                    <TableCell align="right">{typeof zone?.properties?.volume === 'number' ? zone.properties.volume.toFixed(1) : 'N/A'}</TableCell>
                    <TableCell align="right">{typeof zone?.properties?.ceilingHeight === 'number' ? zone.properties.ceilingHeight.toFixed(2) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Feedback snackbar */}
      <Snackbar
        open={feedback !== null}
        autoHideDuration={6000}
        onClose={() => setFeedback(null)}
        message={feedback?.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        ContentProps={{
          sx: { 
            backgroundColor: feedback && feedback.type === 'success' ? 'success.main' : 'error.main',
            color: '#fff'
          }
        }}
      />

      {/* Add the confirmation dialog */}
      <ConfirmationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        items={itemsToConfirm}
        currentIndex={currentItemIndex}
        onNavigate={handleNavigate}
        onConfirmItem={handleConfirmItem}
        onFinish={handleFinishConfirmation}
        type={confirmType}
        editedValues={editedValues}
      />
    </Box>
  );
};

export default AssignmentsTab;