import { Box, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function InventoryKpiCard({ title, value, subtitle, trend, trendUp, headerAction, valueColor }) {
  return (
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
        minHeight: 120,
      }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ pt: 0.25, minWidth: 0, flex: 1 }}>
          {title}
        </Typography>
        {headerAction && <Box sx={{ flexShrink: 0 }}>{headerAction}</Box>}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            letterSpacing={-0.5}
            lineHeight={1.1}
            sx={{ color: valueColor || 'text.primary', fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2rem' } }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {trend !== undefined && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              px: 1,
              py: 0.35,
              borderRadius: 10,
              flexShrink: 0,
              bgcolor: trendUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: trendUp ? 'success.main' : 'error.main',
            }}
          >
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <Typography variant="caption" fontWeight={700} fontSize={11}>
              {trend}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
