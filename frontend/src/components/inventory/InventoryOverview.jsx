import { useMemo, useState } from 'react';
import {
  Box, Grid, Typography, TextField, MenuItem, InputAdornment, Button,
} from '@mui/material';
import { Search, Plus, Bell } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import InventoryKpiCard from './InventoryKpiCard';
import { ChartContainer, SingleBarTooltip, SinglePieTooltip, barTooltipProps, ChartTooltip } from '../charts/ChartWrapper';
import { formatWeight, formatNumber, formatDJF } from '../../utils/formatters';
import { colors } from '../../theme';

const ALERT_COLORS = {
  inStock: colors.emerald,
  lowStock: colors.copper,
  outOfStock: '#6b7280',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WHSE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'wh_main', label: 'TORABORA' },
  { value: 'wh_secondary_1', label: 'PK12' },
  { value: 'wh_secondary_2', label: 'JAJAB' },
];

const kpiDropdownSx = {
  minWidth: 88,
  '& .MuiOutlinedInput-root': {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.3,
    height: 28,
  },
  '& .MuiSelect-select': { py: 0.5, px: 1 },
};

function getWarehouseStockTotal(items = [], warehouseId) {
  const filtered = items.filter((i) => {
    if (i.status !== 'in_stock') return false;
    if (warehouseId === 'all') return true;
    return i.warehouseId === warehouseId;
  });
  const materials = new Set(filtered.map((i) => i.productId)).size;
  const weight = filtered.reduce((s, i) => s + (i.weight || 0), 0);
  return { materials, weight, items: filtered.length };
}

function getMaterialInStock(items = [], productId) {
  const filtered = items.filter((i) => {
    if (i.status !== 'in_stock') return false;
    if (productId === 'all') return true;
    return i.productId === productId;
  });
  const weight = filtered.reduce((s, i) => s + (i.weight || 0), 0);
  return { count: filtered.length, weight };
}

function getMaterialLowStock(items = [], productId) {
  const filtered = items.filter((i) => {
    if (i.status !== 'in_stock') return false;
    if (productId !== 'all' && i.productId !== productId) return false;
    return (i.weight || 0) < 100 || (i.quantity || 0) < 5;
  });
  const weight = filtered.reduce((s, i) => s + (i.weight || 0), 0);
  return { count: filtered.length, weight };
}

// Cost of the materials a warehouse currently holds = sum of each in-stock row's value
// (the money spent collecting that stock).
function getMaterialsCost(items = [], warehouseId) {
  return items
    .filter(
      (i) =>
        !i.isOpeningStock &&
        (i.status === 'in_stock' || i.status === undefined) &&
        (warehouseId === 'all' || i.warehouseId === warehouseId)
    )
    .reduce((s, i) => s + (i.value || 0), 0);
}

function computeStats(items = [], products = [], alerts = []) {
  const inStock = items.filter(
    (i) => i.status === 'in_stock' && (i.weight || 0) >= 100 && (i.quantity || 0) >= 5
  ).length;
  const lowStock = alerts.length || items.filter(
    (i) => i.status === 'in_stock' && ((i.weight || 0) < 100 || (i.quantity || 0) < 5)
  ).length;
  const outOfStock = items.filter(
    (i) => i.status === 'shipped' || (i.weight || 0) === 0
  ).length;

  return {
    totalProducts: products.length,
    totalRecords: items.length,
    inStock,
    lowStock,
    outOfStock,
  };
}

function buildMonthlyFlow(items = [], productId = 'all') {
  const filtered =
    productId === 'all' ? items : items.filter((i) => i.productId === productId);

  const now = new Date();
  const currentYear = now.getFullYear();

  return MONTHS.map((name, idx) => {
    const incoming = filtered
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === idx && i.movementType !== 'outgoing';
      })
      .reduce((s, i) => s + (i.weight || 0), 0);

    const outgoing = filtered
      .filter((i) => {
        const d = new Date(i.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === idx && i.movementType === 'outgoing';
      })
      .reduce((s, i) => s + (i.weight || 0), 0);

    return { name, Incoming: incoming, Outgoing: outgoing };
  });
}

export default function InventoryOverview({ items, products, alerts, expenses = [], onAddStock, search, onSearchChange }) {
  const { user } = useAuth();
  const [flowPeriod, setFlowPeriod] = useState('monthly');
  const [flowMaterialFilter, setFlowMaterialFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [lowStockMaterialFilter, setLowStockMaterialFilter] = useState('all');
  const [expenseFilter, setExpenseFilter] = useState('all');

  const stats = useMemo(() => computeStats(items, products, alerts), [items, products, alerts]);
  const monthlyFlow = useMemo(
    () => buildMonthlyFlow(items, flowMaterialFilter),
    [items, flowMaterialFilter]
  );

  const warehouseStock = useMemo(
    () => getWarehouseStockTotal(items, warehouseFilter),
    [items, warehouseFilter]
  );

  const materialStock = useMemo(() => {
    const data = getMaterialInStock(items, materialFilter);
    const product = products.find((p) => p.id === materialFilter);
    return { ...data, label: product?.name };
  }, [items, materialFilter, products]);

  const lowStockMaterial = useMemo(
    () => getMaterialLowStock(items, lowStockMaterialFilter),
    [items, lowStockMaterialFilter]
  );

  const materialsCost = useMemo(
    () => getMaterialsCost(items, expenseFilter),
    [items, expenseFilter]
  );

  const materialsCostLabel = useMemo(() => {
    const opt = WHSE_OPTIONS.find((w) => w.value === expenseFilter);
    return expenseFilter === 'all' ? 'All warehouses · DJF' : `${opt?.label || ''} · DJF`;
  }, [expenseFilter]);

  const alertTotal = stats.inStock + stats.lowStock + stats.outOfStock || 1;
  const donutData = [
    { name: 'In Stock', value: stats.inStock, color: ALERT_COLORS.inStock },
    { name: 'Low Stock', value: stats.lowStock, color: ALERT_COLORS.lowStock },
    { name: 'Out of Stock', value: stats.outOfStock, color: ALERT_COLORS.outOfStock },
  ].filter((d) => d.value > 0);

  const donutDisplay = donutData.length ? donutData : [
    { name: 'In Stock', value: 1, color: ALERT_COLORS.inStock },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  return (
    <Box sx={{ mb: 3 }}>
      {/* Welcome + search row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
          Hey {firstName} 👋, welcome back!
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small"
            placeholder="Search Products / SKU..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{
              minWidth: { xs: '100%', sm: 280 },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 3,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#888" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" startIcon={<Plus size={18} />} onClick={onAddStock} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Add Stock
          </Button>
        </Box>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <InventoryKpiCard
            title="Total Materials"
            value={formatNumber(warehouseStock.materials)}
            subtitle={formatWeight(warehouseStock.weight)}
            trend="+8.4%"
            trendUp
            headerAction={
              <TextField
                select
                size="small"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                sx={kpiDropdownSx}
              >
                {WHSE_OPTIONS.map((wh) => (
                  <MenuItem key={wh.value} value={wh.value} sx={{ fontSize: 12 }}>
                    {wh.label}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InventoryKpiCard
            title="In Stock"
            value={formatNumber(materialStock.count)}
            subtitle={formatWeight(materialStock.weight)}
            trend="+3.2%"
            trendUp
            headerAction={
              <TextField
                select
                size="small"
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                sx={{ ...kpiDropdownSx, minWidth: 100 }}
              >
                <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InventoryKpiCard
            title="Low Stock"
            value={formatNumber(lowStockMaterial.count)}
            subtitle={formatWeight(lowStockMaterial.weight)}
            trend="-2.8%"
            trendUp={false}
            headerAction={
              <TextField
                select
                size="small"
                value={lowStockMaterialFilter}
                onChange={(e) => setLowStockMaterialFilter(e.target.value)}
                sx={{ ...kpiDropdownSx, minWidth: 100 }}
              >
                <MenuItem value="all" sx={{ fontSize: 12 }}>All</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <InventoryKpiCard
            title="Materials Cost"
            value={formatDJF(materialsCost, { suffix: false })}
            subtitle={materialsCostLabel}
            valueColor={colors.copper}
            headerAction={
              <TextField
                select
                size="small"
                value={expenseFilter}
                onChange={(e) => setExpenseFilter(e.target.value)}
                sx={kpiDropdownSx}
              >
                {WHSE_OPTIONS.map((wh) => (
                  <MenuItem key={wh.value} value={wh.value} sx={{ fontSize: 12 }}>
                    {wh.label}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              p: { xs: 1.5, sm: 2.5 },
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Stock Flow</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', maxWidth: '100%' }}>
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.emerald }} />
                    <Typography variant="caption" color="text.secondary">Incoming</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors.copper }} />
                    <Typography variant="caption" color="text.secondary">Outgoing</Typography>
                  </Box>
                </Box>
                <TextField
                  select
                  size="small"
                  value={flowMaterialFilter}
                  onChange={(e) => setFlowMaterialFilter(e.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 130 }, '& .MuiOutlinedInput-root': { fontSize: 12 } }}
                >
                  <MenuItem value="all">All Materials</MenuItem>
                  {products.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  value={flowPeriod}
                  onChange={(e) => setFlowPeriod(e.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 110 }, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                </TextField>
              </Box>
            </Box>
            <ChartContainer height={260}>
              <BarChart data={monthlyFlow} barGap={4} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={40} />
                <ChartTooltip
                  {...barTooltipProps}
                  content={<SingleBarTooltip valueFormatter={(v) => formatWeight(v)} />}
                />
                <Bar dataKey="Incoming" fill={colors.emerald} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Outgoing" fill={colors.copper} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          </Box>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2.5,
              p: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Inventory Alerts</Typography>
              {alerts.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                  <Bell size={14} />
                  <Typography variant="caption" fontWeight={600}>{alerts.length}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
              <ChartContainer height={180}>
                <PieChart>
                  <Pie
                    data={donutDisplay}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={78}
                    strokeWidth={2}
                    stroke="#141414"
                    paddingAngle={3}
                    activeShape={false}
                  >
                    {donutDisplay.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    cursor={false}
                    wrapperStyle={{ outline: 'none' }}
                    content={
                      <SinglePieTooltip valueFormatter={(v) => formatNumber(v)} />
                    }
                  />
                </PieChart>
              </ChartContainer>
              <Box sx={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                <Typography variant="h6" fontWeight={700}>
                  {Math.round((stats.inStock / alertTotal) * 100)}%
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={10}>IN STOCK</Typography>
              </Box>
            </Box>

            <Grid container spacing={1} sx={{ mt: 1 }}>
              {[
                { label: 'In Stock', value: stats.inStock, color: ALERT_COLORS.inStock },
                { label: 'Low Stock', value: stats.lowStock, color: ALERT_COLORS.lowStock },
                { label: 'Out of Stock', value: stats.outOfStock, color: ALERT_COLORS.outOfStock },
              ].map((item) => (
                <Grid item xs={4} key={item.label}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption" color="text.secondary" fontSize={10} noWrap>
                        {item.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700}>{formatNumber(item.value)}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
