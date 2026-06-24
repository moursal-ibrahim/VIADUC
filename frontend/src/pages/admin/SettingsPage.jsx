import { Card, CardContent, Typography, Switch, FormControlLabel, Box, Divider } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import { useThemeMode } from '../../context/ThemeModeContext';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { mode, toggleMode } = useThemeMode();
  const { user } = useAuth();

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Application preferences and account info" />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Appearance</Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleMode} />}
            label={`Dark Mode (${mode})`}
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Account</Typography>
          <Typography variant="body2" color="text.secondary">Name</Typography>
          <Typography gutterBottom>{user?.name}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">Email</Typography>
          <Typography gutterBottom>{user?.email}</Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">Role</Typography>
          <Typography>{user?.role === 'admin' ? 'Admin / Owner' : 'Seller / Stock Worker'}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>About Viaduc</Typography>
          <Typography variant="body2" color="text.secondary">
            Viaduc ERP v1.0 — Recycling & Scrap Trading Platform. Built for multi-warehouse inventory,
            financial tracking, and export logistics management.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
