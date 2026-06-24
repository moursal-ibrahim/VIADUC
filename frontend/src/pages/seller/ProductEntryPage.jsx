import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { CheckCircle, Store, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { analyticsApi, productApi, warehouseApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatWeight } from '../../utils/formatters';

const emptyForm = {
  sellerType: 'retail',
  productId: '',
  wholesaleName: '',
  warehouseId: '',
  quantity: '',
  weight: '',
  notes: '',
};

export default function ProductEntryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [retailPricing, setRetailPricing] = useState([]);
  const [wholesale, setWholesale] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, warehouseId: user?.warehouseId || '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      productApi.list(),
      warehouseApi.list(),
      productApi.pricing().catch(() => ({ data: [] })),
      productApi.wholesalePricing().catch(() => ({ data: [] })),
    ]).then(([p, w, pr, ws]) => {
      setProducts(p.data);
      setWarehouses(w.data);
      setRetailPricing(pr.data);
      setWholesale(ws.data);
      setForm((f) => ({ ...f, warehouseId: user?.warehouseId || w.data[0]?.id || '' }));
    });
  }, [user?.warehouseId]);

  const wholesalerNames = useMemo(() => {
    const names = [...new Set(wholesale.map((w) => w.wholesaleName).filter(Boolean))];
    return names.sort((a, b) => a.localeCompare(b));
  }, [wholesale]);

  const wholesaleProducts = useMemo(() => {
    if (form.sellerType !== 'wholesale' || !form.wholesaleName) return products;
    const pricedMaterials = wholesale
      .filter((w) => w.wholesaleName === form.wholesaleName)
      .map((w) => w.name);
    return products.filter((p) => pricedMaterials.includes(p.name));
  }, [form.sellerType, form.wholesaleName, wholesale, products]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId),
    [products, form.productId],
  );

  const selectedWholesalePrice = useMemo(() => {
    if (form.sellerType !== 'wholesale' || !form.wholesaleName || !selectedProduct) return null;
    return wholesale.find(
      (w) => w.wholesaleName === form.wholesaleName && w.name === selectedProduct.name,
    );
  }, [form.sellerType, form.wholesaleName, selectedProduct, wholesale]);

  const warehouse = useMemo(
    () => warehouses.find((w) => w.id === form.warehouseId),
    [warehouses, form.warehouseId],
  );

  const pricePerKg = useMemo(() => {
    if (!selectedProduct) return 0;
    if (form.sellerType === 'retail') {
      return retailPricing.find((x) => x.productId === form.productId)?.pricePerKg || 0;
    }
    return selectedWholesalePrice?.pricePerKg || 0;
  }, [selectedProduct, form.sellerType, form.productId, selectedWholesalePrice, retailPricing]);

  const totalAmount = (Number(form.weight) || 0) * pricePerKg;

  const setSellerType = (type) => {
    if (!type) return;
    setForm((f) => ({ ...f, sellerType: type, wholesaleName: '', productId: '' }));
  };

  const setWholesaleName = (wholesaleName) => {
    setForm((f) => ({ ...f, wholesaleName, productId: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.warehouseId || !form.weight) {
      toast.error('Product, warehouse, and weight are required');
      return;
    }
    if (form.sellerType === 'wholesale' && !form.wholesaleName) {
      toast.error('Select the wholesale buyer');
      return;
    }
    setSubmitting(true);
    try {
      await analyticsApi.createEntry({
        sellerType: form.sellerType,
        productId: form.productId,
        wholesaleName: form.sellerType === 'wholesale' ? form.wholesaleName : null,
        warehouseId: form.warehouseId,
        quantity: Number(form.quantity) || 1,
        weight: Number(form.weight),
        pricePerKg,
        collectedMoney: totalAmount,
        notes: form.notes,
      });
      toast.success('Purchase recorded successfully!');
      setForm({ ...emptyForm, warehouseId: user?.warehouseId || warehouses[0]?.id || '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Quick Purchase</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Record a purchased material and auto-calculate its cost
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2.5}>
          {/* 1. Seller type */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Seller type</Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              value={form.sellerType}
              onChange={(_, v) => setSellerType(v)}
              sx={{ '& .MuiToggleButton-root': { py: 1.2, textTransform: 'none', gap: 1 } }}
            >
              <ToggleButton value="retail"><Store size={18} /> Retail seller</ToggleButton>
              <ToggleButton value="wholesale"><Building2 size={18} /> Wholesale seller</ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          {/* 2. Wholesale buyer — wholesale only (admin-defined names + prices) */}
          {form.sellerType === 'wholesale' && (
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Wholesale buyer"
                value={form.wholesaleName}
                onChange={(e) => setWholesaleName(e.target.value)}
                required
                helperText={
                  wholesalerNames.length === 0
                    ? 'No wholesalers configured yet — ask admin to add them in Pricing → Wholesale'
                    : 'Select the wholesaler defined by admin'
                }
              >
                {wholesalerNames.length === 0 && (
                  <MenuItem value="" disabled>No wholesalers available</MenuItem>
                )}
                {wholesalerNames.map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/* 3. Product */}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Product"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
              disabled={form.sellerType === 'wholesale' && !form.wholesaleName}
              helperText={
                form.sellerType === 'wholesale' && form.wholesaleName && wholesaleProducts.length === 0
                  ? 'This wholesaler has no materials priced yet'
                  : form.sellerType === 'wholesale' && !form.wholesaleName
                    ? 'Select a wholesale buyer first'
                    : undefined
              }
            >
              {(form.sellerType === 'wholesale' ? wholesaleProducts : products).map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Show admin-fixed price for selected wholesaler + material */}
          {form.sellerType === 'wholesale' && selectedWholesalePrice && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Admin price for <strong>{form.wholesaleName}</strong> · {selectedProduct?.name}:{' '}
                <strong>{formatCurrency(selectedWholesalePrice.pricePerKg)}/kg</strong>
              </Typography>
            </Grid>
          )}

          {/* 4. Warehouse — auto */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Warehouse"
              value={warehouse?.name || 'Auto-assigned'}
              disabled
              helperText="Automatically assigned to your account"
            />
          </Grid>

          {/* 5. Quantity + Weight */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Weight (KG)"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.1 }}
            />
          </Grid>

          {/* 6. Auto-calculated cost */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Price per kg</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {pricePerKg > 0 ? `${formatCurrency(pricePerKg)}/kg` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Weight</Typography>
                  <Typography variant="body2" fontWeight={600}>{formatWeight(Number(form.weight) || 0)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Total cost</Typography>
                  <Typography variant="h6" fontWeight={700} color="primary.main">
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
                {form.productId && pricePerKg === 0 && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                    {form.sellerType === 'retail'
                      ? 'No retail price set for this product — set it in admin Pricing.'
                      : 'Select a wholesale buyer with a defined price.'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={<CheckCircle size={22} />}
              sx={{ py: 2, fontSize: 17, borderRadius: 3 }}
            >
              {submitting ? 'Submitting...' : 'Submit Purchase'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
