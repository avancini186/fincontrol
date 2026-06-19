import { useEffect, useState } from 'react';
import { 
  Box, 
  CircularProgress,
} from '@mui/material';
import { supabase } from './supabaseClient';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import AccountsPage from './pages/Accounts';
import UploadPage from './pages/Upload';
import ReviewPage from './pages/Review';
import TransactionsPage from './pages/Transactions';
import SidebarLayout from './components/SidebarLayout';
import { useAppStore } from './stores/useAppStore';


export default function App() {
  console.log("App component executing...");
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Ouvir mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  if (loading) {
    return (
      <Box 
        sx={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'background.default'
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  // Renderização da página ativa
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'accounts':
        return <AccountsPage />;
      case 'upload':
        return <UploadPage onNavigate={setCurrentPage} />;
      case 'review':
        return <ReviewPage onNavigate={setCurrentPage} />;
      case 'transactions':
        return <TransactionsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <SidebarLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </SidebarLayout>
  );
}
