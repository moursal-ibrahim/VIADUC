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
  Button,
} from '@mui/material';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  History,
  Menu as MenuIcon,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  Bell,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Overview', path: '/seller', icon: LayoutDashboard },
  { label: 'Quick Purchase', path: '/seller/entry', icon: ShoppingCart },
  { label: 'Money Tracking', path: '/seller/money', icon: Wallet },
  { label: 'History', path: '/seller/history', icon: History },
];

export default function SellerLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  useEffect(() => {
    setOpen(!isMobile);
  }, [isMobile]);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ p: 2.5, pb: 2 }}>
        <Typography fontWeight={800} fontSize={20} letterSpacing={-0.5}>
          Viaduc
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: 2, fontSize: 9, fontWeight: 600 }}
        >
          FIELD OPERATIONS
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1.5, py: 1.5 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path ||
            (item.path !== '/seller' && location.pathname.startsWith(item.path));
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
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'success.main', fontSize: 13 }}>
            {user?.name?.[0] || 'S'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>{user?.name || 'Seller'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>Stock Worker</Typography>
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

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={700} noWrap sx={{ fontSize: { xs: 16, sm: 18 } }}>
              Field Operations
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => navigate('/seller/entry')}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Quick Purchase
          </Button>
          <IconButton onClick={toggleMode} size="small">
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', fontSize: 13 }}>
              {user?.name?.[0] || 'S'}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
            <MenuItem disabled>{user?.email || user?.name}</MenuItem>
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
