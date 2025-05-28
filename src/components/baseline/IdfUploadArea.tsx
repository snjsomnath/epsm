import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Chip,
  Stack
} from '@mui/material';
import { FileText, Upload } from 'lucide-react';

interface IdfUploadAreaProps {
  onFilesUploaded: (files: File[]) => void;
}

const IdfUploadArea = ({ onFilesUploaded }: IdfUploadAreaProps) => {
  const [idfFiles, setIdfFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filteredFiles = Array.from(files).filter(file => file.name.endsWith('.idf'));
      setIdfFiles(filteredFiles);
      onFilesUploaded(filteredFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(event.dataTransfer.files).filter(
      file => file.name.endsWith('.idf')
    );
    
    if (files.length > 0) {
      setIdfFiles(files);
      onFilesUploaded(files);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFiles = idfFiles.filter(file => file !== fileToRemove);
    setIdfFiles(updatedFiles);
    onFilesUploaded(updatedFiles);
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
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={() => fileInputRef.current?.click()}
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
        />
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