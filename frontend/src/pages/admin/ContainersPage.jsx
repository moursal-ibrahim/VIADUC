import { useEffect, useState } from 'react';
import { Button, Chip, Grid, TextField, MenuItem, Box, IconButton, Typography, Divider } from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import LoadingScreen from '../../components/common/LoadingScreen';
import { containerApi, productApi } from '../../services/api';
import { formatDate, formatWeight, formatDJF, CONTAINER_STATUSES } from '../../utils/formatters';

const statusColors = { Pending: 'warning', Loading: 'info', Exported: 'primary', Delivered: 'success' };

const emptyForm = {
  startDate: '',
  portDate: '',
  totalExpense: '',
  destination: '',
  sellingValue: '',
  status: 'Pending',
  items: [{ productId: '', weight: '' }],
};

export default function ContainersPage() {
  const [containers, setContainers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    Promise.all([containerApi.list(), productApi.list()])
      .then(([cont, prod]) => {
        setContainers(cont.data);
        setProducts(prod.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const updateItem = (index, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  };

  const addItemRow = () => {
    setForm((f) => ({ ...f, items: [...f.items, { productId: '', weight: '' }] }));
  };

  const removeItemRow = (index) => {
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== index) : f.items,
    }));
  };

  const handleCreate = async () => {
    const validItems = form.items
      .filter((it) => it.productId && it.weight)
      .map((it) => ({
        productId: it.productId,
        productName: products.find((p) => p.id === it.productId)?.name || '',
        weight: Number(it.weight),
      }));

    if (!form.startDate || validItems.length === 0) {
      toast.error('Start date and at least one material with weight are required');
      return;
    }

    const totalWeight = validItems.reduce((s, it) => s + it.weight, 0);

    try {
      await containerApi.create({
        startDate: form.startDate,
        portDate: form.portDate,
        totalExpense: Number(form.totalExpense) || 0,
        destination: form.destination,
        sellingValue: Number(form.sellingValue) || 0,
        status: form.status,
        items: validItems,
        totalWeight,
      });
      toast.success('Shipping process saved');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const columns = [
    { field: 'startDate', headerName: 'Start Date', renderCell: ({ value }) => formatDate(value) },
    { field: 'portDate', headerName: 'Port Date', renderCell: ({ value }) => (value ? formatDate(value) : '—') },
    {
      field: 'items',
      headerName: 'Materials',
      sortable: false,
      renderCell: ({ row }) =>
        (row.items || []).map((it) => it.productName).filter(Boolean).join(', ') || '—',
    },
    { field: 'totalWeight', headerName: 'Total Weight', renderCell: ({ value }) => formatWeight(value || 0) },
    { field: 'destination', headerName: 'Destination', renderCell: ({ value }) => value || '—' },
    { field: 'totalExpense', headerName: 'Process Fees', renderCell: ({ value }) => formatDJF(value || 0) },
    { field: 'sellingValue', headerName: 'Selling Value', renderCell: ({ value }) => formatDJF(value || 0) },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: ({ value }) => <Chip label={value} size="small" color={statusColors[value] || 'default'} />,
    },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <PageHeader
        title="Trade Logistics"
        subtitle="Track shipping processes and export status"
        action={<Button variant="contained" startIcon={<Plus size={18} />} onClick={openModal}>Shipping Process</Button>}
      />
      <DataTable columns={columns} rows={containers} searchFields={['status']} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Shipping Process"
        actions={<><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleCreate}>Save</Button></>}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="date" label="Start Date" InputLabelProps={{ shrink: true }}
              value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="date" label="Enter Port Date" InputLabelProps={{ shrink: true }}
              value={form.portDate} onChange={(e) => setForm({ ...form, portDate: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="number" label="Total Expense (Process Fees)"
              value={form.totalExpense} onChange={(e) => setForm({ ...form, totalExpense: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Destination"
              value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
              placeholder="e.g. China, UAE"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="number" label="Selling Value (DJF)"
              value={form.sellingValue} onChange={(e) => setForm({ ...form, sellingValue: e.target.value })}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {CONTAINER_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>Materials Shipping</Typography>
              <Button size="small" startIcon={<Plus size={14} />} onClick={addItemRow}>Add Material</Button>
            </Box>
          </Grid>

          {form.items.map((item, index) => (
            <Grid item xs={12} key={index}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  select fullWidth size="small" label="Material"
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                >
                  {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
                <TextField
                  size="small" type="number" label="Weight (KG)"
                  value={item.weight}
                  onChange={(e) => updateItem(index, 'weight', e.target.value)}
                  sx={{ width: 140, flexShrink: 0 }}
                  inputProps={{ min: 0, step: 0.1 }}
                />
                <IconButton
                  size="small" color="error" onClick={() => removeItemRow(index)}
                  disabled={form.items.length === 1}
                  aria-label="Remove material"
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Modal>
    </Box>
  );
}
