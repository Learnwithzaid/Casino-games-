import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Games as GamesIcon,
  People as PeopleIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  HistoryOutlined as AuditIcon,
  Logout as LogoutIcon,
  AccountCircle as ProfileIcon,
  ChevronRight,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/authStore';
import { canViewSection } from '@/utils/rbac';

const DRAWER_WIDTH = 260;

const Layout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', section: 'dashboard' },
    { label: 'Games', icon: <GamesIcon />, path: '/games', section: 'games' },
    { label: 'Users', icon: <PeopleIcon />, path: '/users', section: 'users' },
    {
      label: 'Transactions',
      icon: <PaymentIcon />,
      path: '/transactions',
      section: 'transactions',
    },
    { label: 'Audit Logs', icon: <AuditIcon />, path: '/audit-logs', section: 'auditLogs' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings', section: 'settings' },
  ];

  const visibleItems = navigationItems.filter((item) => canViewSection(user, item.section));

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Admin Panel
        </Typography>
      </Box>
      <List>
        {visibleItems.map((item) => (
          <ListItem
            key={item.path}
            disablePadding
            sx={{
              bgcolor:
                location.pathname === item.path
                  ? 'action.selected'
                  : 'transparent',
            }}
          >
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => ({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        path: '/' + segment,
      }));

    return pathSegments;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Admin Dashboard
          </Typography>
          <IconButton
            onClick={handleProfileMenu}
            color="inherit"
            sx={{ ml: 2 }}
          >
            <ProfileIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.email}</Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="textSecondary">
                {user?.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: '64px',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          ml: { xs: 0, sm: `${DRAWER_WIDTH}px` },
          bgcolor: '#f5f5f5',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {breadcrumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 3 }}>
            <Link
              component="button"
              onClick={() => navigate('/dashboard')}
              sx={{ cursor: 'pointer' }}
            >
              Dashboard
            </Link>
            {breadcrumbs.map((crumb, idx) => (
              <Typography key={idx} color="textPrimary">
                {crumb.label}
              </Typography>
            ))}
          </Breadcrumbs>
        )}

        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
