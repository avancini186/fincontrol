import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Tab, 
  Tabs, 
  Alert, 
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Email, 
  Lock, 
  Person, 
  Visibility, 
  VisibilityOff,
  AccountBalanceWallet 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
  const [tabValue, setTabValue] = useState(0); // 0 = Login, 1 = Cadastro, 2 = Recuperar Senha
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setMessage(null);
    setPassword('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (tabValue === 0) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (tabValue === 1) {
        // Cadastro
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
            }
          }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Cadastro realizado com sucesso! Verifique seu e-mail para confirmação (caso configurado) ou faça login.' });
        setTabValue(0);
      } else {
        // Recuperação de senha
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'E-mail de recuperação enviado com sucesso!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocorreu um erro inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A132B 0%, #100C1B 100%)',
        padding: 3,
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box 
            sx={{ 
              display: 'inline-flex', 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: 'primary.dark',
              color: 'primary.main',
              mb: 2
            }}
          >
            <AccountBalanceWallet sx={{ fontSize: 40 }} />
          </Box>
          <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 'bold', letterSpacing: -0.5 }}>
            FinControl
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão Financeira Descomplicada com IA
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 5,
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {tabValue !== 2 && (
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              variant="fullWidth" 
              sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Entrar" />
              <Tab label="Criar Conta" />
            </Tabs>
          )}

          {tabValue === 2 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Recuperar Senha</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Digite seu e-mail para receber as instruções de recuperação.
              </Typography>
            </Box>
          )}

          {message && (
            <Alert severity={message.type} sx={{ mb: 3, borderRadius: 3 }}>
              {message.text}
            </Alert>
          )}

          <form onSubmit={handleAuth}>
            {tabValue === 1 && (
              <TextField
                fullWidth
                label="Nome"
                placeholder="Ex: André Avancini"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <TextField
              fullWidth
              label="E-mail"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            {tabValue !== 2 && (
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}

            {tabValue === 0 && (
              <Box sx={{ textAlign: 'right', mt: 1, mb: 2 }}>
                <Button 
                  variant="text" 
                  size="small" 
                  onClick={() => setTabValue(2)}
                  sx={{ color: 'primary.main' }}
                >
                  Esqueceu a senha?
                </Button>
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ mt: tabValue === 2 ? 3 : 2, py: 1.5, fontSize: '1rem', fontWeight: 600 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : tabValue === 0 ? (
                'Entrar'
              ) : tabValue === 1 ? (
                'Criar Conta'
              ) : (
                'Enviar E-mail'
              )}
            </Button>
          </form>

          {tabValue === 2 && (
            <Button
              fullWidth
              variant="text"
              onClick={() => setTabValue(0)}
              sx={{ mt: 2, color: 'text.secondary' }}
            >
              Voltar para o Login
            </Button>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
