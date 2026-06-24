import { useEffect, useState } from 'react';
import { Button, Chip, TextField, MenuItem, Grid, Box } from '@mui/material';
import { Plus, Wallet, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import LoadingScreen from '../../components/common/LoadingScreen';
import { usersApi, warehouseApi, analyticsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatters';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'seller', warehouseId: '', password: '' });
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [fundForm, setFundForm] = useState({ sellerId: '', sellerName: '', amount: '', notes: '' });
  const [funding, setFunding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { user: currentUser } = useAuth();

  const load = () => {
    Promise.all([usersApi.list(), warehouseApi.list()])
      .then(([u, w]) => { setUsers(u.data); setWarehouses(w.data); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.email || !form.name || !form.password) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await usersApi.create(form);
      toast.success('User created');
      setModalOpen(false);
      setForm({ email: '', name: '', role: 'seller', warehouseId: '', password: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openFundModal = (seller) => {
    setFundForm({ sellerId: seller?.id || '', sellerName: seller?.name || '', amount: '', notes: '' });
    setFundModalOpen(true);
  };

  const handleFund = async () => {
    if (!fundForm.sellerId || !fundForm.amount || Number(fundForm.amount) <= 0) {
      toast.error('Select a seller and enter a positive amount');
      return;
    }
    setFunding(true);
    try {
      await analyticsApi.fundSeller({
        sellerId: fundForm.sellerId,
        amount: Number(fundForm.amount),
        notes: fundForm.notes,
      });
      toast.success(`Sent ${formatCurrency(fundForm.amount)} to seller`);
      setFundModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fund seller');
    } finally {
      setFunding(false);
    }
  };

  const handleDelete = async (row) => {
    if (row.id === currentUser?.id) {
      toast.error('You cannot remove your own account');
      return;
    }
    if (!window.confirm(`Remove ${row.name} (${row.email})? This cannot be undone.`)) {
      return;
    }
    setDeletingId(row.id);
    try {
      await usersApi.delete(row.id);
      toast.success('User removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove user');
    } finally {
      setDeletingId(null);
    }
  };

  const sellers = users.filter((u) => u.role === 'seller');

  const columns = [
    { field: 'name', headerName: 'Name' },
    { field: 'email', headerName: 'Email' },
    {
      field: 'role',
      headerName: 'Role',
      renderCell: ({ value }) => (
        <Chip label={value} size="small" color={value === 'admin' ? 'primary' : 'success'} />
      ),
    },
    { field: 'warehouseId', headerName: 'Warehouse' },
    {
      field: 'disabled',
      headerName: 'Status',
      renderCell: ({ value }) => (
        <Chip label={value ? 'Disabled' : 'Active'} size="small" color={value ? 'error' : 'success'} />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {row.role === 'seller' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Wallet size={14} />}
              onClick={() => openFundModal(row)}
            >
              Fund
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={14} />}
            onClick={() => handleDelete(row)}
            disabled={deletingId === row.id || row.id === currentUser?.id}
          >
            Remove
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Manage admin and seller accounts"
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<Wallet size={18} />} onClick={() => openFundModal(null)}>Fund Seller</Button>
            <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => setModalOpen(true)}>Add User</Button>
          </Box>
        }
      />
      <DataTable columns={columns} rows={users} searchFields={['name', 'email', 'role']} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add User"
        actions={<><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleCreate}>Create</Button></>}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}><TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} helperText="The user logs in with this email" /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} helperText="Minimum 6 characters" /></Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <MenuItem value="admin">Admin / Owner</MenuItem>
              <MenuItem value="seller">Seller / Stock Worker</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Warehouse" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </Modal>

      <Modal
        open={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        title="Fund Seller"
        actions={<><Button onClick={() => setFundModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleFund} disabled={funding}>Send Funds</Button></>}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Seller"
              value={fundForm.sellerId}
              onChange={(e) => {
                const s = sellers.find((u) => u.id === e.target.value);
                setFundForm({ ...fundForm, sellerId: e.target.value, sellerName: s?.name || '' });
              }}
            >
              {sellers.length === 0 && <MenuItem value="" disabled>No sellers available</MenuItem>}
              {sellers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} ({s.email})</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              type="number"
              label="Amount"
              value={fundForm.amount}
              onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes (optional)"
              value={fundForm.notes}
              onChange={(e) => setFundForm({ ...fundForm, notes: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </Modal>
    </Box>
  );
}
