import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Dashboard,
  AccountBalance,
  CloudUpload,
  RateReview,
  ReceiptLong,
  ExitToApp,
  AccountBalanceWallet,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import type { PageType } from '../types';
import { supabase } from '../supabaseClient';
import { tokens } from '../design-system/tokens';

interface SidebarLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function SidebarLayout({ children, currentPage, onNavigate }: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // Collapsible state (stored in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
      }
    });
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    localStorage.setItem('sidebar-collapsed', String(nextCollapsed));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { text: 'Início', icon: <Dashboard />, value: 'dashboard' as PageType },
    { text: 'Contas', icon: <AccountBalance />, value: 'accounts' as PageType },
    { text: 'Importar', icon: <CloudUpload />, value: 'upload' as PageType },
    { text: 'Revisar', icon: <RateReview />, value: 'review' as PageType },
    { text: 'Transações', icon: <ReceiptLong />, value: 'transactions' as PageType },
  ];

  const drawerWidth = isCollapsed ? 72 : 220;

  const drawerContent = (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: tokens.colors.neutral.surface,
        transition: 'all 150ms ease',
        overflowX: 'hidden'
      }}
    >
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: isCollapsed ? 2 : 2.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <AccountBalanceWallet sx={{ color: 'primary.main', fontSize: 28 }} />
        {!isCollapsed && (
          <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 'bold', color: 'text.primary', letterSpacing: -0.5 }}>
            FinControl
          </Typography>
        )}
      </Toolbar>
      <Divider sx={{ borderColor: tokens.colors.neutral.border }} />
      
      <List sx={{ px: 1.5, py: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {menuItems.map((item) => {
          const isActive = currentPage === item.value;
          const button = (
            <ListItemButton
              onClick={() => {
                onNavigate(item.value);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 3,
                py: 1,
                px: isCollapsed ? 1.5 : 2,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                bgcolor: isActive ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
                color: isActive ? 'primary.main' : 'text.secondary',
                minHeight: 48,
                transition: 'all 150ms ease',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(168, 85, 247, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? 'primary.main' : 'text.primary',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  }
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: isActive ? 'primary.main' : 'inherit', 
                  minWidth: isCollapsed ? 0 : 36,
                  justifyContent: 'center',
                  transition: 'color 150ms ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText 
                  primary={
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500 }}>
                      {item.text}
                    </Typography>
                  } 
                />
              )}
            </ListItemButton>
          );

          return (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              {isCollapsed ? (
                <Tooltip title={item.text} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: tokens.colors.neutral.border }} />

      {/* Toggle collapse button */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', py: 1 }}>
        <IconButton onClick={handleToggleCollapse} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
      
      <Divider sx={{ borderColor: tokens.colors.neutral.border }} />
      
      {/* User Information */}
      <Box sx={{ p: isCollapsed ? 1.5 : 2, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', width: 32, height: 32, fontSize: '0.9rem' }}>
          {userEmail ? userEmail[0].toUpperCase() : 'U'}
        </Avatar>
        {!isCollapsed && (
          <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              André Avancini
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {userEmail}
            </Typography>
          </Box>
        )}
        {!isCollapsed && (
          <Tooltip title="Sair">
            <IconButton onClick={handleLogout} size="small" sx={{ color: 'error.main' }}>
              <ExitToApp fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: tokens.colors.neutral.background }}>
      {/* Top Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(11, 10, 14, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${tokens.colors.neutral.border}`,
          transition: 'all 150ms ease',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '1.1rem' }}>
            {menuItems.find(item => item.value === currentPage)?.text || 'FinControl'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', cursor: 'pointer', width: 32, height: 32 }}
            >
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </Avatar>
             <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              slotProps={{
                paper: { sx: { mt: 1, bgcolor: tokens.colors.neutral.surface, border: `1px solid ${tokens.colors.neutral.border}`, borderRadius: 3 } }
              }}
            >
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', gap: 1, fontSize: '0.9rem' }}>
                <ExitToApp fontSize="small" /> Sair da Conta
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 }, transition: 'all 150ms ease' }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 220, borderRight: `1px solid ${tokens.colors.neutral.border}` },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              borderRight: `1px solid ${tokens.colors.neutral.border}`,
              transition: 'width 150ms ease',
              overflow: 'hidden'
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 4,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: tokens.colors.neutral.background,
          transition: 'all 150ms ease',
        }}
      >
        <Box sx={{ maxWidth: '1440px', margin: '0 auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
