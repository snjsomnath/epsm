import React from 'react';
import { Box, Paper, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';

interface Props {
  title: string;
  width?: number | string;
  children?: React.ReactNode;
  onClose?: () => void;
}

const DrawerPane: React.FC<Props> = ({ title, width = 300, children, onClose }) => {
  return (
    <Paper elevation={2} sx={{ width, maxWidth: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Typography variant="subtitle1">{title}</Typography>
        {onClose && (
          <IconButton size="small" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={14} />
          </IconButton>
        )}
      </Box>
      <Box sx={{ p: 1, overflow: 'auto', flex: 1 }}>{children}</Box>
    </Paper>
  );
};

export default DrawerPane;
