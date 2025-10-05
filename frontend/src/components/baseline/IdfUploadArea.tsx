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
import { FileText } from 'lucide-react';

interface IdfUploadAreaProps {
  onFilesUploaded: (files: File[]) => void;
}

const IdfUploadArea = ({ onFilesUploaded }: IdfUploadAreaProps) => {
  const [idfFiles, setIdfFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateIdfFile = async (file: File): Promise<boolean> => {
    try {
      const content = await file.text();
      return content.includes('Version,') && content.includes('Building,');
    } catch {
      return false;
    }
  };

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filteredFiles = Array.from(files).filter(file => file.name.endsWith('.idf'));
    
    if (filteredFiles.length === 0) {
      setError('Invalid file type. Please select IDF files.');
      return;
    }

    try {
      setValidating(true);
      setError(null);

      // Validate all files
      for (const file of filteredFiles) {
        const isValid = await validateIdfFile(file);
        if (!isValid) {
          throw new Error(`Invalid IDF file format: ${file.name}`);
        }
      }

      setIdfFiles(filteredFiles);
      onFilesUploaded(filteredFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate IDF files');
      setIdfFiles([]);
      onFilesUploaded([]);
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
    
    const files = Array.from(event.dataTransfer.files).filter(
      file => file.name.endsWith('.idf')
    );
    
    if (files.length === 0) {
      setError('Please drop IDF files');
      return;
    }

    try {
      setValidating(true);
      setError(null);

      // Validate all files
      for (const file of files) {
        const isValid = await validateIdfFile(file);
        if (!isValid) {
          throw new Error(`Invalid IDF file format: ${file.name}`);
        }
      }

      setIdfFiles(files);
      onFilesUploaded(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate IDF files');
      setIdfFiles([]);
      onFilesUploaded([]);
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFiles = idfFiles.filter(file => file !== fileToRemove);
    setIdfFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
    if (updatedFiles.length === 0) {
      setError(null);
    }
  };

  const handleUseDefault = async () => {
    setValidating(true);
    setError(null);

    try {
      const candidates = [
        '/idf/test.idf'
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

      if (!resp) throw new Error('Default IDF not found');

      const blob = await resp.blob();
      const fileName = usedUrl.split('/').pop() || 'default.idf';
      const file = new File([blob], fileName, { type: 'application/octet-stream' });

      const isBundled = usedUrl.startsWith('/idf/');

      if (isBundled) {
        // Bundled files are trusted (part of the app); skip strict content validation
        setIdfFiles([file]);
        onFilesUploaded([file]);
      } else {
        const isValid = await validateIdfFile(file);
        if (!isValid) throw new Error('Default IDF failed validation');

        setIdfFiles([file]);
        onFilesUploaded([file]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load default IDF');
      setIdfFiles([]);
      onFilesUploaded([]);
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
          borderColor: isDragging ? 'primary.main' : 'divider',
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
          accept=".idf"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleFilesSelected}
          disabled={validating}
        />
        
        {validating ? (
          <Box sx={{ p: 2 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Validating IDF files...
            </Typography>
          </Box>
        ) : (
          <>
            <FileText 
              size={30} 
              style={{ marginBottom: '8px', color: idfFiles.length ? '#1976d2' : '#9e9e9e' }} 
            />
            <Typography variant="subtitle1" gutterBottom>
              {idfFiles.length > 0 
                ? `${idfFiles.length} IDF ${idfFiles.length === 1 ? 'file' : 'files'} selected` 
                : 'Drop IDF files here'}
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
                Use default IDF
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

      {idfFiles.length > 0 && !error && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Uploaded Files:
          </Typography>
          {idfFiles.map((file, index) => (
            <Chip
              key={index}
              label={file.name}
              onDelete={() => handleRemoveFile(file)}
              color="primary"
              variant="outlined"
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default IdfUploadArea;