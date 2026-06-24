import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function PageHeader({ title, subtitle, breadcrumbs = [], action }) {
  return (
    <Box
      sx={{
        mb: 3,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 1 }}>
            {breadcrumbs.map((b, i) =>
              b.to ? (
                <Link key={i} component={RouterLink} to={b.to} underline="hover" color="inherit" variant="body2">
                  {b.label}
                </Link>
              ) : (
                <Typography key={i} color="text.primary" variant="body2">{b.label}</Typography>
              )
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h4" fontWeight={700}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>
        )}
      </Box>
      {action && (
        <Box sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0, '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
          {action}
        </Box>
      )}
    </Box>
  );
}
