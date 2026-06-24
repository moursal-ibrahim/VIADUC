import { useEffect, useState } from 'react';
import {
  Grid, Typography, Box, ToggleButton, ToggleButtonGroup, Button,
  TextField, MenuItem,
} from '@mui/material';
import { Layers, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import ExecutiveCard from '../../components/dashboard/ExecutiveCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ChartContainer, SingleBarTooltip, SinglePieTooltip, barTooltipProps, ChartLegend, ChartTooltip, chartColors } from '../../components/charts/ChartWrapper';
import { analyticsApi, reportsApi, productApi, inventoryApi } from '../../services/api';
import { formatDJF, formatWeight, downloadBlob } from '../../utils/formatters';
import { toast } from 'react-toastify';

const STATUS_COLORS = { Stable: '#ffffff', Active: '#ffffff', Low: '#EF4444' };

const WHSE_CARDS = [
  { warehouseId: 'wh_main', label: 'TORABORA', defaultMaterial: 'Copper' },
  { warehouseId: 'wh_secondary_1', label: 'PK12', defaultMaterial: 'Aluminium' },
  { warehouseId: 'wh_secondary_2', label: 'JAJAB', defaultMaterial: 'Iron' },
];

const WAREHOUSE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'wh_main', label: 'TORABORA' },
  { value: 'wh_secondary_1', label: 'PK12' },
  { value: 'wh_secondary_2', label: 'JAJAB' },
];

const WAREHOUSE_CHART_KEYS = ['TORABORA', 'PK12', 'JAJAB'];

const WAREHOUSE_CHART_COLORS = {
  TORABORA: '#E07B39',
  PK12: '#3B82F6',
  JAJAB: '#10B981',
};

const MOVEMENT_PERIODS = ['24D', '7D', '30D', '90D'];

const INCOME_FILTERS = [
  { value: 'all', label: 'ALL' },
  { value: 'taaj', label: 'Taaj' },
  { value: 'bakery', label: 'Bakeri' },
];

const dropdownSx = {
  minWidth: 90,
  '& .MuiOutlinedInput-root': {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    height: 28,
  },
  '& .MuiSelect-select': { py: 0.5, px: 1 },
};

function getMaterialWeight(inventory, warehouseId, productId) {
  return inventory
    .filter((i) => i.warehouseId === warehouseId && i.productId === productId)
    .reduce((s, i) => s + (i.weight || 0), 0);
}

function getStockStatus(weight) {
  if (weight < 500) return 'Low';
  if (weight < 2000) return 'Active';
  return 'Stable';
}

function getMaterialsStock(inventory, products, warehouseFilter) {
  const filtered =
    warehouseFilter === 'all'
      ? inventory
      : inventory.filter((i) => i.warehouseId === warehouseFilter);

  return products.map((p) => {
    const weight = filtered
      .filter((i) => i.productId === p.id)
      .reduce((s, i) => s + (i.weight || 0), 0);
    return {
      id: p.id,
      name: p.name,
      weight,
      tonnes: Math.round((weight / 1000) * 100) / 100,
      status: getStockStatus(weight),
    };
  });
}

function buildWarehouseMovement(inventory, period) {
  const daysMap = { '24D': 24, '7D': 7, '30D': 30, '90D': 90 };
  const days = daysMap[period] || 30;
  const bucketSize = days <= 7 ? 1 : days <= 30 ? 1 : 7;
  const numBuckets = days === 24 ? 24 : days <= 7 ? 7 : days <= 30 ? 30 : 13;
  const now = new Date();
  const result = [];

  for (let i = numBuckets - 1; i >= 0; i--) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * bucketSize);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - bucketSize + 1);
    start.setHours(0, 0, 0, 0);

    const label =
      days === 24 || (days > 7 && days <= 30)
        ? end.toLocaleString('default', { month: 'short', day: 'numeric' })
        : days <= 7
          ? end.toLocaleString('default', { weekday: 'short' })
          : `W${Math.ceil((days - i * bucketSize) / 7)}`;

    const point = { name: label };
    WHSE_CARDS.forEach((card) => {
      point[card.label] = inventory
        .filter((item) => {
          if (item.warehouseId !== card.warehouseId) return false;
          const d = new Date(item.createdAt);
          return d >= start && d <= end;
        })
        .reduce((s, item) => s + (item.weight || 0), 0);
    });
    result.push(point);
  }
  return result;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [materialByWh, setMaterialByWh] = useState({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30D');
  const [incomeFilter, setIncomeFilter] = useState('all');
  const [warehouseStockFilter, setWarehouseStockFilter] = useState('all');
  const [stockUnit, setStockUnit] = useState('t');

  useEffect(() => {
    Promise.all([
      analyticsApi.dashboard(),
      productApi.list(),
      inventoryApi.list(),
    ])
      .then(([dash, prod, inv]) => {
        setData(dash.data);
        setProducts(prod.data);
        setInventory(inv.data);

        const defaults = {};
        WHSE_CARDS.forEach((card) => {
          const byProduct = {};
          inv.data
            .filter((i) => i.warehouseId === card.warehouseId)
            .forEach((i) => { byProduct[i.productId] = (byProduct[i.productId] || 0) + (i.weight || 0); });
          const topProductId = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0]?.[0];
          const preferred = prod.data.find((p) => p.name === card.defaultMaterial);
          defaults[card.warehouseId] = topProductId || preferred?.id || prod.data[0]?.id || '';
        });
        setMaterialByWh(defaults);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleMaterialChange = (warehouseId, productId) => {
    setMaterialByWh((prev) => ({ ...prev, [warehouseId]: productId }));
  };

  const handleExport = async () => {
    try {
      const { data: blob } = await reportsApi.exportPdf({ type: 'operational', range: 'daily' });
      downloadBlob(blob, 'viaduc-executive-overview.pdf');
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading) return <LoadingScreen message="Loading executive overview..." />;

  const executive = data?.executive || {};
  const warehouseCashBalances = executive.warehouseCashBalances || {};
  const warehouseMovement =
    executive.warehouseMovement?.[period]?.some((d) => d.TORABORA !== undefined)
      ? executive.warehouseMovement[period]
      : buildWarehouseMovement(inventory, period);
  const materialsStock = getMaterialsStock(inventory, products, warehouseStockFilter);
  const totalStockWeight = materialsStock.reduce((s, m) => s + m.weight, 0);
  const totalStockTonnes = Math.round((totalStockWeight / 1000) * 10) / 10;

  const pieChartData = materialsStock
    .filter((m) => m.weight > 0)
    .map((m, i) => ({
      ...m,
      value: stockUnit === 't' ? m.tonnes : m.weight,
      color: chartColors[i % chartColors.length],
    }));

  const centerKpiValue =
    stockUnit === 't'
      ? totalStockTonnes
      : new Intl.NumberFormat('fr-DJ', { maximumFractionDigits: 0 }).format(totalStockWeight);

  const centerKpiLabel = stockUnit === 't' ? 'METRIC TONS' : 'KG';

  const incomeBreakdown = executive.incomeBreakdown || {
    all: executive.totalIncome || 0,
    taaj: 0,
    bakery: 0,
  };
  const displayedIncome = incomeBreakdown[incomeFilter] ?? incomeBreakdown.all;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={700} letterSpacing={-0.5} sx={{ fontSize: { xs: '1.35rem', sm: '1.75rem' } }}>
          Executive Overview
        </Typography>
        <Button
          variant="contained"
          startIcon={<Download size={16} />}
          onClick={handleExport}
          sx={{
            bgcolor: 'common.white',
            color: 'common.black',
            '&:hover': { bgcolor: 'grey.200' },
            minWidth: { xs: 'auto', sm: 'unset' },
            px: { xs: 1.5, sm: 2 },
            '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Export Data</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Export</Box>
        </Button>
      </Box>

      {/* Row 1 — Warehouse balances + Expense */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {WHSE_CARDS.map((card) => (
          <Grid item xs={12} sm={6} md key={card.warehouseId}>
            <ExecutiveCard
              titleHighlight={`Balance Warehouse ${card.label}`}
              badge="DJF"
              value={formatDJF(warehouseCashBalances[card.warehouseId] || 0, { suffix: false })}
            />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md>
          <ExecutiveCard
            title="Expense"
            badge="DJF"
            value={formatDJF(executive.totalExpenses, { suffix: false })}
            valueColor="#EF4444"
          />
        </Grid>
      </Grid>

      {/* Row 2 — Inventory highlights + Income */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {WHSE_CARDS.map((card) => {
          const productId = materialByWh[card.warehouseId];
          const weight = getMaterialWeight(inventory, card.warehouseId, productId);

          return (
            <Grid item xs={12} sm={6} md key={card.warehouseId}>
              <ExecutiveCard
                titleHighlight={`WHSE ${card.label}`}
                value={formatWeight(weight)}
                icon={Layers}
                headerAction={
                  <TextField
                    select
                    size="small"
                    value={productId || ''}
                    onChange={(e) => handleMaterialChange(card.warehouseId, e.target.value)}
                    sx={{
                      minWidth: 110,
                      '& .MuiOutlinedInput-root': {
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                        height: 28,
                      },
                      '& .MuiSelect-select': { py: 0.5, px: 1 },
                    }}
                  >
                    {products.map((p) => (
                      <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                }
              />
            </Grid>
          );
        })}
        <Grid item xs={12} sm={6} md>
          <ExecutiveCard
            title="Income — Total / Transfers"
            badge="DJF"
            value={formatDJF(displayedIncome, { suffix: false })}
            valueColor="#10B981"
            headerAction={
              <TextField
                select
                size="small"
                value={incomeFilter}
                onChange={(e) => setIncomeFilter(e.target.value)}
                sx={dropdownSx}
              >
                {INCOME_FILTERS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: 12 }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
        </Grid>
      </Grid>

      {/* Row 3 — Charts + Stock status */}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={5}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2.5 },
        height: '100%',
      }}
    >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight={600}>Warehouse Movement Tracking</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                  TORABORA · PK12 · JAJAB
                </Typography>
              </Box>
              <Box className="responsive-scroll-x" sx={{ maxWidth: '100%' }}>
              <ToggleButtonGroup
                size="small"
                value={period}
                exclusive
                onChange={(_, v) => v && setPeriod(v)}
                sx={{
                  flexShrink: 0,
                  '& .MuiToggleButton-root': {
                    px: 1.25,
                    py: 0.25,
                    fontSize: 10,
                    fontWeight: 600,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      color: 'text.primary',
                    },
                  },
                }}
              >
                {MOVEMENT_PERIODS.map((p) => (
                  <ToggleButton key={p} value={p}>{p}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              </Box>
            </Box>
            <ChartContainer height={240}>
              <BarChart data={warehouseMovement} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: period === '24D' || period === '30D' ? 8 : 10, fill: '#888' }}
                  axisLine={false}
                  tickLine={false}
                  interval={period === '24D' || period === '30D' ? 'preserveStartEnd' : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} width={35} />
                <ChartTooltip
                  {...barTooltipProps}
                  content={
                    <SingleBarTooltip valueFormatter={(v) => formatWeight(v)} />
                  }
                />
                <ChartLegend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: '#aaa' }}>{value}</span>}
                />
                {WAREHOUSE_CHART_KEYS.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={WAREHOUSE_CHART_COLORS[key]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={period === '90D' ? 10 : 16}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </Box>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2.5 },
        height: '100%',
      }}
    >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>Stock Overview</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', maxWidth: '100%' }}>
                <Box className="responsive-scroll-x">
                <ToggleButtonGroup
                  size="small"
                  value={stockUnit}
                  exclusive
                  onChange={(_, v) => v && setStockUnit(v)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 1.25,
                      py: 0.25,
                      fontSize: 10,
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&.Mui-selected': { bgcolor: 'action.selected', color: 'text.primary' },
                    },
                  }}
                >
                  <ToggleButton value="t">T</ToggleButton>
                  <ToggleButton value="kg">KG</ToggleButton>
                </ToggleButtonGroup>
                </Box>
                <Box className="responsive-scroll-x">
                <ToggleButtonGroup
                  size="small"
                  value={warehouseStockFilter}
                  exclusive
                  onChange={(_, v) => v && setWarehouseStockFilter(v)}
                  sx={{
                    '& .MuiToggleButton-root': {
                      px: 1.5,
                      py: 0.25,
                      fontSize: 10,
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      '&.Mui-selected': {
                        bgcolor: 'action.selected',
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  {WAREHOUSE_FILTERS.map((wh) => (
                    <ToggleButton key={wh.value} value={wh.value}>{wh.label}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box
                sx={{
                  flex: '0 0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: { md: 200 },
                }}
              >
                <Box sx={{ position: 'relative', width: '100%', maxWidth: 200, height: 200 }}>
                  <ChartContainer height={200}>
                    <PieChart>
                      <Pie
                        data={pieChartData.length ? pieChartData : [{ name: 'Empty', value: 1, color: '#333' }]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={88}
                        strokeWidth={2}
                        stroke="#141414"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={pieChartData.length > 1 ? 2 : 0}
                        activeShape={false}
                      >
                        {(pieChartData.length ? pieChartData : [{ color: '#333' }]).map((entry, i) => (
                          <Cell key={entry.id || i} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        cursor={false}
                        wrapperStyle={{ outline: 'none' }}
                        content={
                          <SinglePieTooltip
                            valueFormatter={(v) => (stockUnit === 't' ? `${v} t` : formatWeight(v))}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
                      {centerKpiValue}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.8, fontSize: 9, mt: 0.25 }}>
                      {centerKpiLabel}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1.5, maxWidth: 200 }}>
                  {pieChartData.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                        {item.name.split(' ')[0]}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {materialsStock.map((item, i) => {
                  const isLow = item.status === 'Low';
                  const dotColor = chartColors[i % chartColors.length];
                  const qtyLabel =
                    stockUnit === 't' ? `${item.tonnes} t` : formatWeight(item.weight);
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.25,
                        borderBottom: 1,
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{qtyLabel}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, ml: 1 }}>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: STATUS_COLORS[item.status], letterSpacing: 0.3 }}
                        >
                          {item.status}
                        </Typography>
                        {isLow ? (
                          <AlertTriangle size={14} color="#EF4444" />
                        ) : (
                          <CheckCircle2 size={14} color="#fff" opacity={0.6} />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
