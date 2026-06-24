import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  Button,
  Badge,
} from '@mui/material';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  DollarSign,
  Tag,
  Container,
  FileText,
  BarChart3,
  Users,
  Settings,
  PackageOpen,
  Menu as MenuIcon,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Search,
  Bell,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { reportsApi } from '../services/api';
import { downloadBlob } from '../utils/formatters';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Executive Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Inventory Management', path: '/admin/inventory', icon: Package },
  { label: 'Warehouses', path: '/admin/warehouses', icon: Warehouse },
  { label: 'Financial Ledger', path: '/admin/finance', icon: DollarSign },
  { label: 'Pricing', path: '/admin/pricing', icon: Tag },
  { label: 'Trade Logistics', path: '/admin/containers', icon: Container },
  { label: 'Reports', path: '/admin/reports', icon: FileText },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { label: 'Opening Stock', path: '/admin/opening-stock', icon: PackageOpen },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'System Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [bellAnchor, setBellAnchor] = useState(null);
  const [twoDayDue, setTwoDayDue] = useState(false);
  const [twoDayPeriod, setTwoDayPeriod] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    let active = true;
    reportsApi.twoDayDue()
      .then(({ data }) => {
        if (active && data?.due) {
          setTwoDayDue(true);
          setTwoDayPeriod({ from: data.periodFrom, to: data.periodTo });
          toast.info('A 2-day report is ready. Open notifications to download it.');
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const handleDownloadTwoDay = async () => {
    setDownloading(true);
    try {
      const { data: blob } = await reportsApi.exportTwoDayPdf();
      downloadBlob(blob, 'viaduc-2day-report.pdf');
      setTwoDayDue(false);
      setBellAnchor(null);
      toast.success('2-day report downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Typography fontWeight={800} fontSize={20} letterSpacing={-0.5}>
          Viaduc ERP
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: 2, fontSize: 9, fontWeight: 600 }}
        >
          INDUSTRIAL PRECISION
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/admin' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => { navigate(item.path); if (isMobile) setOpen(false); }}
              sx={{
                borderRadius: 1.5,
                mb: 0.25,
                py: 1,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  borderLeft: '3px solid',
                  borderColor: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'text.primary' },
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'text.primary' : 'text.secondary' }}>
                <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? 'text.primary' : 'text.secondary',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />
      <List sx={{ px: 1.5, py: 1 }}>
        <ListItemButton sx={{ borderRadius: 1.5, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}><HelpCircle size={18} /></ListItemIcon>
          <ListItemText primary="Support" primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }} />
        </ListItemButton>
        <ListItemButton sx={{ borderRadius: 1.5, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}><Bell size={18} /></ListItemIcon>
          <ListItemText primary="Notifications" primaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }} />
        </ListItemButton>
      </List>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'grey.700', fontSize: 13 }}>
            {user?.name?.[0] || 'A'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user?.name || 'Admin'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role === 'admin' ? 'Chief Operator' : 'Stock Worker'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: open ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          ml: { md: open ? `${DRAWER_WIDTH}px` : 0 },
          bgcolor: 'background.default',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: { xs: 0.5, sm: 1.5 }, minHeight: { xs: 56, sm: 64 } }}>
          <IconButton edge="start" onClick={() => setOpen(!open)} sx={{ mr: 0.5 }}>
            {open && !isMobile ? <ChevronLeft size={20} /> : <MenuIcon size={20} />}
          </IconButton>

          <TextField
            size="small"
            placeholder="Search Global Inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              flex: 1,
              maxWidth: 480,
              display: { xs: 'none', sm: 'block' },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
                borderRadius: 2,
                fontSize: 14,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#888" />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ flex: 1, display: { xs: 'block', sm: 'none' } }} />

          <Button
            variant="outlined"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => navigate('/seller/entry')}
            sx={{
              borderColor: 'divider',
              color: 'text.primary',
              display: { xs: 'none', md: 'flex' },
            }}
          >
            Quick Entry
          </Button>
          <IconButton onClick={toggleMode} size="small" sx={{ display: { xs: 'flex', md: 'none' } }}>
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton size="small" onClick={(e) => setBellAnchor(e.currentTarget)}>
            <Badge color="error" variant="dot" invisible={!twoDayDue}>
              <Bell size={18} />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={bellAnchor}
            open={!!bellAnchor}
            onClose={() => setBellAnchor(null)}
            slotProps={{ paper: { sx: { width: 300, maxWidth: '90vw' } } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            </Box>
            <Divider />
            {twoDayDue ? (
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="body2" fontWeight={600}>2-Day report ready</Typography>
                {twoDayPeriod && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {new Date(twoDayPeriod.from).toLocaleDateString()} – {new Date(twoDayPeriod.to).toLocaleDateString()}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Materials collected, amount spent, and each warehouse balance.
                </Typography>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  startIcon={<FileText size={14} />}
                  onClick={handleDownloadTwoDay}
                  disabled={downloading}
                >
                  Download PDF
                </Button>
              </Box>
            ) : (
              <Box sx={{ px: 2, py: 2 }}>
                <Typography variant="body2" color="text.secondary">No new notifications</Typography>
              </Box>
            )}
          </Menu>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.700', fontSize: 13 }}>
              {user?.name?.[0] || 'A'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{user?.email}</MenuItem>
            <Divider />
            <MenuItem onClick={toggleMode}>
              {mode === 'dark' ? <Sun size={16} style={{ marginRight: 8 }} /> : <Moon size={16} style={{ marginRight: 8 }} />}
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </MenuItem>
            <MenuItem onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={16} style={{ marginRight: 8 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open && !isMobile ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.standard }),
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: 7, sm: 8 },
          width: {
            md: open ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          maxWidth: '100%',
          overflowX: 'hidden',
          transition: theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.standard }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
