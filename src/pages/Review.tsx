import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  IconButton, 
  Select, 
  MenuItem, 
  Checkbox, 
  Chip,
  Avatar,
  Divider,
  Collapse
} from '@mui/material';
import { 
  Check, 
  Delete, 
  DoneAll, 
  Refresh,
  KeyboardArrowDown,
  KeyboardArrowUp,
  SwapHoriz
} from '@mui/icons-material';
import type { PageType } from '../types';
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
  merchant: string;
  raw_description: string;
  payee?: string | null;
  institution?: string | null;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('category_confirmed', false)
        .order('date', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

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
          payee: tx.payee,
          institution: tx.institution,
          type: tx.type,
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
            payee: tx.payee,
            institution: tx.institution,
            type: tx.type,
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

  const handleBulkChangeCategory = async () => {
    if (selectedIds.length === 0 || !bulkCategory) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category: bulkCategory })
        .in('id', selectedIds);
      if (error) throw error;
      
      setTransactions(prev =>
        prev.map(tx => selectedIds.includes(tx.id) ? { ...tx, category: bulkCategory } : tx)
      );
      setBulkCategory('');
    } catch (err) {
      console.error('Erro ao atualizar categorias em lote:', err);
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getReadableType = (typeStr: string) => {
    switch (typeStr) {
      case 'PIX_ENVIADO': return { label: 'Pix Enviado', color: 'error' as const };
      case 'PIX_RECEBIDO': return { label: 'Pix Recebido', color: 'success' as const };
      case 'APLICACAO_RDB': return { label: 'Aplicação RDB', color: 'warning' as const };
      case 'RESGATE_RDB': return { label: 'Resgate RDB', color: 'success' as const };
      case 'PAGAMENTO_BOLETO': return { label: 'Boleto', color: 'default' as const };
      case 'CREDITO_CONTA': return { label: 'Crédito', color: 'success' as const };
      case 'RENDIMENTOS': return { label: 'Rendimento', color: 'success' as const };
      case 'TED_ENVIADA': return { label: 'TED Enviada', color: 'error' as const };
      case 'TED_RECEBIDA': return { label: 'TED Recebida', color: 'success' as const };
      case 'COMPRA': return { label: 'Compra', color: 'default' as const };
      case 'transfer': return { label: 'Transferência', color: 'info' as const };
      default: return { label: typeStr || 'Débito/Crédito', color: 'default' as const };
    }
  };

  return (
    <Box>
      {/* Header and top commands */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Revisão de Lançamentos</Typography>
          <Typography variant="body1" color="text.secondary">
            Confirme os detalhes das transações importadas e ajuste suas categorias.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignSelf: 'stretch', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <IconButton onClick={fetchData} sx={{ border: `1px solid ${tokens.colors.neutral.border}` }}>
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

      {/* Bulk actions options bar */}
      {selectedIds.length > 0 && (
        <Card sx={{ mb: 3, borderColor: 'primary.main', bgcolor: 'rgba(168, 85, 247, 0.03)' }}>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: '12px !important' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedIds.length} selecionados
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Select
                size="small"
                value={bulkCategory}
                displayEmpty
                onChange={(e) => setBulkCategory(e.target.value)}
                sx={{ minWidth: 160, bgcolor: 'background.default' }}
              >
                <MenuItem value="" disabled>Alterar Categoria...</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                ))}
              </Select>
              <Button 
                variant="outlined" 
                size="small" 
                disabled={!bulkCategory}
                onClick={handleBulkChangeCategory}
              >
                Aplicar
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <TransactionListSkeleton />
      ) : transactions.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Check sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Tudo limpo!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Nenhum lançamento aguardando revisão.
            </Typography>
            <Button variant="outlined" onClick={() => onNavigate('upload')}>
              Importar Novo Extrato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Header Row for Select All (Desktop view mockup helper) */}
          <Box sx={{ display: 'flex', alignItems: 'center', px: 3, mb: 1 }}>
            <Checkbox
              indeterminate={selectedIds.length > 0 && selectedIds.length < transactions.length}
              checked={transactions.length > 0 && selectedIds.length === transactions.length}
              onChange={(e) => handleSelectAll(e.target.checked)}
              sx={{ p: 0, mr: 2 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }}>
              Selecionar todas as transações pendentes
            </Typography>
          </Box>

          {/* List items */}
          {transactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            const isExpense = tx.amount < 0;
            const typeInfo = getReadableType(tx.type);
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
                        {isExpense ? <SwapHoriz /> : <Check />}
                      </Avatar>
                    </Box>

                    {/* Transaction info block */}
                    <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 'auto', md: '30%' } }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {tx.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{formattedDate}</Typography>
                        <Typography variant="caption" color="text.secondary">•</Typography>
                        <Chip label={typeInfo.label} size="small" variant="outlined" color={typeInfo.color} sx={{ height: 18, fontSize: '10px', fontWeight: 700 }} />
                      </Box>
                    </Box>

                    {/* Category Selection Dropdown */}
                    <Box sx={{ minWidth: 150 }} onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={tx.category || 'Outros'}
                        onChange={(e) => handleFieldChange(tx.id, 'category', e.target.value)}
                        variant="standard"
                        disableUnderline
                        sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary' }}
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat.id} value={cat.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cat.color }} />
                              {cat.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
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
                        <IconButton size="small" color="success" onClick={() => handleSaveAndConfirm(tx.id)}>
                          <Check fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(tx.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => toggleExpand(tx.id)}>
                          {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>

                  {/* Expandable Details Pane */}
                  <Collapse in={isExpanded}>
                    <Divider sx={{ opacity: 0.05 }} />
                    <Box sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.01)', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Descrição Original</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.15)', p: 1, borderRadius: 1 }}>{tx.raw_description}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                          <Typography variant="body2" color="text.secondary">Pessoa/Favorecido:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{tx.payee || tx.merchant || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                          <Typography variant="body2" color="text.secondary">Banco/Origem:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{tx.institution || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                          <Typography variant="body2" color="text.secondary">ID Transação:</Typography>
                          <Typography variant="body2" sx={{ fontSize: '11px', opacity: 0.7 }}>{tx.id}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
