import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemText } from '@mui/material';

interface Props {
  users: any[];
  onSelectUser: (user: any) => void;
  selectedUserId?: string | number;
}

const ExplorerTree: React.FC<Props> = ({ users = [], onSelectUser, selectedUserId }) => {
  return (
    <Box sx={{ width: '100%' }} role="tree" aria-label="Users">
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Users</Typography>
      <List dense>
        {users.map(u => (
          <ListItemButton
            key={u.id}
            selected={String(u.id) === String(selectedUserId)}
            onClick={() => onSelectUser(u)}
            role="treeitem"
          >
            <ListItemText primary={u.name || u.id} secondary={`${u.stats?.runs_total ?? 0} runs`} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default ExplorerTree;
