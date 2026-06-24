import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'primary.main', trend, loading }) {
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Skeleton height={24} width="60%" />
          <Skeleton height={40} width="80%" sx={{ my: 1 }} />
          <Skeleton height={20} width="40%" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ color, fontSize: { xs: '1.25rem', sm: '1.5rem' } }} noWrap title={String(value)}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: `${color}15`,
                color,
                display: 'flex',
              }}
            >
              <Icon size={22} />
            </Box>
          )}
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
            {trend >= 0 ? (
              <TrendingUp size={14} color="#10B981" />
            ) : (
              <TrendingDown size={14} color="#ef4444" />
            )}
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
