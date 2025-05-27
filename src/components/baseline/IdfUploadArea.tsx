import { useState, useRef } from 'react';
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
import { FileText, Upload } from 'lucide-react';
import { parseIdfFiles } from '../../utils/api';

interface IdfUploadAreaProps {
  onFilesUploaded: (files: File[]) => void;
}

const IdfUploadArea = ({ onFilesUploaded }: IdfUploadAreaProps) => {
  const [idfFiles, setIdfFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filteredFiles = Array.from(files).filter(file => file.name.endsWith('.idf'));
      if (filteredFiles.length === 0) {
        setError('Please select valid IDF files');
        return;
      }
      
      try {
        setParsing(true);
        setError(null);
        
        const { data, error } = await parseIdfFiles(filteredFiles);
        if (error) {
          if (error.includes('timeout')) {
            throw new Error('Connection to IDF parsing service timed out. Please try again.');
          } else if (error.includes('413')) {
            throw new Error('File size too large. Maximum size is 5MB per file.');
          } else {
            throw new Error('Failed to parse IDF files. Please check file format and try again.');
          }
        }
        
        setIdfFiles(filteredFiles);
        onFilesUploaded(filteredFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process IDF files');
        setIdfFiles([]);
        onFilesUploaded([]);
      } finally {
        setParsing(false);
      }
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
      setError('Please drop valid IDF files');
      return;
    }

    try {
      setParsing(true);
      setError(null);
      
      const { data, error } = await parseIdfFiles(files);
      if (error) {
        if (error.includes('timeout')) {
          throw new Error('Connection to IDF parsing service timed out. Please try again.');
        } else if (error.includes('413')) {
          throw new Error('File size too large. Maximum size is 5MB per file.');
        } else {
          throw new Error('Failed to parse IDF files. Please check file format and try again.');
        }
      }
      
      setIdfFiles(files);
      onFilesUploaded(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process IDF files');
      setIdfFiles([]);
      onFilesUploaded([]);
    } finally {
      setParsing(false);
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

  return (
    <Box>
      {error && (
        <Alert severity="error\" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component={Paper}
        sx={{
          p: 2,
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          backgroundColor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          cursor: parsing ? 'wait' : 'pointer',
          textAlign: 'center',
          opacity: parsing ? 0.7 : 1,
        }}
        onClick={() => !parsing && fileInputRef.current?.click()}
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
          disabled={parsing}
        />
        
        {parsing ? (
          <Box sx={{ p: 2 }}>
            <CircularProgress size={30} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Analyzing IDF files...
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
          </>
        )}
      </Box>

      {idfFiles.length > 0 && (
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