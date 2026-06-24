import { useEffect, useMemo, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Avatar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Wallet, Scale, Receipt, Plus, Package } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import LoadingScreen from '../../components/common/LoadingScreen';
import {
  ChartContainer,
  ChartTooltip,
  chartColors,
  SingleBarTooltip,
  SinglePieTooltip,
  barTooltipProps,
} from '../../components/charts/ChartWrapper';
import { analyticsApi } from '../../services/api';
import { formatWeight, formatCurrency, formatDate } from '../../utils/formatters';

export default function SellerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [materialFilter, setMaterialFilter] = useState('all');
  const [period, setPeriod] = useState(7);
  const navigate = useNavigate();

  useEffect(() => {
    analyticsApi.seller()
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const entries = data?.entries || [];
  const inventory = data?.inventory || [];
  const openingCash = data?.openingCash || 0;
  const warehouseFunding = data?.warehouseFunding ?? data?.fundedBalance ?? 0;
  const warehouseName = data?.warehouseName || '';

  const materialOptions = useMemo(() => {
    const map = new Map();
    inventory.forEach((i) => {
      if (!i.productId) return;
      const prev = map.get(i.productId) || { id: i.productId, name: i.productName, weight: 0 };
      prev.weight += i.weight || 0;
      map.set(i.productId, prev);
    });
    return [...map.values()];
  }, [inventory]);

  const totalAllWeight = useMemo(
    () => inventory.reduce((s, i) => s + (i.weight || 0), 0),
    [inventory],
  );

  const filteredInventory = useMemo(
    () => (materialFilter === 'all' ? inventory : inventory.filter((i) => i.productId === materialFilter)),
    [inventory, materialFilter],
  );

  const totalWeight = useMemo(
    () => filteredInventory.reduce((s, i) => s + (i.weight || 0), 0),
    [filteredInventory],
  );

  const filteredEntries = useMemo(
    () => (materialFilter === 'all' ? entries : entries.filter((e) => e.productId === materialFilter)),
    [entries, materialFilter],
  );

  const totalExpense = useMemo(
    () => filteredEntries.reduce((s, e) => s + (e.collectedMoney || 0), 0),
    [filteredEntries],
  );

  const balance = data?.balance ?? data?.warehouseCashBalance ?? 0;

  const balanceByEntry = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let running = openingCash + warehouseFunding;
    const map = {};
    sorted.forEach((e) => {
      running -= e.collectedMoney || 0;
      map[e.id] = running;
    });
    return map;
  }, [entries, openingCash, warehouseFunding]);

  const dailySeries = useMemo(() => {
    const arr = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = period <= 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const weight = entries
        .filter((e) => e.createdAt?.startsWith(key))
        .reduce((s, e) => s + (e.weight || 0), 0);
      arr.push({ name: label, weight });
    }
    return arr;
  }, [entries, period]);

  const materialBreakdown = useMemo(() => {
    const map = {};
    inventory.forEach((i) => {
      const n = i.productName || 'Unknown';
      map[n] = (map[n] || 0) + (i.weight || 0);
    });
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: chartColors[i % chartColors.length] }))
      .filter((m) => m.value > 0);
  }, [inventory]);

  const recentTransactions = useMemo(
    () => [...filteredEntries]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6),
    [filteredEntries],
  );

  if (loading) return <LoadingScreen message="Loading..." />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Overview</Typography>
          <Typography variant="body2" color="text.secondary">
            Your field operations summary
          </Typography>
        </Box>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* 1. Balance — no trend */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: balance < 0 ? 'error.main' : 'primary.main', color: 'common.white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Balance</Typography>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 0.75, display: 'flex' }}>
                  <Wallet size={18} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} noWrap>{formatCurrency(balance)}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {warehouseName ? `${warehouseName} · opening + funds − purchases` : 'Opening + funds − purchases'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. Total Weight — material dropdown */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
                <Typography variant="body2" color="text.secondary" noWrap>Total Weight</Typography>
                <Select
                  size="small"
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                  variant="standard"
                  disableUnderline
                  sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 160, '& .MuiSelect-select': { py: 0 } }}
                >
                  <MenuItem value="all">All materials — {formatWeight(totalAllWeight)}</MenuItem>
                  {materialOptions.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name} — {formatWeight(m.weight)}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Typography variant="h4" fontWeight={700} noWrap>{formatWeight(totalWeight)}</Typography>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 0.75, display: 'flex', color: 'text.secondary' }}>
                  <Scale size={18} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. Total Expense of this weight — dark card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'grey.900', color: 'common.white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>Total Expense</Typography>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2, p: 0.75, display: 'flex' }}>
                  <Receipt size={18} />
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} noWrap>{formatCurrency(totalExpense)}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {materialFilter === 'all' ? 'All materials' : materialOptions.find((m) => m.id === materialFilter)?.name}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 4. Quick Purchase — add action */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              border: '1px dashed',
              borderColor: 'divider',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CardContent sx={{ textAlign: 'center', width: '100%' }}>
              <Button
                variant="contained"
                startIcon={<Plus size={20} />}
                onClick={() => navigate('/seller/entry')}
                sx={{ borderRadius: 2, py: 1.2, px: 2.5, mb: 1 }}
              >
                Quick Purchase
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                Record a new material purchase
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>Purchase Report</Typography>
                  <Typography variant="caption" color="text.secondary">Collected weight over time</Typography>
                </Box>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={period}
                  onChange={(_, v) => v && setPeriod(v)}
                >
                  <ToggleButton value={7}>7d</ToggleButton>
                  <ToggleButton value={30}>30d</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <ChartContainer height={280}>
                <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8884" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip {...barTooltipProps} content={<SingleBarTooltip valueFormatter={formatWeight} />} />
                  <Bar dataKey="weight" name="Weight" fill={chartColors[0]} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>Material Breakdown</Typography>
              <Typography variant="caption" color="text.secondary">Weight share by material</Typography>
              {materialBreakdown.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>No data yet</Typography>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                  <Box sx={{ flex: '1 1 180px', minWidth: 0 }}>
                    <ChartContainer height={220}>
                      <PieChart>
                        <Pie
                          data={materialBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {materialBreakdown.map((m) => <Cell key={m.name} fill={m.color} />)}
                        </Pie>
                        <ChartTooltip {...barTooltipProps} content={<SinglePieTooltip valueFormatter={formatWeight} />} />
                      </PieChart>
                    </ChartContainer>
                  </Box>
                  <Box sx={{ flex: '1 1 120px', minWidth: 0 }}>
                    {materialBreakdown.map((m) => (
                      <Box key={m.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: m.color, flexShrink: 0 }} />
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{m.name}</Typography>
                        <Typography variant="body2" fontWeight={600}>{formatWeight(m.value)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent transactions */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Recent Purchases</Typography>
          {recentTransactions.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No purchases yet</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Warehouse</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Expense</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 30, height: 30, bgcolor: 'action.hover', color: 'text.secondary' }}>
                            <Package size={15} />
                          </Avatar>
                          <Typography variant="body2" fontWeight={600} noWrap>{t.productName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(t.createdAt)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{t.warehouseName || '—'}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatWeight(t.weight)}</TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(t.collectedMoney || 0)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ whiteSpace: 'nowrap', fontWeight: 600, color: (balanceByEntry[t.id] ?? 0) < 0 ? 'error.main' : 'success.main' }}
                      >
                        {formatCurrency(balanceByEntry[t.id] ?? 0)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label="Completed" size="small" color="success" variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
