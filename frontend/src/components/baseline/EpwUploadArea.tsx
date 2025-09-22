import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
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

  const handleUseDefault = async () => {
    setValidating(true);
    setError(null);

    try {

      const candidates = [
        '/epw/SWE_VG_Goteborg.City.AP.025120_TMYx.2009-2023.epw'
      ];

      let resp: Response | null = null;
      let usedUrl = '';
      for (const url of candidates) {
        // try each candidate until one succeeds
        // eslint-disable-next-line no-await-in-loop
        const r = await fetch(url);
        if (r.ok) {
          resp = r;
          usedUrl = url;
          break;
        }
      }

      if (!resp) throw new Error('Default EPW not found');

      const blob = await resp.blob();
      const fileName = usedUrl.split('/').pop() || 'default.epw';
      const file = new File([blob], fileName, { type: 'application/octet-stream' });

      const isBundled = usedUrl.startsWith('/epw/');

      if (isBundled) {
        // Bundled files are trusted (part of the app); skip strict content validation
        setEpwFile(file);
        onFileUploaded(file);
      } else {
        const isValid = await validateWeatherFile(file);
        if (!isValid) throw new Error('Default EPW failed validation');

        setEpwFile(file);
        onFileUploaded(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load default EPW');
      setEpwFile(null);
      onFileUploaded(null);
    } finally {
      setValidating(false);
    }
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
            <Box sx={{ mt: 2 }}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUseDefault();
                }}
                disabled={validating}
                variant="outlined"
                size="small"
              >
                Use default EPW
              </Button>
            </Box>
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