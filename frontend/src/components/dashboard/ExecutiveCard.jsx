import { Box, Typography } from '@mui/material';

export default function ExecutiveCard({
  title,
  titleHighlight,
  titleRest,
  value,
  badge,
  headerAction,
  valueColor,
  icon: Icon,
  children,
  sx = {},
}) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
        <Typography
          variant="caption"
          component="div"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            fontSize: 11,
            maxWidth: headerAction ? { xs: '100%', sm: '55%' } : { xs: '100%', sm: '70%' },
            lineHeight: 1.4,
            flex: headerAction ? 1 : undefined,
            minWidth: 0,
          }}
        >
          {titleHighlight ? (
            <>
              <Box
                component="span"
                sx={{
                  color: 'primary.main',
                  fontWeight: 800,
                  letterSpacing: 0.8,
                }}
              >
                {titleHighlight}
              </Box>
              {titleRest && (
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {' '}{titleRest}
                </Box>
              )}
            </>
          ) : (
            title
          )}
        </Typography>
        {headerAction && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {headerAction}
          </Box>
        )}
      </Box>

      {children || (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mt: 'auto',
            width: '100%',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {Icon && (
              <Box sx={{ color: 'text.secondary', opacity: 0.5, display: 'flex', flexShrink: 0 }}>
                <Icon size={28} strokeWidth={1.5} />
              </Box>
            )}
            <Typography
              variant="h4"
              fontWeight={700}
              sx={{
                color: valueColor || 'text.primary',
                letterSpacing: -0.5,
                fontSize: { xs: 24, md: 28 },
              }}
            >
              {value}
            </Typography>
          </Box>
          {badge && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                fontSize: 10,
                flexShrink: 0,
                pb: 0.5,
              }}
            >
              {badge}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
