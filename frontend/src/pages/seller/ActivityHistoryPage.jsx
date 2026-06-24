import { useEffect, useMemo, useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Avatar,
} from '@mui/material';
import { Package } from 'lucide-react';
import LoadingScreen from '../../components/common/LoadingScreen';
import { analyticsApi } from '../../services/api';
import { formatDate, formatDateTime, formatWeight, formatCurrency } from '../../utils/formatters';

export default function ActivityHistoryPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.seller()
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const entries = data?.entries || [];
  const submissions = data?.submissions || [];
  const fundedBalance = data?.fundedBalance || 0;

  const balanceByEntry = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let running = fundedBalance;
    const map = {};
    sorted.forEach((e) => {
      running -= e.collectedMoney || 0;
      map[e.id] = running;
    });
    return map;
  }, [entries, fundedBalance]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [entries],
  );

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>History</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your last transactions — purchases and money submissions
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Purchases" />
        <Tab label="Money Submissions" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <CardContent>
            {sortedEntries.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No purchases yet</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 640 }}>
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
                    {sortedEntries.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: 'action.hover', color: 'text.secondary' }}>
                              <Package size={15} />
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>{t.productName}</Typography>
                              {t.wholesaleName && (
                                <Typography variant="caption" color="text.secondary" noWrap>{t.wholesaleName}</Typography>
                              )}
                            </Box>
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
      )}

      {tab === 1 && (
        submissions.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No money submissions yet
          </Typography>
        ) : (
          submissions.map((item) => (
            <Card key={item.id} sx={{ mb: 1.5 }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Typography fontWeight={600} color="success.main">{formatCurrency(item.amount)}</Typography>
                {item.notes && (
                  <Typography variant="body2" color="text.secondary">{item.notes}</Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {formatDateTime(item.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          ))
        )
      )}
    </Box>
  );
}
