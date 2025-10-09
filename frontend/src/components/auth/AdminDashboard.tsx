import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, TextField, Switch, FormControlLabel, Typography, Table, TableHead, TableRow, TableCell, TableBody, Alert, IconButton, Snackbar, InputAdornment, Pagination } from '@mui/material';
import { Search, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import * as adminApi from '../../lib/admin-api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', is_staff: false, is_superuser: false });
  const [editUser, setEditUser] = useState<any | null>(null);
  const [openDelete, setOpenDelete] = useState<any | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthPending, setReauthPending] = useState<{ id: string; payload: any } | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const list = await adminApi.getUsers();
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_staff) fetchUsers();
  }, [user]);

  if (!user?.is_staff) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Admin Dashboard</Typography>
        <Alert severity="warning" sx={{ mt: 2 }}>You are not authorized to view this page.</Alert>
      </Box>
    );
  }

  const handleCreate = async () => {
    try {
      setLoading(true);
      await adminApi.createUser(newUser as any);
      setOpenCreate(false);
      setNewUser({ email: '', password: '', is_staff: false, is_superuser: false });
      await fetchUsers();
      setSnack({ open: true, message: 'User created', severity: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Failed to create user');
      setSnack({ open: true, message: err?.message || 'Failed to create user', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (id: string, field: string, value: boolean) => {
    try {
      // If attempting to change your own elevated flags, require re-auth
      const critical = field === 'is_staff' || field === 'is_superuser' || field === 'is_active';
      if (id === user?.id && critical) {
        setReauthPending({ id, payload: { [field]: value } });
        setReauthOpen(true);
        return;
      }

      await adminApi.updateUser(id, { [field]: value } as any);
      await fetchUsers();
      setSnack({ open: true, message: 'User updated', severity: 'success' });
    } catch (err: any) {
      setError(err?.message || 'Update failed');
      setSnack({ open: true, message: err?.message || 'Update failed', severity: 'error' });
    }
  };

  const handleOpenEdit = (u: any) => {
    setEditUser({ ...u, password: '' });
    // focus will go to first input via autoFocus on the dialog's email field
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      setLoading(true);
      const payload: any = {
        email: editUser.email,
        username: editUser.username,
        first_name: editUser.first_name,
        last_name: editUser.last_name,
      };
      // Only include elevated flags if they actually changed (prevents unnecessary confirm_password requirement)
      const original = users.find(u => u.id === editUser.id) || {};
      if ((original.is_active ?? false) !== !!editUser.is_active) payload.is_active = !!editUser.is_active;
      if ((original.is_staff ?? false) !== !!editUser.is_staff) payload.is_staff = !!editUser.is_staff;
      if ((original.is_superuser ?? false) !== !!editUser.is_superuser) payload.is_superuser = !!editUser.is_superuser;
      if (editUser.password) payload.password = editUser.password;
      // If editing yourself and critical flags changed, require reauth
      if (editUser.id === user?.id) {
        const criticalChanged = (original.is_staff !== editUser.is_staff) || (original.is_superuser !== editUser.is_superuser) || (original.is_active !== editUser.is_active);
        if (criticalChanged) {
          // If user provided confirm_password in the edit dialog, include it
          if (editUser.confirm_password) payload.confirm_password = editUser.confirm_password;
          setReauthPending({ id: editUser.id, payload });
          setReauthOpen(true);
          setLoading(false);
          return;
        }
      }

      await adminApi.updateUser(editUser.id, payload);
      setEditUser(null);
      await fetchUsers();
      setSnack({ open: true, message: 'User saved', severity: 'success' });
    } catch (err: any) {
      setSnack({ open: true, message: err?.message || 'Save failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (u: any) => setOpenDelete(u);

  const handleConfirmDelete = async () => {
    if (!openDelete) return;
    try {
      setLoading(true);
      // Prevent deleting your own account via UI
      if (openDelete.id === user?.id) {
        setSnack({ open: true, message: 'Cannot delete your own account via admin UI', severity: 'error' });
        setOpenDelete(null);
        setLoading(false);
        return;
      }

      await adminApi.deleteUser(openDelete.id);
      setOpenDelete(null);
      await fetchUsers();
      setSnack({ open: true, message: 'User deleted', severity: 'success' });
    } catch (err: any) {
      setSnack({ open: true, message: err?.message || 'Delete failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReauthSubmit = async () => {
    if (!reauthPending) return;
    try {
      setLoading(true);
      const { id, payload } = reauthPending;
      const sendPayload = { ...payload, confirm_password: reauthPassword };
      await adminApi.updateUser(id, sendPayload);
      setReauthOpen(false);
      setReauthPassword('');
      setReauthPending(null);
      await fetchUsers();
      setSnack({ open: true, message: 'User updated', severity: 'success' });
    } catch (err: any) {
      setSnack({ open: true, message: err?.message || 'Re-auth failed', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReauthClose = () => {
    setReauthOpen(false);
    setReauthPassword('');
    setReauthPending(null);
  };

  const filtered = users.filter(u => u.email.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Users</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search users"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Search size={16} /></InputAdornment>) }}
                sx={{ width: 240 }}
              />
              <Button variant="contained" onClick={() => setOpenCreate(true)}>Create User</Button>
            </Box>
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell scope="col">ID</TableCell>
                <TableCell scope="col">Email</TableCell>
                <TableCell scope="col">Username</TableCell>
                <TableCell scope="col">Created</TableCell>
                <TableCell scope="col">Active</TableCell>
                <TableCell scope="col">Staff</TableCell>
                <TableCell scope="col">Superuser</TableCell>
                <TableCell scope="col">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((u: any) => (
                <TableRow key={u.id} tabIndex={0}>
                  <TableCell><code style={{ fontSize: '0.8rem' }}>{u.id}</code></TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.username || '-'}</TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Switch checked={!!u.is_active} onChange={(e) => toggleFlag(u.id, 'is_active', e.target.checked)} inputProps={{ 'aria-label': `Toggle active for ${u.email}` }} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={!!u.is_staff} onChange={(e) => toggleFlag(u.id, 'is_staff', e.target.checked)} inputProps={{ 'aria-label': `Toggle staff for ${u.email}` }} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={!!u.is_superuser} onChange={(e) => toggleFlag(u.id, 'is_superuser', e.target.checked)} inputProps={{ 'aria-label': `Toggle superuser for ${u.email}` }} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" aria-label={`Edit ${u.email}`} onClick={() => handleOpenEdit(u)}>
                      <Edit3 size={16} />
                    </IconButton>
                    <IconButton size="small" aria-label={`Delete ${u.email}`} onClick={() => handleOpenDelete(u)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Email" aria-label="New user email" type="email" autoComplete="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} sx={{ my: 1 }} />
          <TextField fullWidth label="Password" aria-label="New user password" type="password" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} sx={{ my: 1 }} />
          <FormControlLabel control={<Switch checked={newUser.is_staff} onChange={(e) => setNewUser({ ...newUser, is_staff: e.target.checked })} />} label="Staff" />
          <FormControlLabel control={<Switch checked={newUser.is_superuser} onChange={(e) => setNewUser({ ...newUser, is_superuser: e.target.checked })} />} label="Superuser" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={loading}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          {editUser && (
            <Box sx={{ minWidth: 420 }}>
              <TextField fullWidth label="ID" value={editUser.id} InputProps={{ readOnly: true }} sx={{ my: 1 }} />
              <TextField autoFocus fullWidth label="Email" aria-label="Edit user email" type="email" autoComplete="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} sx={{ my: 1 }} />
              <TextField fullWidth label="Username" aria-label="Edit username" autoComplete="username" value={editUser.username || ''} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} sx={{ my: 1 }} />
              <TextField fullWidth label="First name" aria-label="Edit user first name" autoComplete="given-name" value={editUser.first_name || ''} onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })} sx={{ my: 1 }} />
              <TextField fullWidth label="Last name" aria-label="Edit user last name" autoComplete="family-name" value={editUser.last_name || ''} onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })} sx={{ my: 1 }} />
              <TextField fullWidth label="Created at" value={editUser.created_at ? new Date(editUser.created_at).toLocaleString() : ''} InputProps={{ readOnly: true }} sx={{ my: 1 }} />
              <TextField fullWidth label="Password (leave empty to keep)" aria-label="Edit user password" type="password" autoComplete="new-password" value={editUser.password || ''} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} sx={{ my: 1 }} />
              {/* When editing your own account and changing elevated flags, allow entering current password to confirm */}
              {editUser.id === user?.id && (
                <TextField fullWidth label="Confirm current password (required for flag changes)" aria-label="Confirm current password" type="password" autoComplete="current-password" value={editUser.confirm_password || ''} onChange={(e) => setEditUser({ ...editUser, confirm_password: e.target.value })} sx={{ my: 1 }} />
              )}
              <FormControlLabel control={<Switch checked={!!editUser.is_staff} onChange={(e) => setEditUser({ ...editUser, is_staff: e.target.checked })} />} label="Staff" />
              <FormControlLabel control={<Switch checked={!!editUser.is_superuser} onChange={(e) => setEditUser({ ...editUser, is_superuser: e.target.checked })} />} label="Superuser" />
              <FormControlLabel control={<Switch checked={!!editUser.is_active} onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })} />} label="Active" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={loading}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!openDelete} onClose={() => setOpenDelete(null)}>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{openDelete?.email}</strong>? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={loading}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack?.open} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack?.message} />
      {/* aria-live region for screen reader announcements */}
      <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px, 1px, 1px, 1px)' }}>
        {snack?.open ? snack.message : ''}
      </span>
      {/* Re-auth dialog for self critical changes */}
      <Dialog open={reauthOpen} onClose={handleReauthClose} aria-labelledby="reauth-dialog">
        <DialogTitle id="reauth-dialog">Confirm your password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            For security, please re-enter your password to confirm this change to your own account.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Password"
            type="password"
            autoComplete="current-password"
            fullWidth
            value={reauthPassword}
            onChange={e => setReauthPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReauthClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleReauthSubmit} color="primary" disabled={loading || !reauthPassword}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;
