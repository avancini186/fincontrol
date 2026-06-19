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
  AccountBalanceWallet
} from '@mui/icons-material';
import type { PageType } from '../types';
import { supabase } from '../supabaseClient';

const drawerWidth = 260;

interface SidebarLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export default function SidebarLayout({ children, currentPage, onNavigate }: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, value: 'dashboard' as PageType },
    { text: 'Contas e Cartões', icon: <AccountBalance />, value: 'accounts' as PageType },
    { text: 'Importar Arquivos', icon: <CloudUpload />, value: 'upload' as PageType },
    { text: 'Revisar Lançamentos', icon: <RateReview />, value: 'review' as PageType },
    { text: 'Histórico de Gastos', icon: <ReceiptLong />, value: 'transactions' as PageType },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5 }}>
        <AccountBalanceWallet sx={{ color: 'primary.main', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 'bold', color: 'text.primary' }}>
          FinControl
        </Typography>
      </Toolbar>
      <Divider sx={{ opacity: 0.1 }} />
      
      <List sx={{ px: 2, py: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {menuItems.map((item) => {
          const isActive = currentPage === item.value;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  onNavigate(item.value);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 7, // Pill shaped item for Material 3
                  py: 1.2,
                  px: 2,
                  bgcolor: isActive ? 'primary.dark' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? 'primary.main' : 'text.primary',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: isActive ? 600 : 500 }} 
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ opacity: 0.1 }} />
      
      {/* Informações do Usuário no Rodapé da Sidebar */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', width: 36, height: 36 }}>
          {userEmail ? userEmail[0].toUpperCase() : 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            Usuário
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {userEmail}
          </Typography>
        </Box>
        <Tooltip title="Sair">
          <IconButton onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ExitToApp />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(20, 18, 24, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
            {menuItems.find(item => item.value === currentPage)?.text || 'FinControl'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', cursor: 'pointer', width: 36, height: 36 }}
            >
              {userEmail ? userEmail[0].toUpperCase() : 'U'}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: { mt: 1, bgcolor: 'background.paper', borderRadius: 3 }
              }}
            >
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', gap: 1 }}>
                <ExitToApp fontSize="small" /> Sair da Conta
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255, 255, 255, 0.08)' },
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255, 255, 255, 0.08)' },
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
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
