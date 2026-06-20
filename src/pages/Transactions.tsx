import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  MenuItem, 
  Grid, 
  IconButton,
  Button,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  Collapse
} from '@mui/material';
import { 
  Search, 
  Clear, 
  FileDownload,
  Delete,
  Edit,
  KeyboardArrowDown,
  KeyboardArrowUp,
  SwapHoriz
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { tokens } from '../design-system/tokens';
import { TransactionListSkeleton } from '../components/SkeletonLoader';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  accounts: {
    name: string;
    bank: string;
  };
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Load accounts for dropdown filter
      const { data: accountsData } = await supabase.from('accounts').select('id, name');
      setAccounts(accountsData || []);

      // 2. Load categories for dropdown filter
      const { data: categoriesData } = await supabase.from('categories').select('id, name');
      setCategories(categoriesData || []);

      // 3. Search query building
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          type,
          category,
          accounts (name, bank)
        `)
        .eq('category_confirmed', true)
        .order('date', { ascending: false });

      if (accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (search) {
        query = query.or(`description.ilike.%${search}%,category.ilike.%${search}%,payee.ilike.%${search}%`);
      }

      const { data: txData, error } = await query;
      if (error) throw error;
      setTransactions(txData as any || []);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [accountFilter, categoryFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setAccountFilter('all');
    setCategoryFilter('all');
    setSelectedIds([]);
    fetchData();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir as ${selectedIds.length} transações selecionadas?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error('Erro ao excluir transações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          date: editForm.date,
          description: editForm.description,
          category: editForm.category,
          amount: editForm.amount
        })
        .eq('id', editingId);

      if (error) throw error;

      setTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...editForm } as Transaction : t));
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Data', 'Descricao', 'Valor (R$)', 'Categoria', 'Conta/Banco'];
    const rows = transactions.map(tx => [
      tx.date,
      tx.description,
      tx.amount,
      tx.category || 'Outros',
      `${tx.accounts?.name || ''} (${tx.accounts?.bank || ''})`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fincontrol_extrato_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Histórico de Gastos</Typography>
          <Typography variant="body1" color="text.secondary">
            Consulte todas as transações importadas e confirmadas em seu painel.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignSelf: 'stretch', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={handleDeleteSelected}
            >
              Excluir Selecionadas ({selectedIds.length})
            </Button>
          )}
          <Button 
            variant="outlined" 
            startIcon={<FileDownload />} 
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            sx={{ border: `1px solid ${tokens.colors.neutral.border}` }}
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {/* Filters Form Panel */}
      <Card sx={{ mb: 4, bgcolor: tokens.colors.neutral.surface, borderColor: tokens.colors.neutral.border, p: 1 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Buscar transação"
                placeholder="Pesquise por nome, valor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchData()}
                slotProps={{
                  input: {
                    endAdornment: search ? (
                      <IconButton size="small" onClick={() => { setSearch(''); fetchData(); }}>
                        <Clear />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={fetchData}>
                        <Search />
                      </IconButton>
                    )
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filtrar por Conta"
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
              >
                <MenuItem value="all">Todas as Contas</MenuItem>
                {accounts.map(acc => (
                  <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Filtrar por Categoria"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">Todas as Categorias</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.name} value={cat.name}>{cat.name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 2 }}>
              <Button 
                fullWidth 
                variant="text" 
                color="secondary" 
                onClick={handleClearFilters}
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? (
        <TransactionListSkeleton />
      ) : transactions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Nenhuma transação encontrada</Typography>
            <Typography variant="body2" color="text.secondary">
              Ajuste seus filtros ou faça uma nova importação de extrato.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Select all header */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 3, mb: 1 }}>
            <Checkbox
              indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
              checked={transactions.length > 0 && selectedIds.length === transactions.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              sx={{ p: 0, mr: 2 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>
              Selecionar todas as transações filtradas
            </Typography>
          </Box>

          {/* Transaction items */}
          {transactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            const isExpense = tx.amount < 0;
            const formattedDate = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR');
            const isExpanded = expandedId === tx.id;

            return (
              <Card 
                key={tx.id}
                sx={{
                  transition: 'all 150ms ease',
                  borderColor: isSelected ? 'rgba(168, 85, 247, 0.4)' : tokens.colors.neutral.border,
                  bgcolor: isSelected ? 'rgba(168, 85, 247, 0.02)' : tokens.colors.neutral.surface,
                }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      flexWrap: { xs: 'wrap', md: 'nowrap' }, 
                      gap: 2, 
                      p: 2, 
                      cursor: 'pointer' 
                    }}
                    onClick={() => toggleExpand(tx.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: { xs: 1, md: 0 } }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(tx.id, e.target.checked)}
                        sx={{ p: 0 }}
                      />
                      <Avatar sx={{ bgcolor: isExpense ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)', color: isExpense ? 'error.main' : 'success.main', width: 36, height: 36 }}>
                        <SwapHoriz />
                      </Avatar>
                    </Box>

                    {/* Transaction Details */}
                    <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto', md: '35%' } }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {tx.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                        <Typography variant="caption" color="text.secondary">•</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tx.accounts ? `${tx.accounts.name} (${tx.accounts.bank})` : '-'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Category Chip */}
                    <Box sx={{ minWidth: 120 }}>
                      <Chip 
                        label={tx.category || 'Outros'} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontWeight: 600, fontSize: '11px' }}
                      />
                    </Box>

                    {/* Amount & Actions */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 3, 
                        justifyContent: 'space-between',
                        minWidth: { xs: '100%', sm: 180 },
                        ml: 'auto'
                      }}
                    >
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 700, 
                          fontFamily: 'Outfit, sans-serif',
                          color: isExpense ? tokens.colors.semantic.expense : tokens.colors.semantic.income 
                        }}
                      >
                        {isExpense ? '-' : '+'} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" color="primary" onClick={() => handleStartEdit(tx)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => toggleExpand(tx.id)}>
                          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>

                  {/* Collapse details */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ opacity: 0.05 }} />
                    <Box sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Código Identificador (ID)</Typography>
                          <Typography variant="body2" sx={{ fontSize: '12px', opacity: 0.8 }}>{tx.id}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Tipo de Movimentação</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{tx.type || 'Lançamento'}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Edit Overlay Modal */}
      <Dialog 
        open={!!editingId} 
        onClose={handleCancelEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Transação</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Box sx={{ height: 8 }} />
          <TextField
            label="Data"
            type="date"
            value={editForm.date || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Descrição"
            value={editForm.description || ''}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Categoria"
            value={editForm.category || 'Outros'}
            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
            fullWidth
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.name}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Valor (R$)"
            type="number"
            value={editForm.amount || 0}
            onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCancelEdit} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
