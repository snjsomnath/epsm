import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { FileText } from 'lucide-react';
import IdfUploadArea from '../../baseline/IdfUploadArea';

export type UploadDialogProps = {
  open: boolean;
  uploadedFiles: File[];
  weatherFile: File | null;
  onClose: () => void;
  onFilesUploaded: (files: File[]) => void;
  onWeatherSelected: (file: File) => void;
  onWeatherCleared: () => void;
};

const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  uploadedFiles,
  weatherFile,
  onClose,
  onFilesUploaded,
  onWeatherSelected,
  onWeatherCleared,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const hasWeatherFile = Boolean(weatherFile && weatherFile.size > 0);
  const placeholderWeatherName = weatherFile && (!hasWeatherFile ? weatherFile.name : null);

  // Add default weather file option
  const handleUseDefaultWeather = async () => {
    try {
      const response = await fetch('/epw/test.epw');
      if (!response.ok) {
        throw new Error(`Failed to load default EPW: ${response.status}`);
      }
      const blob = await response.blob();
      const file = new File([blob], 'test.epw', { type: blob.type || 'application/octet-stream' });
      onWeatherSelected(file);
    } catch (error) {
      console.error('Unable to load bundled default EPW file.', error);
    }
  };

  const handleWeatherInput = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const [file] = files;
    if (file.name.toLowerCase().endsWith('.epw')) {
      onWeatherSelected(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].name.toLowerCase().endsWith('.epw')) {
      onWeatherSelected(files[0]);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Required Files</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please upload the required files to run the simulation. IDF files and EPW weather files carry over from previous selections - you only need to upload what's missing.
        </DialogContentText>

        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              IDF Building Models
            </Typography>
            <IdfUploadArea onFilesUploaded={onFilesUploaded} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Weather Data (EPW)
            </Typography>
            <Box
              component={Paper}
              sx={{
                p: 2,
                border: '2px dashed',
                borderColor: isDragging ? 'secondary.main' : 'divider',
                backgroundColor: isDragging ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              onClick={() => document.getElementById('epw-file-input')?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                id="epw-file-input"
                type="file"
                accept=".epw"
                hidden
                onChange={(event) => {
                  handleWeatherInput(event.target.files);
                  event.target.value = '';
                }}
              />
              <FileText
                size={30}
                style={{ marginBottom: '8px', color: hasWeatherFile ? '#f50057' : '#9e9e9e' }}
              />
              <Typography variant="subtitle1" gutterBottom>
                {hasWeatherFile
                  ? `Selected: ${weatherFile?.name}`
                  : placeholderWeatherName
                    ? `Stored selection: ${placeholderWeatherName}`
                    : 'Drop EPW file here'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleUseDefaultWeather();
                  }}
                  variant="outlined"
                  size="small"
                  startIcon={<FileText size={16} />}
                >
                  Use default EPW
                </Button>
              </Box>
            </Box>

            {hasWeatherFile && weatherFile && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Uploaded Files:
                </Typography>
                <Chip
                  label={weatherFile.name}
                  onDelete={onWeatherCleared}
                  color="secondary"
                  variant="outlined"
                />
              </Stack>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onClose}
          disabled={uploadedFiles.length === 0 || !hasWeatherFile}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;
