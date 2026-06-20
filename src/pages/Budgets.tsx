import { useState, useEffect } from 'react';
import { 
  Box, 
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
  Alert,
  Grid,
  LinearProgress,
  Paper
} from '@mui/material';
import { 
  Add, 
  Delete, 
  Edit,
  PieChart as PieIcon,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { tokens } from '../design-system/tokens';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: string;
  categories: Category;
}

interface Transaction {
  amount: number;
  category: string;
  date: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form states
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (catError) throw catError;
      setCategories(catData || []);

      // 2. Fetch budgets with category join
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          id,
          category_id,
          amount,
          period,
          categories (
            id,
            name,
            color
          )
        `);
      if (budgetError) throw budgetError;
      setBudgets((budgetData as any) || []);

      // 3. Fetch confirmed transactions for the current month to calculate spent amount
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0];

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('amount, category, date')
        .eq('category_confirmed', true)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (txError) throw txError;

      // Aggregate spent amount per category (only negative amounts / expenses)
      const spent: Record<string, number> = {};
      (txData || []).forEach((tx: Transaction) => {
        const val = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
        if (val < 0) {
          const catName = tx.category || 'Outros';
          spent[catName] = (spent[catName] || 0) + Math.abs(val);
        }
      });
      setSpentMap(spent);

    } catch (err) {
      console.error('Erro ao buscar dados de orçamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setCategoryId('');
    setAmount('');
    setEditingBudget(null);
    setError(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setCategoryId(budget.category_id);
    setAmount(budget.amount.toString());
    setEditingBudget(budget);
    setError(null);
    setOpenDialog(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const limitAmount = parseFloat(amount);
    if (isNaN(limitAmount) || limitAmount <= 0) {
      setError('Insira um valor limite válido maior que zero.');
      setSubmitting(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Usuário não autenticado');

      if (editingBudget) {
        // Edit
        const { error: updateError } = await supabase
          .from('budgets')
          .update({ amount: limitAmount })
          .eq('id', editingBudget.id);
        if (updateError) throw updateError;
      } else {
        // Create
        const { error: insertError } = await supabase
          .from('budgets')
          .insert([{ 
            user_id: userData.user.id,
            category_id: categoryId,
            amount: limitAmount,
            period: 'monthly'
          }]);
        if (insertError) throw insertError;
      }

      setOpenDialog(false);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar orçamento:', err);
      setError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Deseja realmente remover este orçamento?')) return;
    
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Erro ao deletar orçamento:', err);
    }
  };

  // Calculations for Summary
  const totalLimit = budgets.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSpent = budgets.reduce((acc, curr) => {
    const catName = curr.categories?.name;
    const spentAmount = spentMap[catName] || 0;
    return acc + spentAmount;
  }, 0);
  const totalPercent = totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0;

  // Filter categories that already have a budget (except the one being edited)
  const availableCategories = categories.filter(cat => 
    !budgets.some(b => b.category_id === cat.id) || (editingBudget && editingBudget.category_id === cat.id)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Orçamentos</Typography>
          <Typography variant="body1" color="text.secondary">Defina limites mensais para suas categorias e acompanhe o progresso de gastos.</Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={handleOpenCreate}
          disabled={categories.length === 0}
        >
          Novo Orçamento
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Warning sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Nenhuma categoria disponível</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Crie categorias antes de definir um planejamento orçamentário.
            </Typography>
          </CardContent>
        </Card>
      ) : budgets.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <PieIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Nenhum orçamento cadastrado</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Adicione limites de gastos mensais para manter suas finanças sob controle.
            </Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={handleOpenCreate}>
              Criar Primeiro Orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* General Summary Card */}
          <Paper 
            sx={{ 
              p: 3, 
              borderColor: tokens.colors.neutral.border,
              background: `linear-gradient(135deg, ${tokens.colors.neutral.surface} 0%, rgba(168, 85, 247, 0.05) 100%)`,
              borderRadius: 4
            }}
          >
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Limite Total Orçado</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5 }}>
                  R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" color="text.secondary">Total Consumido no Mês</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, color: totalSpent > totalLimit ? 'error.main' : 'text.primary' }}>
                  R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Utilização Total</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{totalPercent.toFixed(0)}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={totalPercent} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4, 
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor: totalSpent > totalLimit ? tokens.colors.semantic.expense : 'primary.main'
                    }
                  }} 
                />
              </Grid>
            </Grid>
          </Paper>

          {/* List of Budgets */}
          <Grid container spacing={3}>
            {budgets.map((b) => {
              const catName = b.categories?.name || 'Desconhecida';
              const catColor = b.categories?.color || '#8A05BE';
              const spent = spentMap[catName] || 0;
              const percent = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
              const isOver = spent > b.amount;
              const isWarning = !isOver && spent >= b.amount * 0.85;

              let progressColor = 'primary.main';
              if (isOver) progressColor = tokens.colors.semantic.expense;
              else if (isWarning) progressColor = tokens.colors.semantic.warning || '#F1C40F';

              return (
                <Grid size={{ xs: 12, md: 6 }} key={b.id}>
                  <Card 
                    sx={{ 
                      borderColor: tokens.colors.neutral.border,
                      background: tokens.colors.neutral.surface,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      '&:hover': {
                        borderColor: 'rgba(168, 85, 247, 0.2)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: catColor }} />
                        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{catName}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleOpenEdit(b)} sx={{ color: 'primary.main' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteBudget(b.id)} sx={{ color: 'error.main' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / <strong>R$ {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: progressColor }}>
                          {percent.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={percent} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            bgcolor: progressColor
                          }
                        }} 
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {isOver ? (
                          <span style={{ color: tokens.colors.semantic.expense, fontWeight: 'bold' }}>
                            R$ {(spent - b.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} acima do limite
                          </span>
                        ) : (
                          <span>
                            R$ {(b.amount - spent).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} restante
                          </span>
                        )}
                      </Typography>
                      {isOver && <TrendingUp sx={{ color: 'error.main', fontSize: 18 }} />}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* dialog for Edit/Create Budget */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
        <form onSubmit={handleSaveBudget}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            )}

            <TextField
              select
              label="Categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={editingBudget !== null}
              required
              fullWidth
            >
              {availableCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: cat.color }} />
                    {cat.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Valor Limite Mensal (R$)"
              placeholder="Ex: 500.00"
              type="number"
              slotProps={{ htmlInput: { step: '0.01', min: '0.01' } }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
            />
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
