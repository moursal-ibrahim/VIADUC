import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, actions, maxWidth = 'sm', fullWidth = true }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pr: 1 }}>
        <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: 1,
            '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
