import { useEffect, useState, useMemo } from 'react';
import {
  Grid, Card, CardContent, Typography, Chip, Box, TextField, MenuItem,
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ChartContainer, chartColors, ChartTooltip } from '../../components/charts/ChartWrapper';
import { warehouseApi, productApi, inventoryApi } from '../../services/api';
import { formatCurrency, formatWeight } from '../../utils/formatters';

const WAREHOUSE_LABELS = {
  wh_main: 'TORABORA',
  wh_secondary_1: 'PK12',
  wh_secondary_2: 'JAJAB',
};

const warehouseLabel = (wh) => WAREHOUSE_LABELS[wh.id] || wh.name;

function buildAnalytics(warehouses, inventory) {
  return warehouses.map((wh) => {
    const items = inventory.filter((i) => i.warehouseId === wh.id);
    return {
      warehouseId: wh.id,
      name: warehouseLabel(wh),
      type: wh.type,
      totalWeight: items.reduce((s, i) => s + (i.weight || 0), 0),
      totalQuantity: items.reduce((s, i) => s + (i.quantity || 0), 0),
      totalValue: items.reduce((s, i) => s + (i.value || 0), 0),
      itemCount: items.length,
    };
  });
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [materialFilter, setMaterialFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      warehouseApi.list(),
      inventoryApi.list(),
      productApi.list(),
    ])
      .then(([wh, inv, prod]) => {
        setWarehouses(wh.data);
        setInventory(inv.data);
        setProducts(prod.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredInventory = useMemo(() => {
    if (materialFilter === 'all') return inventory;
    return inventory.filter((i) => i.productId === materialFilter);
  }, [inventory, materialFilter]);

  const analytics = useMemo(
    () => buildAnalytics(warehouses, filteredInventory),
    [warehouses, filteredInventory]
  );

  const selectedMaterialName =
    materialFilter === 'all'
      ? null
      : products.find((p) => p.id === materialFilter)?.name;

  const analyticsColumns = [
    { field: 'name', headerName: 'Warehouse' },
    { field: 'itemCount', headerName: 'Items' },
    { field: 'totalQuantity', headerName: 'Quantity' },
    { field: 'totalWeight', headerName: 'Weight', renderCell: ({ value }) => formatWeight(value) },
    { field: 'totalValue', headerName: 'Value', renderCell: ({ value }) => formatCurrency(value) },
  ];

  const materialFilterControl = (
    <TextField
      select
      size="small"
      label="Filter by Material"
      value={materialFilter}
      onChange={(e) => setMaterialFilter(e.target.value)}
      sx={{ minWidth: { xs: '100%', sm: 220 } }}
    >
      <MenuItem value="all">All Materials</MenuItem>
      {products.map((p) => (
        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
      ))}
    </TextField>
  );

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <PageHeader
        title="Warehouse Management"
        subtitle={
          selectedMaterialName
            ? `Multi-warehouse inventory and analytics · ${selectedMaterialName}`
            : 'Multi-warehouse inventory and analytics'
        }
        action={materialFilterControl}
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {warehouses.map((wh) => {
          const stats = analytics.find((a) => a.warehouseId === wh.id) || {};
          return (
            <Grid item xs={12} md={4} key={wh.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography fontWeight={600}>{warehouseLabel(wh)}</Typography>
                    <Chip label={wh.type} size="small" color={wh.type === 'main' ? 'primary' : 'default'} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{wh.location}</Typography>
                  {selectedMaterialName && (
                    <Chip label={selectedMaterialName} size="small" variant="outlined" sx={{ mb: 1 }} />
                  )}
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {formatWeight(stats.totalWeight || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats.itemCount || 0} items · {formatCurrency(stats.totalValue || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Balance Comparison
            {selectedMaterialName && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                ({selectedMaterialName})
              </Typography>
            )}
          </Typography>
          <ChartContainer height={260}>
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <ChartTooltip cursor={false} wrapperStyle={{ outline: 'none' }} />
              <Bar dataKey="totalWeight" fill={chartColors[1]} radius={[4, 4, 0, 0]} name="Weight (kg)" />
              <Bar dataKey="totalValue" fill={chartColors[0]} radius={[4, 4, 0, 0]} name="Value" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Analytics</Typography>
      <DataTable columns={analyticsColumns} rows={analytics} searchFields={['name']} />
    </Box>
  );
}
