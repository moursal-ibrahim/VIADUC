import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { Save, PackageOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { openingStockApi, productApi, warehouseApi } from '../../services/api';
import { formatDJF } from '../../utils/formatters';

const DEFAULT_OPENING_DATE = '2026-06-02';

function emptyLines(products) {
  const lines = {};
  products.forEach((p) => {
    lines[p.id] = { weight: '', quantity: '' };
  });
  return lines;
}

function emptyWarehouseState(warehouses, products) {
  const state = {};
  warehouses.forEach((wh) => {
    state[wh.id] = { cashBalance: '', lines: emptyLines(products) };
  });
  return state;
}

export default function OpeningStockPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [openingDate, setOpeningDate] = useState(DEFAULT_OPENING_DATE);
  const [whState, setWhState] = useState({});
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      productApi.list(),
      warehouseApi.list(),
      openingStockApi.status(),
    ])
      .then(([prod, wh, status]) => {
        setProducts(prod.data);
        setWarehouses(wh.data);
        const base = emptyWarehouseState(wh.data, prod.data);
        const data = status.data;

        if (data?.configured) {
          setConfigured(true);
          if (data.openingDate) {
            setOpeningDate(data.openingDate.split('T')[0]);
          }
          (data.balances || []).forEach((b) => {
            if (base[b.warehouseId]) {
              base[b.warehouseId].cashBalance = String(b.cashBalance ?? '');
            }
          });
          (data.stock || []).forEach((s) => {
            if (base[s.warehouseId]?.lines[s.productId]) {
              base[s.warehouseId].lines[s.productId] = {
                weight: s.weight ? String(s.weight) : '',
                quantity: s.quantity ? String(s.quantity) : '',
              };
            }
          });
        }
        setWhState(base);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    let stockLines = 0;
    let totalWeight = 0;
    let totalCash = 0;
    warehouses.forEach((wh) => {
      const block = whState[wh.id];
      if (!block) return;
      totalCash += Number(block.cashBalance) || 0;
      products.forEach((p) => {
        const w = Number(block.lines[p.id]?.weight) || 0;
        if (w > 0) {
          stockLines += 1;
          totalWeight += w;
        }
      });
    });
    return { stockLines, totalWeight, totalCash };
  }, [whState, warehouses, products]);

  const updateLine = (warehouseId, productId, field, value) => {
    setWhState((prev) => ({
      ...prev,
      [warehouseId]: {
        ...prev[warehouseId],
        lines: {
          ...prev[warehouseId].lines,
          [productId]: { ...prev[warehouseId].lines[productId], [field]: value },
        },
      },
    }));
  };

  const updateCash = (warehouseId, value) => {
    setWhState((prev) => ({
      ...prev,
      [warehouseId]: { ...prev[warehouseId], cashBalance: value },
    }));
  };

  const handleSave = async () => {
    if (!window.confirm(
      configured
        ? 'Replace the current opening snapshot? Real operations after this date are kept.'
        : 'Save official opening stock? No prices will be invented — only real quantities and balances.',
    )) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        openingDate,
        warehouses: warehouses.map((wh) => ({
          warehouseId: wh.id,
          cashBalance: Number(whState[wh.id]?.cashBalance) || 0,
          stock: products
            .map((p) => ({
              productId: p.id,
              weight: Number(whState[wh.id]?.lines[p.id]?.weight) || 0,
              quantity: Number(whState[wh.id]?.lines[p.id]?.quantity) || 0,
            }))
            .filter((l) => l.weight > 0 || l.quantity > 0),
        })),
      };

      await openingStockApi.saveSnapshot(payload);
      setConfigured(true);
      toast.success('Opening stock saved — digital tracking starts from this date');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save opening stock');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading opening stock..." />;

  return (
    <Box>
      <PageHeader
        title="Opening Stock"
        subtitle="Official starting point — real quantities and balances only (no invented prices or fake purchases)"
        action={
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSave}
            disabled={saving}
          >
            Save Opening Snapshot
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Stock initial saisi manuellement.</strong> Enter what you physically have today.
        The system does <strong>not</strong> create fake old purchases or estimated prices.
        From the opening date forward, every purchase is traced with real price, date, and user.
      </Alert>

      {configured && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Opening snapshot already configured. You can update it — tracked operations after the opening date are not deleted.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Opening date (official start)"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Typography variant="body2"><strong>{summary.stockLines}</strong> stock lines</Typography>
                <Typography variant="body2"><strong>{summary.totalWeight.toLocaleString()}</strong> kg total</Typography>
                <Typography variant="body2"><strong>{formatDJF(summary.totalCash)}</strong> total cash</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {warehouses.map((wh) => (
        <Card key={wh.id} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PackageOpen size={20} />
              <Typography variant="h6" fontWeight={700}>{wh.name}</Typography>
            </Box>

            <TextField
              fullWidth
              type="number"
              label="Remaining cash balance (DJF)"
              value={whState[wh.id]?.cashBalance ?? ''}
              onChange={(e) => updateCash(wh.id, e.target.value)}
              sx={{ mb: 3, maxWidth: 320 }}
              inputProps={{ min: 0 }}
              helperText="Real balance from your notebook — not calculated from fake purchases"
            />

            <Grid container spacing={1} sx={{ mb: 1, display: { xs: 'none', sm: 'flex' } }}>
              <Grid item xs={5}><Typography variant="caption" color="text.secondary">Material</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Weight (kg)</Typography></Grid>
              <Grid item xs={3}><Typography variant="caption" color="text.secondary">Quantity (units)</Typography></Grid>
            </Grid>
            <Divider sx={{ mb: 2, display: { xs: 'none', sm: 'block' } }} />

            {products.map((p) => (
              <Grid container spacing={2} key={p.id} sx={{ mb: 1.5 }} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Weight"
                    value={whState[wh.id]?.lines[p.id]?.weight ?? ''}
                    onChange={(e) => updateLine(wh.id, p.id, 'weight', e.target.value)}
                    inputProps={{ min: 0, step: 0.1 }}
                    InputLabelProps={{ shrink: true, sx: { display: { sm: 'none' } } }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Qty"
                    value={whState[wh.id]?.lines[p.id]?.quantity ?? ''}
                    onChange={(e) => updateLine(wh.id, p.id, 'quantity', e.target.value)}
                    inputProps={{ min: 0 }}
                    InputLabelProps={{ shrink: true, sx: { display: { sm: 'none' } } }}
                    helperText={p.category === 'battery' ? 'For batteries' : undefined}
                  />
                </Grid>
              </Grid>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card sx={{ bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Paper archives (optional)</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep photos or PDFs of old notebooks outside the system (Google Drive, folder, etc.).
            Do not enter old notebook data into purchases — only this opening snapshot + real operations from the opening date.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
