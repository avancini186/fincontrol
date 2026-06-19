import React, { useState, useEffect } from 'react';
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
  Button, 
  IconButton, 
  Select, 
  MenuItem, 
  TextField, 
  CircularProgress,
  Alert,
  Checkbox,
  Chip
} from '@mui/material';
import { 
  Check, 
  Delete, 
  DoneAll, 
  Refresh 
} from '@mui/icons-material';
import type { PageType } from '../types';
import { supabase } from '../supabaseClient';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  merchant: string;
  raw_description: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ReviewPageProps {
  onNavigate: (page: PageType) => void;
}

export default function ReviewPage({ onNavigate }: ReviewPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Buscar transações pendentes de confirmação
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('category_confirmed', false)
        .order('date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      // 2. Buscar categorias para o dropdown
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*');

      if (catError) throw catError;
      setCategories(catData || []);
    } catch (err) {
      console.error('Erro ao buscar dados de revisão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFieldChange = (id: string, field: keyof Transaction, value: any) => {
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, [field]: value } : tx)
    );
  };

  const handleSaveAndConfirm = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          category_confirmed: true
        })
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (err) {
      console.error('Erro ao confirmar transação:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este lançamento da importação?')) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    } catch (err) {
      console.error('Erro ao excluir transação:', err);
    }
  };

  const handleConfirmSelected = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);

    try {
      const promises = selectedIds.map(id => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return Promise.resolve();
        return supabase
          .from('transactions')
          .update({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            category: tx.category,
            category_confirmed: true
          })
          .eq('id', id);
      });

      await Promise.all(promises);
      setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error('Erro ao confirmar transações selecionadas:', err);
    } finally {
      setActionLoading(false);
    }
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Revisão de Lançamentos</Typography>
          <Typography variant="body2" color="text.secondary">
            Confirme ou edite as transações importadas antes de adicioná-las permanentemente ao seu dashboard.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={fetchData} sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            color="success"
            startIcon={<DoneAll />}
            disabled={selectedIds.length === 0 || actionLoading}
            onClick={handleConfirmSelected}
          >
            Confirmar Selecionados ({selectedIds.length})
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : transactions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Check sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Tudo em dia!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Não há lançamentos pendentes de revisão. Importe novos extratos para ver transações aqui.
            </Typography>
            <Button variant="outlined" onClick={() => onNavigate('upload')}>
              Importar Nova Fatura
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 3 }}>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Data</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Descrição Original</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Descrição na UI</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Categoria Sugerida</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Valor (R$)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const isExpense = tx.amount < 0;
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
                    
                    {/* Input de Data */}
                    <TableCell sx={{ py: 1 }}>
                      <TextField
                        type="date"
                        value={tx.date}
                        onChange={(e) => handleFieldChange(tx.id, 'date', e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>

                    {/* Descrição Original (Apenas leitura) */}
                    <TableCell sx={{ color: 'text.secondary', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={tx.raw_description || ''}>
                        <span>{tx.raw_description || '-'}</span>
                      </Tooltip>
                    </TableCell>

                    {/* Input de Descrição */}
                    <TableCell>
                      <TextField
                        value={tx.description}
                        onChange={(e) => handleFieldChange(tx.id, 'description', e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        fullWidth
                      />
                    </TableCell>

                    {/* Seleção de Categoria */}
                    <TableCell>
                      <Select
                        value={tx.category || 'Outros'}
                        onChange={(e) => handleFieldChange(tx.id, 'category', e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ minWidth: 140, fontWeight: 500 }}
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cat.color }} />
                              {cat.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Input de Valor */}
                    <TableCell sx={{ textAlign: 'right' }}>
                      <TextField
                        type="number"
                        value={tx.amount}
                        onChange={(e) => handleFieldChange(tx.id, 'amount', parseFloat(e.target.value) || 0)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        inputProps={{ style: { textAlign: 'right', fontWeight: 'bold', color: isExpense ? '#F2B8B5' : '#81C784' } }}
                        sx={{ width: 90 }}
                      />
                    </TableCell>

                    {/* Botões de Ação */}
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          color="success" 
                          onClick={() => handleSaveAndConfirm(tx.id)}
                        >
                          <Check />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDelete(tx.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
