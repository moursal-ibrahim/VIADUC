import { useEffect, useState } from 'react';
import {
  Button, MenuItem, TextField, Box, Grid, Card, CardContent, Typography, Divider,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { FileText, Download, CalendarClock } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import LoadingScreen from '../../components/common/LoadingScreen';
import { reportsApi } from '../../services/api';
import { formatDate, formatCurrency, formatWeight, formatDJF, downloadBlob } from '../../utils/formatters';

const REPORT_TYPES = [
  { value: 'operational', label: 'Operational Report' },
  { value: 'financial', label: 'Financial Summary' },
  { value: 'warehouse', label: 'Warehouse Report' },
  { value: 'export', label: 'Export Report' },
];

const REPORT_RANGES = [
  { value: 'daily', label: 'Daily' },
  { value: '2day', label: '2-Day Operational' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('operational');
  const [range, setRange] = useState('daily');
  const [generating, setGenerating] = useState(false);
  const [twoDay, setTwoDay] = useState(null);
  const [twoDayDownloading, setTwoDayDownloading] = useState(false);

  const load = () => {
    reportsApi.list().then(({ data }) => setReports(data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    reportsApi.twoDay().then(({ data }) => setTwoDay(data)).catch(() => {});
  }, []);

  const handleTwoDayDownload = async () => {
    setTwoDayDownloading(true);
    try {
      const { data } = await reportsApi.exportTwoDayPdf();
      downloadBlob(data, 'viaduc-2day-report.pdf');
      toast.success('2-day report downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setTwoDayDownloading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await reportsApi.generate({ type, range });
      toast.success('Report generated');
      load();
    } catch {
      toast.error('Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const api = format === 'pdf' ? reportsApi.exportPdf : reportsApi.exportExcel;
      const { data } = await api({ type, range });
      downloadBlob(data, `viaduc-${type}-${range}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const columns = [
    { field: 'type', headerName: 'Type' },
    { field: 'range', headerName: 'Range' },
    {
      field: 'summary',
      headerName: 'Revenue',
      renderCell: ({ value }) => formatCurrency(value?.revenue),
    },
    {
      field: 'summary',
      headerName: 'Net Profit',
      renderCell: ({ value }) => formatCurrency(value?.netProfit),
    },
    { field: 'generatedAt', headerName: 'Generated', renderCell: ({ value }) => formatDate(value) },
  ];

  if (loading) return <LoadingScreen />;

  return (
    <Box>
      <PageHeader title="Reports System" subtitle="Generate and export operational, financial, and warehouse reports" />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarClock size={18} />
              <Box>
                <Typography variant="h6" fontWeight={600}>Every 2-Day Report</Typography>
                <Typography variant="caption" color="text.secondary">
                  {twoDay
                    ? `Collections from ${formatDate(twoDay.periodFrom)} to ${formatDate(twoDay.periodTo)}`
                    : 'Loading...'}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<Download size={16} />}
              onClick={handleTwoDayDownload}
              disabled={twoDayDownloading}
            >
              Download PDF
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Materials collected (all warehouses)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Amount Spent</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(twoDay?.materials || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                          No purchases recorded in the last 2 days.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    twoDay.materials.map((m) => (
                      <TableRow key={m.material}>
                        <TableCell>{m.material}</TableCell>
                        <TableCell align="right">{formatWeight(m.weight)}</TableCell>
                        <TableCell align="right">{formatDJF(m.amountSpent)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {(twoDay?.materials || []).length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatWeight(twoDay.totalWeight)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatDJF(twoDay.totalSpent)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Grid>
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Warehouse remaining balance
              </Typography>
              {(twoDay?.warehouseBalances || []).map((w) => (
                <Box
                  key={w.warehouseId}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}
                >
                  <Typography variant="body2">{w.name}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: w.balance < 0 ? 'error.main' : 'success.main' }}>
                    {formatDJF(w.balance)}
                  </Typography>
                </Box>
              ))}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Generate Report</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Report Type" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Range" value={range} onChange={(e) => setRange(e.target.value)}>
                {REPORT_RANGES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<FileText size={16} />} onClick={handleGenerate} disabled={generating}>
                  Generate
                </Button>
                <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => handleExport('pdf')}>PDF</Button>
                <Button variant="outlined" startIcon={<Download size={16} />} onClick={() => handleExport('excel')}>Excel</Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <DataTable columns={columns} rows={reports} searchFields={['type', 'range']} />
    </Box>
  );
}
