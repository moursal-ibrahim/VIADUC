import { useEffect, useState } from 'react';
import { Button, TextField, MenuItem, Grid, Box, Typography, Tabs, Tab, Card, CardContent } from '@mui/material';
import { Save, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingScreen from '../../components/common/LoadingScreen';
import { productApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function PricingPage() {
  const [products, setProducts] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [edits, setEdits] = useState({});
  const [wholesale, setWholesale] = useState([]);
  const [wholesaleForm, setWholesaleForm] = useState({ wholesaleName: '', name: '', pricePerKg: '' });
  const [savingWholesale, setSavingWholesale] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ wholesaleName: '', name: '', pricePerKg: '' });
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadWholesale = () => {
    productApi.wholesalePricing()
      .then((res) => setWholesale(res.data))
      .catch(() => setWholesale([]));
  };

  useEffect(() => {
    Promise.all([productApi.list(), productApi.pricing(), productApi.wholesalePricing().catch(() => ({ data: [] }))])
      .then(([prod, price, ws]) => {
        setProducts(prod.data);
        setPricing(price.data);
        setWholesale(ws.data);
        const map = {};
        price.data.forEach((p) => { map[p.productId] = p.pricePerKg; });
        setEdits(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (productId) => {
    try {
      await productApi.upsertPricing({ productId, pricePerKg: Number(edits[productId]), currency: 'DJF' });
      toast.success('Price updated');
    } catch {
      toast.error('Failed to update price');
    }
  };

  const handleAddWholesale = async (e) => {
    e.preventDefault();
    if (!wholesaleForm.wholesaleName.trim() || !wholesaleForm.name || wholesaleForm.pricePerKg === '') {
      toast.error('Wholesale name, material, and price are required');
      return;
    }
    setSavingWholesale(true);
    try {
      await productApi.createWholesalePricing({
        wholesaleName: wholesaleForm.wholesaleName.trim(),
        name: wholesaleForm.name,
        pricePerKg: Number(wholesaleForm.pricePerKg),
        currency: 'DJF',
      });
      toast.success('Wholesale price added');
      setWholesaleForm({ wholesaleName: '', name: '', pricePerKg: '' });
      loadWholesale();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add wholesale price');
    } finally {
      setSavingWholesale(false);
    }
  };

  const handleDeleteWholesale = async (id) => {
    try {
      await productApi.deleteWholesalePricing(id);
      toast.success('Material removed');
      loadWholesale();
    } catch {
      toast.error('Failed to remove material');
    }
  };

  const handleStartEdit = (row) => {
    setEditingId(row.id);
    setEditForm({ wholesaleName: row.wholesaleName || '', name: row.name, pricePerKg: row.pricePerKg });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ wholesaleName: '', name: '', pricePerKg: '' });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.wholesaleName.trim() || !editForm.name || editForm.pricePerKg === '') {
      toast.error('Wholesale name, material, and price are required');
      return;
    }
    try {
      await productApi.updateWholesalePricing(id, {
        wholesaleName: editForm.wholesaleName.trim(),
        name: editForm.name,
        pricePerKg: Number(editForm.pricePerKg),
      });
      toast.success('Material updated');
      handleCancelEdit();
      loadWholesale();
    } catch {
      toast.error('Failed to update material');
    }
  };

  const rows = products.map((p) => {
    const price = pricing.find((x) => x.productId === p.id);
    return { ...p, pricePerKg: price?.pricePerKg || edits[p.id] || 0 };
  });

  const columns = [
    { field: 'name', headerName: 'Product' },
    { field: 'category', headerName: 'Category' },
    {
      field: 'pricePerKg',
      headerName: 'Price per KG',
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            size="small"
            type="number"
            value={edits[row.id] ?? row.pricePerKg}
            onChange={(e) => setEdits({ ...edits, [row.id]: e.target.value })}
            sx={{ width: 100 }}
          />
          <Button size="small" variant="outlined" onClick={() => handleSave(row.id)}>
            <Save size={14} />
          </Button>
        </Box>
      ),
    },
    {
      field: 'value',
      headerName: 'Current Price',
      renderCell: ({ row }) => formatCurrency(edits[row.id] ?? row.pricePerKg),
    },
  ];

  const wholesaleColumns = [
    {
      field: 'wholesaleName',
      headerName: 'Wholesale Name',
      renderCell: ({ row }) =>
        editingId === row.id ? (
          <TextField
            size="small"
            value={editForm.wholesaleName}
            onChange={(e) => setEditForm({ ...editForm, wholesaleName: e.target.value })}
            sx={{ minWidth: 140 }}
          />
        ) : (
          row.wholesaleName
        ),
    },
    {
      field: 'name',
      headerName: 'Material',
      renderCell: ({ row }) =>
        editingId === row.id ? (
          <TextField
            select
            size="small"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            sx={{ minWidth: 140 }}
          >
            {products.map((p) => (
              <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
            ))}
          </TextField>
        ) : (
          row.name
        ),
    },
    {
      field: 'pricePerKg',
      headerName: 'Price per KG',
      renderCell: ({ row, value }) =>
        editingId === row.id ? (
          <TextField
            size="small"
            type="number"
            value={editForm.pricePerKg}
            onChange={(e) => setEditForm({ ...editForm, pricePerKg: e.target.value })}
            sx={{ width: 110 }}
            inputProps={{ min: 0, step: 0.01 }}
          />
        ) : (
          formatCurrency(value)
        ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {editingId === row.id ? (
            <>
              <Button size="small" variant="contained" onClick={() => handleSaveEdit(row.id)}>
                Save
              </Button>
              <Button size="small" variant="outlined" color="inherit" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Pencil size={14} />}
                onClick={() => handleStartEdit(row)}
              >
                Modify
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={14} />}
                onClick={() => handleDeleteWholesale(row.id)}
              >
                Remove
              </Button>
            </>
          )}
        </Box>
      ),
    },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <PageHeader title="Product Pricing" subtitle="Set retail and wholesale prices per kilogram for each material" />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Retail Pricing" />
        <Tab label="Wholesale Pricing" />
      </Tabs>

      {tab === 0 && (
        <DataTable columns={columns} rows={rows} searchFields={['name', 'category']} searchable />
      )}

      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Add Wholesale Material
              </Typography>
              <Box component="form" onSubmit={handleAddWholesale}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Wholesale Name"
                      value={wholesaleForm.wholesaleName}
                      onChange={(e) => setWholesaleForm({ ...wholesaleForm, wholesaleName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Material"
                      value={wholesaleForm.name}
                      onChange={(e) => setWholesaleForm({ ...wholesaleForm, name: e.target.value })}
                    >
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Price per KG"
                      value={wholesaleForm.pricePerKg}
                      onChange={(e) => setWholesaleForm({ ...wholesaleForm, pricePerKg: e.target.value })}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      startIcon={<Plus size={16} />}
                      disabled={savingWholesale}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>

          <DataTable
            columns={wholesaleColumns}
            rows={wholesale}
            searchFields={['wholesaleName', 'name']}
            searchable
            emptyMessage="No wholesale prices added yet"
          />
        </Box>
      )}
    </Box>
  );
}
