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
  Chip
} from '@mui/material';
import { 
  Add, 
  Delete, 
  CreditCard as CardIcon, 
  AccountBalanceWallet as CheckingIcon 
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

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

  // Campos do formulário
  const [name, setName] = useState('');
  const [type, setType] = useState<'checking' | 'credit_card'>('checking');
  const [bank, setBank] = useState('');
  const [color, setColor] = useState('#2196F3');
  const [limitAmount, setLimitAmount] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setColor('#2196F3');
    setLimitAmount('');
    setClosingDay('');
    setDueDay('');
    setOpenDialog(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

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

      const { error } = await supabase.from('accounts').insert([newAccount]);
      if (error) throw error;

      setOpenDialog(false);
      fetchAccounts();
    } catch (err) {
      console.error('Erro ao criar conta:', err);
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
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Minhas Contas e Cartões</Typography>
          <Typography variant="body2" color="text.secondary">Cadastre suas contas correntes e cartões de crédito para importar faturas.</Typography>
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
        <Card sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper' }}>
          <CardContent>
            <CheckingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nenhuma conta cadastrada</Typography>
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
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={acc.id}>
                <Card 
                  sx={{ 
                    position: 'relative',
                    background: `linear-gradient(135deg, ${acc.color}dd 0%, ${acc.color} 100%)`,
                    color: '#FFF',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                  }}
                >
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ opacity: 0.8, fontWeight: 'medium' }}>
                          {acc.bank}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                          {acc.name}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteAccount(acc.id)}
                        sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#FFAFAF', bgcolor: 'rgba(255,255,255,0.1)' } }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        icon={isCard ? <CardIcon style={{ color: '#FFF' }} /> : <CheckingIcon style={{ color: '#FFF' }} />}
                        label={isCard ? 'Cartão de Crédito' : 'Conta Corrente'} 
                        size="small"
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontWeight: 500
                        }} 
                      />
                      {isCard && acc.limit_amount && (
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: 'block' }}>Limite</Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            R$ {acc.limit_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {isCard && (
                      <Box sx={{ display: 'flex', gap: 2, mt: 1.5, borderTop: '1px solid rgba(255,255,255,0.15)', pt: 1 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Fechamento: <strong>Dia {acc.closing_day}</strong>
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          Vencimento: <strong>Dia {acc.due_day}</strong>
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog para Cadastro/Adição de Conta */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Nova Conta / Cartão</DialogTitle>
        <form onSubmit={handleCreateAccount}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
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
            <Button onClick={() => setOpenDialog(false)} color="inherit">
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
