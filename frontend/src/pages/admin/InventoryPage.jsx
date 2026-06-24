import { useEffect, useState, useMemo } from 'react';
import { Button, Chip, Grid, TextField, MenuItem, Box, Typography, Divider } from '@mui/material';
import { toast } from 'react-toastify';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import LoadingScreen from '../../components/common/LoadingScreen';
import InventoryOverview from '../../components/inventory/InventoryOverview';
import { inventoryApi, productApi, warehouseApi, financeApi, analyticsApi } from '../../services/api';
import { formatDate, formatWeight, formatCurrency } from '../../utils/formatters';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recordsWarehouseFilter, setRecordsWarehouseFilter] = useState('all');
  const [form, setForm] = useState({ productId: '', warehouseId: '', quantity: '', weight: '', type: 'incoming' });
  const [transferForm, setTransferForm] = useState({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', weight: '' });

  const load = () => {
    Promise.all([
      inventoryApi.list(),
      productApi.list(),
      warehouseApi.list(),
      inventoryApi.lowStock().catch(() => ({ data: [] })),
      financeApi.expenses().catch(() => ({ data: [] })),
      productApi.pricing().catch(() => ({ data: [] })),
    ]).then(([inv, prod, wh, alert, exp, pr]) => {
      setItems(inv.data);
      setProducts(prod.data);
      setWarehouses(wh.data);
      setAlerts(alert.data);
      setExpenses(exp.data);
      setPricing(pr.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    try {
      if (!form.productId || !form.warehouseId || !form.weight) {
        toast.error('Product, warehouse, and weight are required');
        return;
      }
      const weight = Number(form.weight);
      const pricePerKg = pricing.find((p) => p.productId === form.productId)?.pricePerKg || 0;
      const collectedMoney = weight * pricePerKg;

      if (form.type === 'incoming') {
        await analyticsApi.createEntry({
          productId: form.productId,
          warehouseId: form.warehouseId,
          quantity: Number(form.quantity) || 1,
          weight,
          pricePerKg,
          collectedMoney,
          sellerType: 'retail',
          notes: 'Admin purchase',
        });
        toast.success('Purchase recorded — visible on seller dashboard');
      } else {
        await inventoryApi.create({
          ...form,
          quantity: Number(form.quantity),
          weight,
        });
        toast.success('Outgoing stock recorded');
      }
      setModalOpen(false);
      setForm({ productId: '', warehouseId: '', quantity: '', weight: '', type: 'incoming' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transferForm.productId || !transferForm.fromWarehouseId || !transferForm.toWarehouseId) {
        toast.error('Select product, source and destination');
        return;
      }
      if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
        toast.error('Source and destination must be different');
        return;
      }
      await inventoryApi.transfer({
        ...transferForm,
        weight: Number(transferForm.weight),
        quantity: transferForm.quantity === '' ? undefined : Number(transferForm.quantity),
      });
      toast.success('Stock transferred');
      setTransferOpen(false);
      setTransferForm({ productId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', weight: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    }
  };

  const availableStock = useMemo(() => {
    if (!transferForm.productId || !transferForm.fromWarehouseId) return 0;
    return items
      .filter(
        (i) =>
          i.productId === transferForm.productId &&
          i.warehouseId === transferForm.fromWarehouseId &&
          (i.status === 'in_stock' || i.status === undefined)
      )
      .reduce((s, i) => s + (i.weight || 0), 0);
  }, [items, transferForm.productId, transferForm.fromWarehouseId]);

  const filteredItems = useMemo(() => {
    let data = items;
    if (recordsWarehouseFilter !== 'all') {
      data = data.filter((i) => i.warehouseId === recordsWarehouseFilter);
    }
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (i) =>
        i.productName?.toLowerCase().includes(q) ||
        i.warehouseName?.toLowerCase().includes(q) ||
        i.status?.toLowerCase().includes(q)
    );
  }, [items, search, recordsWarehouseFilter]);

  const WAREHOUSE_FILTER_OPTIONS = [
    { value: 'all', label: 'All Warehouses' },
    { value: 'wh_main', label: 'TORABORA' },
    { value: 'wh_secondary_1', label: 'PK12' },
    { value: 'wh_secondary_2', label: 'JAJAB' },
  ];

  const columns = [
    { field: 'productName', headerName: 'Product' },
    { field: 'warehouseName', headerName: 'Warehouse' },
    { field: 'quantity', headerName: 'Qty' },
    { field: 'weight', headerName: 'Weight', renderCell: ({ value }) => formatWeight(value) },
    { field: 'value', headerName: 'Value', renderCell: ({ value, row }) => (row.isOpeningStock ? '—' : formatCurrency(value)) },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: ({ value, row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip label={value} size="small" color={value === 'in_stock' ? 'success' : 'default'} />
          {row.isOpeningStock && (
            <Chip label="Opening stock" size="small" color="info" variant="outlined" />
          )}
        </Box>
      ),
    },
    { field: 'createdAt', headerName: 'Date', renderCell: ({ value }) => formatDate(value) },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <InventoryOverview
        items={items}
        products={products}
        alerts={alerts}
        expenses={expenses}
        onAddStock={() => setModalOpen(true)}
        search={search}
        onSearchChange={setSearch}
      />

      <Divider sx={{ mb: 3 }} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 2,
          gap: 1.5,
        }}
      >
        <Typography variant="h6" fontWeight={600}>
          Inventory Records
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outlined" size="small" onClick={() => setTransferOpen(true)}>
            Transfer Stock
          </Button>
          <TextField
            select
            size="small"
            label="Warehouse"
            value={recordsWarehouseFilter}
            onChange={(e) => setRecordsWarehouseFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 160 } }}
          >
            {WAREHOUSE_FILTER_OPTIONS.map((wh) => (
              <MenuItem key={wh.value} value={wh.value}>
                {wh.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>
      <DataTable
        columns={columns}
        rows={filteredItems}
        searchFields={['productName', 'warehouseName', 'status']}
        searchable={false}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Purchase / Stock"
        actions={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate}>Save</Button>
          </>
        }
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField select fullWidth label="Product" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Warehouse" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Weight (KG)" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <MenuItem value="incoming">Incoming</MenuItem>
              <MenuItem value="outgoing">Outgoing</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Modal>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer Stock Between Warehouses"
        actions={
          <>
            <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleTransfer}>Transfer</Button>
          </>
        }
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid item xs={12}>
            <TextField select fullWidth label="Product" value={transferForm.productId} onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}>
              {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="From warehouse" value={transferForm.fromWarehouseId} onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="To warehouse" value={transferForm.toWarehouseId} onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth type="number" label="Weight (KG)"
              value={transferForm.weight}
              onChange={(e) => setTransferForm({ ...transferForm, weight: e.target.value })}
              helperText={transferForm.fromWarehouseId && transferForm.productId ? `Available: ${formatWeight(availableStock)}` : ' '}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Quantity (optional)" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })} />
          </Grid>
        </Grid>
      </Modal>
    </Box>
  );
}
