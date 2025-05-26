import { useState, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip,
  Stack
} from '@mui/material';
import { Thermometer } from 'lucide-react';

interface EpwUploadAreaProps {
  onFileUploaded: (file: File | null) => void;
}

const EpwUploadArea = ({ onFileUploaded }: EpwUploadAreaProps) => {
  const [epwFile, setEpwFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && files[0].name.endsWith('.epw')) {
      setEpwFile(files[0]);
      onFileUploaded(files[0]);
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
    
    const files = Array.from(event.dataTransfer.files);
    const epwFile = files.find(file => file.name.endsWith('.epw'));
    
    if (epwFile) {
      setEpwFile(epwFile);
      onFileUploaded(epwFile);
    }
  };

  const handleRemoveFile = () => {
    setEpwFile(null);
    onFileUploaded(null);
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
          accept=".epw"
          hidden
          ref={fileInputRef}
          onChange={handleFileSelected}
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

      {epwFile && (
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