import React, { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  Divider
} from '@mui/material';
import { Upload, FileText, Thermometer } from 'lucide-react';

interface UploadAreaProps {
  onFilesUploaded: (files: File[], weatherFile: File | null) => void;
}

const UploadArea = ({ onFilesUploaded }: UploadAreaProps) => {
  const [idfFiles, setIdfFiles] = useState<File[]>([]);
  const [epwFile, setEpwFile] = useState<File | null>(null);
  const [isDraggingIdf, setIsDraggingIdf] = useState(false);
  const [isDraggingEpw, setIsDraggingEpw] = useState(false);
  
  const idfInputRef = useRef<HTMLInputElement>(null);
  const epwInputRef = useRef<HTMLInputElement>(null);

  const handleIdfFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const filteredFiles = Array.from(files).filter(file => file.name.endsWith('.idf'));
      setIdfFiles(filteredFiles);
      onFilesUploaded(filteredFiles, epwFile);
    }
  };

  const handleEpwFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && files[0].name.endsWith('.epw')) {
      setEpwFile(files[0]);
      onFilesUploaded(idfFiles, files[0]);
    }
  };

  const handleIdfDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingIdf(true);
  };

  const handleIdfDragLeave = () => {
    setIsDraggingIdf(false);
  };

  const handleEpwDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingEpw(true);
  };

  const handleEpwDragLeave = () => {
    setIsDraggingEpw(false);
  };

  const handleIdfDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingIdf(false);
    
    const files = Array.from(event.dataTransfer.files).filter(
      file => file.name.endsWith('.idf')
    );
    
    if (files.length > 0) {
      setIdfFiles(files);
      onFilesUploaded(files, epwFile);
    }
  };

  const handleEpwDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingEpw(false);
    
    const files = Array.from(event.dataTransfer.files);
    const epwFile = files.find(file => file.name.endsWith('.epw'));
    
    if (epwFile) {
      setEpwFile(epwFile);
      onFilesUploaded(idfFiles, epwFile);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        component={Paper}
        sx={{
          p: 2,
          mb: 2,
          border: '2px dashed',
          borderColor: isDraggingIdf ? 'primary.main' : 'divider',
          backgroundColor: isDraggingIdf ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={() => idfInputRef.current?.click()}
        onDragOver={handleIdfDragOver}
        onDragLeave={handleIdfDragLeave}
        onDrop={handleIdfDrop}
      >
        <input
          type="file"
          accept=".idf"
          multiple
          hidden
          ref={idfInputRef}
          onChange={handleIdfFilesSelected}
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

      <Divider sx={{ my: 2 }} />

      <Box
        component={Paper}
        sx={{
          p: 2,
          border: '2px dashed',
          borderColor: isDraggingEpw ? 'secondary.main' : 'divider',
          backgroundColor: isDraggingEpw ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={() => epwInputRef.current?.click()}
        onDragOver={handleEpwDragOver}
        onDragLeave={handleEpwDragLeave}
        onDrop={handleEpwDrop}
      >
        <input
          type="file"
          accept=".epw"
          hidden
          ref={epwInputRef}
          onChange={handleEpwFileSelected}
        />
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
      </Box>
    </Box>
  );
};

export default UploadArea;