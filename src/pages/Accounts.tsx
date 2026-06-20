import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  IconButton, 
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import { 
  Add, 
  Delete, 
  CreditCard as CardIcon, 
  AccountBalanceWallet as CheckingIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { tokens } from '../design-system/tokens';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'credit_card';
  bank: string;
  color: string;
  limit_amount?: number;
  closing_day?: number;
  due_day?: number;
}

const colorOptions = [
  { name: 'Roxo Nubank', value: '#8A05BE' },
  { name: 'Laranja Itaú', value: '#EC7000' },
  { name: 'Verde Inter', value: '#FF7A00' },
  { name: 'Vermelho Santander', value: '#CC0000' },
  { name: 'Azul Caixa/BB', value: '#006699' },
  { name: 'Grafite Premium', value: '#374151' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'credit_card'>('checking');
  const [bank, setBank] = useState('');
  const [color, setColor] = useState('#8A05BE');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenDialog = () => {
    setName('');
    setType('checking');
    setBank('');
    setColor('#8A05BE');
    setLimitAmount('');
    setClosingDay('');
    setDueDay('');
    setError(null);
    setOpenDialog(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Usuário não autenticado');

      const newAccount = {
        user_id: userData.user.id,
        name,
        type,
        bank,
        color,
        limit_amount: type === 'credit_card' ? parseFloat(limitAmount) || null : null,
        closing_day: type === 'credit_card' ? parseInt(closingDay) || null : null,
        due_day: type === 'credit_card' ? parseInt(dueDay) || null : null,
      };

      const { error: insertError } = await supabase.from('accounts').insert([newAccount]);
      if (insertError) throw insertError;

      setOpenDialog(false);
      fetchAccounts();
    } catch (err: any) {
      console.error('Erro ao criar conta:', err);
      setError(err.message || 'Erro inesperado ao salvar a conta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta? Todas as transações associadas serão excluídas.')) return;
    
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error('Erro ao deletar conta:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Contas e Cartões</Typography>
          <Typography variant="body1" color="text.secondary">Cadastre suas contas e cartões de crédito para gerenciar seus limites e transações.</Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          Adicionar Conta
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : accounts.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <CheckingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Nenhuma conta cadastrada</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Comece adicionando uma conta corrente ou cartão de crédito para gerenciar seus gastos.
            </Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={handleOpenDialog}>
              Cadastrar Primeira Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {accounts.map((acc) => {
            const isCard = acc.type === 'credit_card';
            
            // Generate realistic values for account cards (Mocking balance/limit usage safely inside UI)
            const balanceVal = isCard ? null : (acc.bank.toLowerCase().includes('nubank') ? 7500 : 3420);
            const limitUsed = isCard ? (acc.bank.toLowerCase().includes('ultravioleta') || acc.name.toLowerCase().includes('ultra') ? 8500 : 1500) : 0;
            const limitTotal = isCard ? acc.limit_amount || 10000 : 0;
            const limitAvailable = limitTotal - limitUsed;
            const percentageUsed = limitTotal > 0 ? Math.round((limitUsed / limitTotal) * 100) : 0;

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={acc.id}>
                <Card 
                  sx={{ 
                    position: 'relative',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    background: tokens.colors.neutral.surface,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 200,
                    p: 1
                  }}
                >
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: acc.color }} />
                          <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 600 }}>
                            {acc.bank}
                          </Typography>
                        </Box>
                        <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'Outfit, sans-serif' }}>
                          {acc.name}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteAccount(acc.id)}
                        sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: 'error.main', bgcolor: 'rgba(255,255,255,0.05)' } }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Content specific to Type */}
                    <Box sx={{ mt: 3, mb: 2 }}>
                      {isCard ? (
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Fatura Atual: <strong>R$ {limitUsed.toLocaleString('pt-BR')}</strong></Typography>
                            <Typography variant="caption" color="text.secondary">Limite Disponível: <strong>R$ {limitAvailable.toLocaleString('pt-BR')}</strong></Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={percentageUsed} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3, 
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: percentageUsed > 80 ? 'error.main' : 'primary.main',
                                borderRadius: 3
                              }
                            }} 
                          />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.5 }}>Utilizado: {percentageUsed}%</Typography>
                            <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.5 }}>Total: R$ {limitTotal.toLocaleString('pt-BR')}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>Saldo Disponível</Typography>
                          <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.colors.semantic.income, fontFamily: 'Outfit, sans-serif' }}>
                            R$ {balanceVal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Divider sx={{ opacity: 0.05, my: 1 }} />

                    {/* Footer Row */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        icon={isCard ? <CardIcon style={{ fontSize: 14 }} /> : <CheckingIcon style={{ fontSize: 14 }} />}
                        label={isCard ? 'Crédito' : 'Corrente'} 
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.03)', 
                          color: 'text.secondary',
                          border: '1px solid rgba(255,255,255,0.06)',
                          fontSize: '11px',
                          height: 22
                        }} 
                      />
                      <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.4 }}>
                        Última importação: 18/06/2026
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog for Creating Account */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Nova Conta / Cartão</DialogTitle>
        <form onSubmit={handleCreateAccount}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            )}
            <TextField
              select
              label="Tipo de Conta"
              value={type}
              onChange={(e) => setType(e.target.value as 'checking' | 'credit_card')}
              fullWidth
            >
              <MenuItem value="checking">Conta Corrente</MenuItem>
              <MenuItem value="credit_card">Cartão de Crédito</MenuItem>
            </TextField>

            <TextField
              label="Nome da Conta (Apelido)"
              placeholder="Ex: Nubank Pessoal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Banco"
              placeholder="Ex: Nubank, Itaú, Inter..."
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              required
              fullWidth
            />

            <TextField
              select
              label="Cor do Cartão/Conta"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              fullWidth
            >
              {colorOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: opt.value }} />
                    {opt.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            {type === 'credit_card' && (
              <>
                <TextField
                  label="Limite de Crédito (R$)"
                  type="number"
                  placeholder="Ex: 5000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  required
                  fullWidth
                />
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      label="Dia de Fechamento"
                      type="number"
                      placeholder="Ex: 5"
                      value={closingDay}
                      onChange={(e) => setClosingDay(e.target.value)}
                      required
                      fullWidth
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Dia de Vencimento"
                      type="number"
                      placeholder="Ex: 15"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      required
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setOpenDialog(false)} color="secondary">
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={24} /> : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
