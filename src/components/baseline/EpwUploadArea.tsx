import { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip,
  Stack,
  Alert,
  CircularProgress
} from '@mui/material';
import { Thermometer } from 'lucide-react';
import { validateWeatherFile } from '../../utils/api';

interface EpwUploadAreaProps {
  onFileUploaded: (file: File | null) => void;
}

const EpwUploadArea = ({ onFileUploaded }: EpwUploadAreaProps) => {
  const [epwFile, setEpwFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.epw')) {
      setError('Invalid file type. Please select an EPW file.');
      return;
    }

    try {
      setValidating(true);
      setError(null);
      
      const isValid = await validateWeatherFile(file);
      if (!isValid) {
        throw new Error('Invalid weather file format');
      }

      setEpwFile(file);
      onFileUploaded(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate weather file');
      setEpwFile(null);
      onFileUploaded(null);
    } finally {
      setValidating(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(event.dataTransfer.files);
    const epwFile = files.find(file => file.name.endsWith('.epw'));
    
    if (!epwFile) {
      setError('Please drop an EPW file');
      return;
    }

    try {
      setValidating(true);
      setError(null);
      
      const isValid = await validateWeatherFile(epwFile);
      if (!isValid) {
        throw new Error('Invalid weather file format');
      }

      setEpwFile(epwFile);
      onFileUploaded(epwFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate weather file');
      setEpwFile(null);
      onFileUploaded(null);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveFile = () => {
    setEpwFile(null);
    onFileUploaded(null);
    setError(null);
  };

  return (
    <Box>
      <Box
        component={Paper}
        sx={{
          p: 2,
          border: '2px dashed',
          borderColor: isDragging ? 'secondary.main' : 'divider',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          cursor: validating ? 'wait' : 'pointer',
          textAlign: 'center',
          position: 'relative',
        }}
        onClick={() => !validating && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".epw"
          hidden
          ref={fileInputRef}
          onChange={handleFileSelected}
          disabled={validating}
        />
        
        {validating ? (
          <Box sx={{ p: 2 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Validating weather file...
            </Typography>
          </Box>
        ) : (
          <>
            <Thermometer 
              size={30} 
              style={{ marginBottom: '8px', color: epwFile ? '#00897b' : '#9e9e9e' }} 
            />
            <Typography variant="subtitle1" gutterBottom>
              {epwFile 
                ? `Weather file: ${epwFile.name}` 
                : 'Drop weather file (EPW) here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
          </>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {epwFile && !error && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Weather File:
          </Typography>
          <Chip
            label={epwFile.name}
            onDelete={handleRemoveFile}
            color="secondary"
            variant="outlined"
          />
        </Stack>
      )}
    </Box>
  );
};

export default EpwUploadArea;