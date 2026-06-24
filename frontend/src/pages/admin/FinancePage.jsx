import { useEffect, useState } from 'react';
import {
  Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Box, Tabs, Tab,
  Divider, Avatar, Chip, Menu, IconButton,
} from '@mui/material';
import {
  Plus, Download, TrendingDown, TrendingUp,
  PiggyBank, MoreHorizontal, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Receipt, Users, Send,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ChartContainer, ChartTooltip, chartColors } from '../../components/charts/ChartWrapper';
import { financeApi, reportsApi, warehouseApi } from '../../services/api';
import {
  formatCurrency, formatDate, formatDateTime, EXPENSE_CATEGORIES, MONEY_TRANSFER_TYPES,
  INCOME_SOURCE_LABELS, downloadBlob,
} from '../../utils/formatters';
import { colors } from '../../theme';

const INCOME_COLOR = '#3B82F6';
const EXPENSE_COLOR = '#22D3EE';

function BalanceCard({ icon: Icon, label, value, trend, accent }) {
  const up = (trend ?? 0) >= 0;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box
            sx={{
              width: 38, height: 38, borderRadius: 2, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: `${accent}1f`, color: accent,
            }}
          >
            <Icon size={20} />
          </Box>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.3, px: 0.9, py: 0.35, borderRadius: 10,
              bgcolor: up ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: up ? 'success.main' : 'error.main',
            }}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <Typography variant="caption" fontWeight={700} fontSize={11}>
              {up ? '+' : ''}{trend ?? 0}%
            </Typography>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.15rem', sm: '1.35rem' } }} noWrap title={value}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

const TXN_ICONS = {
  expense: Receipt,
  salary: Users,
  transfer: Send,
};

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [form, setForm] = useState({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [exportAnchor, setExportAnchor] = useState(null);

  const load = () => {
    setLoading(true);
    financeApi.dashboard({ from: dateFrom || undefined, to: dateTo || undefined })
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(load, [dateFrom, dateTo]);

  useEffect(() => {
    warehouseApi.list().then(({ data: w }) => setWarehouses(w)).catch(() => {});
  }, []);

  const warehouseName = (id) => warehouses.find((w) => w.id === id)?.name || '—';

  const openModal = (type) => {
    setModalType(type);
    setForm({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (modalType === 'expense') {
        await financeApi.createExpense({
          ...form,
          amount: Number(form.amount),
          warehouseName: form.warehouseId ? warehouseName(form.warehouseId) : null,
        });
      } else if (modalType === 'salary') {
        await financeApi.createSalary({ ...form, amount: Number(form.amount) });
      } else if (modalType === 'whTransfer') {
        if (!form.fromWarehouseId || !form.toWarehouseId) {
          toast.error('Select both source and destination warehouses');
          return;
        }
        if (form.fromWarehouseId === form.toWarehouseId) {
          toast.error('Source and destination must be different');
          return;
        }
        await financeApi.createWarehouseTransfer({ ...form, amount: Number(form.amount), notes: form.description || '' });
      } else {
        await financeApi.createTransfer({ ...form, amount: Number(form.amount) });
      }
      toast.success('Record saved');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleExport = async (format) => {
    setExportAnchor(null);
    try {
      const api = format === 'pdf' ? reportsApi.exportPdf : reportsApi.exportExcel;
      const { data: blob } = await api({ type: 'financial', range: 'monthly' });
      downloadBlob(blob, `finance-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading && !data) return <LoadingScreen />;

  // Total balance = income collected (Taaj + Bakery) − capital sent out to warehouses.
  const totalBalance = data?.availableCapital || 0;
  const trends = data?.monthlyTrends || [];

  const cards = [
    { label: 'Income (Taaj + Bakery)', value: formatCurrency(data?.incomeTotal), icon: TrendingUp, accent: colors.emerald, trend: data?.growth?.income },
    { label: 'Total Expenses', value: formatCurrency((data?.totalExpenses || 0) + (data?.shippingFees || 0)), icon: TrendingDown, accent: '#EF4444', trend: data?.growth?.expenses != null ? -Math.abs(data.growth.expenses) : 0 },
    { label: 'Net Profit', value: formatCurrency(data?.netProfit), icon: PiggyBank, accent: colors.copper, trend: 0 },
  ];

  const transactions = [
    ...(data?.expenses || []).map((e) => ({
      id: `e_${e.id}`, kind: 'expense', label: e.category ? `${e.category} expense` : 'Expense',
      name: e.description || e.category || 'Expense', date: e.date || e.createdAt, amount: -(e.amount || 0),
    })),
    ...(data?.salaries || []).map((s) => ({
      id: `s_${s.id}`, kind: 'salary', label: 'Salary payment',
      name: s.employeeName || 'Employee', date: s.date || s.createdAt, amount: -(s.amount || 0),
    })),
    ...(data?.moneyTransfers || []).map((t) => ({
      id: `t_${t.id}`, kind: 'transfer', label: 'Income collected',
      name: t.description || INCOME_SOURCE_LABELS[t.type] || 'Income', date: t.date || t.createdAt, amount: t.amount || 0,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const statementSources = [
    { name: 'Purchases', value: data?.purchaseCost || 0, color: chartColors[0] },
    { name: 'Expenses', value: data?.totalExpenses || 0, color: chartColors[1] },
    { name: 'Salaries', value: data?.totalSalaries || 0, color: chartColors[2] },
    { name: 'Shipping', value: data?.shippingFees || 0, color: chartColors[3] },
  ];
  const statementTotal = statementSources.reduce((s, x) => s + x.value, 0) || 1;

  const expenseColumns = [
    { field: 'description', headerName: 'Description' },
    { field: 'category', headerName: 'Category' },
    { field: 'warehouseId', headerName: 'Warehouse', renderCell: ({ value, row }) => row.warehouseName || (value ? warehouseName(value) : 'HQ / General') },
    { field: 'amount', headerName: 'Amount', renderCell: ({ value }) => formatCurrency(value) },
    { field: 'date', headerName: 'Date', renderCell: ({ value }) => formatDate(value) },
  ];

  return (
    <Box>
      {/* Header — total balance + period + export */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Total balance</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4" fontWeight={700} letterSpacing={-0.5}>
              {formatCurrency(totalBalance)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              {(data?.growth?.income ?? 0) >= 0
                ? <ArrowUpRight size={14} color={colors.emerald} />
                : <ArrowDownRight size={14} color="#EF4444" />}
              <Typography variant="caption" fontWeight={700} color={(data?.growth?.income ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                {(data?.growth?.income ?? 0) >= 0 ? '+' : ''}{data?.growth?.income ?? 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">from last month</Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            select size="small" value={period} onChange={(e) => setPeriod(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<Download size={16} />} onClick={(e) => setExportAnchor(e.currentTarget)}>
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => handleExport('pdf')}>Export PDF</MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>Export Excel</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c.label}>
            <BalanceCard {...c} />
          </Grid>
        ))}
      </Grid>

      {/* Statistics chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Statistics</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: INCOME_COLOR }} />
                  <Typography variant="caption" color="text.secondary">Income</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: EXPENSE_COLOR }} />
                  <Typography variant="caption" color="text.secondary">Expenses</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField select size="small" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 110 }}>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </TextField>
              <IconButton size="small"><MoreHorizontal size={18} /></IconButton>
            </Box>
          </Box>
          <ChartContainer height={300}>
            <AreaChart data={trends} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={48} />
              <ChartTooltip
                formatter={(v) => formatCurrency(v)}
                cursor={{ stroke: 'rgba(128,128,128,0.35)', strokeWidth: 1 }}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, boxShadow: 'none' }}
                labelStyle={{ color: '#888', fontSize: 11 }}
                itemStyle={{ color: '#eee', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="income" stroke={INCOME_COLOR} strokeWidth={2} fill="url(#incomeFill)" />
              <Area type="monotone" dataKey="expenses" stroke={EXPENSE_COLOR} strokeWidth={2} fill="url(#expenseFill)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Latest transactions + Financial statement */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" fontWeight={600}>Latest transactions</Typography>
                <IconButton size="small"><MoreHorizontal size={18} /></IconButton>
              </Box>
              {transactions.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3 }} align="center">No transactions yet</Typography>
              ) : (
                transactions.map((t) => {
                  const Icon = TXN_ICONS[t.kind] || Receipt;
                  const income = t.amount >= 0;
                  return (
                    <Box
                      key={t.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25,
                        borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 },
                      }}
                    >
                      <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover', color: 'text.secondary' }}>
                        <Icon size={16} />
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.label}</Typography>
                      </Box>
                      <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 120 }}>
                        <Typography variant="caption" color="text.secondary">{formatDateTime(t.date)}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: income ? 'success.main' : 'text.primary', minWidth: 90, textAlign: 'right' }}>
                        {income ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                      </Typography>
                      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, minWidth: 110, justifyContent: 'flex-end' }}>
                        <CheckCircle2 size={14} color={colors.emerald} />
                        <Typography variant="caption" color="success.main">Completed</Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Financial statement</Typography>

              <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 1.5 }}>
                {statementSources.map((s) => (
                  <Box key={s.name} sx={{ width: `${(s.value / statementTotal) * 100}%`, bgcolor: s.color }} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                {statementSources.map((s) => (
                  <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                    <Typography variant="caption" color="text.secondary">{s.name}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ display: 'flex', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>Source</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 70 }}>Percent</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ width: 90, textAlign: 'right' }}>Total</Typography>
              </Box>
              {statementSources.map((s) => (
                <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', py: 1.25, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                    <Typography variant="body2">{s.name}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ width: 70 }}>{Math.round((s.value / statementTotal) * 100)}%</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ width: 90, textAlign: 'right' }}>{formatCurrency(s.value)}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Records management */}
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>Records</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Expenses" />
        <Tab label="Salaries" />
        <Tab label="Income (Taaj & Bakery)" />
        <Tab label="Warehouse Transfers" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button size="small" startIcon={<Plus size={14} />} onClick={() => openModal('expense')}>Add Expense</Button>
          </Box>
          <DataTable columns={expenseColumns} rows={data?.expenses || []} searchFields={['description', 'category']} />
        </>
      )}
      {tab === 1 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button size="small" startIcon={<Plus size={14} />} onClick={() => openModal('salary')}>Add Salary</Button>
          </Box>
          <DataTable
            columns={[
              { field: 'employeeName', headerName: 'Employee' },
              { field: 'amount', headerName: 'Amount', renderCell: ({ value }) => formatCurrency(value) },
              { field: 'date', headerName: 'Date', renderCell: ({ value }) => formatDate(value) },
            ]}
            rows={data?.salaries || []}
            searchFields={['employeeName']}
          />
        </>
      )}
      {tab === 2 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button size="small" startIcon={<Plus size={14} />} onClick={() => openModal('transfer')}>Add Income</Button>
          </Box>
          <DataTable
            columns={[
              { field: 'type', headerName: 'Source', renderCell: ({ value }) => INCOME_SOURCE_LABELS[value] || value },
              { field: 'description', headerName: 'Description' },
              { field: 'amount', headerName: 'Amount', renderCell: ({ value }) => formatCurrency(value) },
              { field: 'date', headerName: 'Date', renderCell: ({ value }) => formatDate(value) },
            ]}
            rows={data?.moneyTransfers || []}
            searchFields={['type', 'description']}
          />
        </>
      )}
      {tab === 3 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Button size="small" startIcon={<Plus size={14} />} onClick={() => openModal('whTransfer')}>Add Transfer</Button>
          </Box>
          <DataTable
            columns={[
              { field: 'fromWarehouseName', headerName: 'From' },
              { field: 'toWarehouseName', headerName: 'To' },
              { field: 'amount', headerName: 'Amount', renderCell: ({ value }) => formatCurrency(value) },
              { field: 'notes', headerName: 'Notes' },
              { field: 'date', headerName: 'Date', renderCell: ({ value }) => formatDate(value) },
            ]}
            rows={data?.warehouseTransfers || []}
            searchFields={['fromWarehouseName', 'toWarehouseName', 'notes']}
          />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          modalType === 'expense' ? 'Add Expense'
            : modalType === 'salary' ? 'Add Salary'
            : modalType === 'whTransfer' ? 'Transfer Between Warehouses'
            : 'Add Income'
        }
        actions={<><Button onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save</Button></>}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {modalType === 'expense' && (
            <>
              <Grid item xs={12}>
                <TextField select fullWidth label="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select fullWidth label="Warehouse"
                  value={form.warehouseId || ''}
                  onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                  helperText="Leave as HQ / General if not tied to a warehouse"
                >
                  <MenuItem value="">HQ / General</MenuItem>
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
              </Grid>
            </>
          )}
          {modalType === 'salary' && (
            <Grid item xs={12}>
              <TextField fullWidth label="Employee Name" value={form.employeeName || ''} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
            </Grid>
          )}
          {modalType === 'transfer' && (
            <Grid item xs={12}>
              <TextField select fullWidth label="Source" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {MONEY_TRANSFER_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          {modalType === 'whTransfer' && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="From warehouse" value={form.fromWarehouseId || ''} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="To warehouse" value={form.toWarehouseId || ''} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </TextField>
              </Grid>
            </>
          )}
          <Grid item xs={12}>
            <TextField fullWidth label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth type="number" label="Amount" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Grid>
        </Grid>
      </Modal>
    </Box>
  );
}
