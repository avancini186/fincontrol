import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TextField, 
  MenuItem, 
  Grid, 
  CircularProgress,
  IconButton,
  Button,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Search, 
  Clear, 
  FileDownload,
  Delete,
  Edit
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';

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

  // Filtros
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Carregar contas para filtro
      const { data: accountsData } = await supabase.from('accounts').select('id, name');
      setAccounts(accountsData || []);

      // 2. Carregar categorias para filtro
      const { data: categoriesData } = await supabase.from('categories').select('id, name');
      setCategories(categoriesData || []);

      // 3. Buscar transações
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
        query = query.ilike('description', `%${search}%`);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Histórico de Gastos</Typography>
          <Typography variant="body2" color="text.secondary">
            Consulte todas as transações importadas e confirmadas em seu painel.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
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
          >
            Exportar CSV
          </Button>
        </Box>
      </Box>

      {/* Grid de Filtros */}
      <Card sx={{ mb: 4, bgcolor: 'background.paper', p: 1 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Buscar por descrição"
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary">Nenhuma transação encontrada</Typography>
            <Typography variant="body2" color="text.secondary">
              Ajuste seus filtros ou faça uma nova importação de extrato.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 3 }}>
          <Table sx={{ minWidth: 650 }} size="medium">
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Categoria</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Conta Origem</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Valor (R$)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const isExpense = tx.amount < 0;
                
                // Formatar data localmente
                const formattedDate = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR');
                
                return (
                  <TableRow 
                    key={tx.id} 
                    hover 
                    selected={isSelected}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(tx.id, e.target.checked)}
                      />
                    </TableCell>

                    {/* Data */}
                    <TableCell>{formattedDate}</TableCell>

                    {/* Descrição */}
                    <TableCell sx={{ fontWeight: 500 }}>{tx.description}</TableCell>

                    {/* Categoria */}
                    <TableCell>
                      <Chip 
                        label={tx.category || 'Outros'} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(255,255,255,0.04)', fontWeight: 500 }}
                      />
                    </TableCell>

                    {/* Conta Origem */}
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {tx.accounts ? `${tx.accounts.name} (${tx.accounts.bank})` : '-'}
                    </TableCell>

                    {/* Valor */}
                    <TableCell 
                      sx={{ 
                        textAlign: 'right', 
                        fontWeight: 'bold', 
                        color: isExpense ? '#F2B8B5' : '#81C784' 
                      }}
                    >
                      {isExpense ? '-' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Ações */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton size="small" color="primary" onClick={() => handleStartEdit(tx)}>
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal de Edição */}
      <Dialog 
        open={!!editingId} 
        onClose={handleCancelEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Transação</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Box sx={{ height: 8 }} /> {/* Spacer */}
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
