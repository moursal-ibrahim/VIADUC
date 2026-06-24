import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  TextField,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Divider,
} from '@mui/material';
import { Send, ArrowDownLeft, ShoppingCart, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';
import { analyticsApi } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function MoneySubmissionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    analyticsApi.seller()
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await analyticsApi.moneySubmission({ amount: Number(amount), notes });
      toast.success(`Submitted ${formatCurrency(amount)}`);
      setAmount('');
      setNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openingCash = data?.openingCash || 0;
  const openingDate = data?.openingDate;
  const warehouseFunding = data?.warehouseFunding ?? data?.fundedBalance ?? 0;
  const totalSpent = data?.totalSpent || 0;
  const totalSubmitted = data?.totalSubmitted || 0;
  const balance = data?.balance ?? data?.warehouseCashBalance ?? 0;

  const ledger = useMemo(() => {
    const opening = openingCash
      ? [{
          id: 'opening-cash',
          type: 'opening',
          label: 'Opening balance',
          detail: 'Stock initial saisi manuellement',
          amount: openingCash,
          createdAt: openingDate || new Date().toISOString(),
        }]
      : [];
    const funding = (data?.funding || []).map((f) => ({
      id: `fund-${f.id}`,
      type: 'fund',
      label: 'Funds received',
      detail: f.notes || (f.fundedByName ? `From ${f.fundedByName}` : 'From admin'),
      amount: f.amount || 0,
      createdAt: f.createdAt,
    }));
    const purchases = (data?.entries || []).map((e) => ({
      id: `buy-${e.id}`,
      type: 'purchase',
      label: e.productName || 'Purchase',
      detail: e.wholesaleName ? `Wholesale · ${e.wholesaleName}` : 'Material purchase',
      amount: -(e.collectedMoney || 0),
      createdAt: e.createdAt,
    }));
    const submissions = (data?.submissions || []).map((s) => ({
      id: `sub-${s.id}`,
      type: 'submission',
      label: 'Cash submitted',
      detail: s.notes || 'Returned to company',
      amount: -(s.amount || 0),
      createdAt: s.createdAt,
    }));
    return [...opening, ...funding, ...purchases, ...submissions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [data, openingCash, openingDate]);

  const ledgerMeta = {
    opening: { icon: TrendingUp, color: 'info.main' },
    fund: { icon: ArrowDownLeft, color: 'success.main' },
    purchase: { icon: ShoppingCart, color: 'error.main' },
    submission: { icon: Send, color: 'warning.main' },
  };

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>Money Tracking</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track funds from admin, purchases, and cash you submit back
      </Typography>

      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Opening balance" value={formatCurrency(openingCash)} icon={TrendingUp} color="#3B82F6" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Funds received" value={formatCurrency(warehouseFunding)} icon={Wallet} color="#10B981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Spent on purchases" value={formatCurrency(totalSpent)} icon={ShoppingCart} color="#EF4444" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard title="Submitted" value={formatCurrency(totalSubmitted)} icon={Send} color="#F59E0B" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: balance < 0 ? 'error.main' : 'primary.main', color: 'common.white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Remaining balance</Typography>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2, p: 0.75, display: 'flex' }}>
                  <TrendingUp size={18} />
                </Box>
              </Box>
              <Typography variant="h5" fontWeight={700} noWrap>{formatCurrency(balance)}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Funds − purchases − submitted</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Submit cash form */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Submit cash</Typography>
              <Typography variant="caption" color="text.secondary">
                Record collected cash returned to the company
              </Typography>
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  fullWidth
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  startIcon={<Send size={20} />}
                  sx={{ py: 1.6, borderRadius: 3 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Money'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Ledger */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Cash ledger</Typography>
              {ledger.length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No activity yet</Typography>
              ) : (
                ledger.map((item, idx) => {
                  const meta = ledgerMeta[item.type];
                  const Icon = meta.icon;
                  return (
                    <Box key={item.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.hover', color: meta.color }}>
                          <Icon size={18} />
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{item.label}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap display="block">
                            {item.detail}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: item.amount >= 0 ? 'success.main' : 'error.main' }}>
                            {item.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(item.amount))}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(item.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      {idx < ledger.length - 1 && <Divider />}
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" noWrap>{title}</Typography>
          <Box sx={{ bgcolor: `${color}22`, borderRadius: 2, p: 0.75, display: 'flex', color }}>
            <Icon size={18} />
          </Box>
        </Box>
        <Typography variant="h5" fontWeight={700} noWrap>{value}</Typography>
      </CardContent>
    </Card>
  );
}
