import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { ChartContainer, chartColors, ChartTooltip, ChartLegend } from '../../components/charts/ChartWrapper';
import { analyticsApi, containerApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.dashboard(), containerApi.analytics()])
      .then(([dash, exp]) => {
        setData(dash.data);
        setExportData(exp.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading analytics..." />;

  const { charts } = data || {};
  const exportByStatus = Object.entries(exportData?.byStatus || {}).map(([name, value]) => ({ name, value }));

  return (
    <Box>
      <PageHeader title="Analytics" subtitle="Deep dive into operations, revenue, and exports" />

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Profit Analytics</Typography>
              <ChartContainer height={280}>
                <BarChart data={charts?.profitAnalytics || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v / 1000}k`} />
                  <ChartTooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {(charts?.profitAnalytics || []).map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>Export Status Distribution</Typography>
              <ChartContainer height={280}>
                <PieChart>
                  <Pie data={exportByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={false}>
                    {exportByStatus.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                  </Pie>
                  <ChartTooltip />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Stock Movement (Area)</Typography>
              <ChartContainer height={320}>
                <AreaChart data={charts?.stockMovementTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="value" stroke={chartColors[2]} fill={chartColors[2]} fillOpacity={0.3} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Revenue Trend</Typography>
              <ChartContainer height={280}>
                <LineChart data={charts?.revenueAnalytics || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="value" stroke={chartColors[0]} strokeWidth={2} dot={{ r: 5 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Product Weight Distribution</Typography>
              <ChartContainer height={280}>
                <BarChart data={charts?.productStatistics || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                  <YAxis />
                  <ChartTooltip />
                  <Bar dataKey="weight" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
