import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { History, Pin, PinOff, Star, StarOff } from 'lucide-react';
import SectionCard from '../SectionCard';

export type HistoryItem = {
  id: string;
  title?: string;
  ts: number;
  favorite?: boolean;
  pinned?: boolean;
};

export type HistorySectionProps = {
  items: HistoryItem[];
  loadingId?: string | null;
  onRecall: (id: string) => void;
  onRemove?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onClear?: () => void;
  formatTimestamp: (ts: number) => string;
};

const HistorySection: React.FC<HistorySectionProps> = ({
  items,
  loadingId,
  onRecall,
  onRemove,
  onToggleFavorite,
  onTogglePin,
  onClear,
  formatTimestamp,
}) => {
  const theme = useTheme();
  const shouldShowClear = typeof onClear === 'function' && items.length > 0;

  return (
    <SectionCard
      title="Recent Runs"
      subtitle="Session-only history of the last few simulations"
      actions={shouldShowClear ? (
        <Button size="small" color="inherit" onClick={onClear}>
          Clear
        </Button>
      ) : undefined}
    >
      {items.length === 0 ? (
        <Alert severity="info">Run a simulation to build your recent history.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {items.map(item => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <History size={16} />
                    <Typography variant="subtitle2" noWrap>{item.title || item.id}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(item.ts)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  {typeof onToggleFavorite === 'function' && (
                    <IconButton size="small" onClick={() => onToggleFavorite(item.id)}>
                      {item.favorite ? <Star size={16} color={theme.palette.warning.main} /> : <StarOff size={16} />}
                    </IconButton>
                  )}
                  {typeof onTogglePin === 'function' && (
                    <IconButton size="small" onClick={() => onTogglePin(item.id)}>
                      {item.pinned ? <Pin size={16} color={theme.palette.primary.main} /> : <PinOff size={16} />}
                    </IconButton>
                  )}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onRecall(item.id)}
                  startIcon={loadingId === item.id ? <CircularProgress size={14} /> : undefined}
                  disabled={loadingId === item.id}
                >
                  View
                </Button>
                {typeof onRemove === 'function' && (
                  <Button size="small" color="inherit" onClick={() => onRemove(item.id)}>
                    Remove
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
};

export default HistorySection;
