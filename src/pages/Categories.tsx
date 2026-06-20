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
  Grid
} from '@mui/material';
import { 
  Add, 
  Delete, 
  Edit,
  Category as CategoryIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { tokens } from '../design-system/tokens';

interface Category {
  id: string;
  name: string;
  color: string;
}

const colorOptions = [
  { name: 'Roxo', value: '#8A05BE' },
  { name: 'Verde Receita', value: '#2ECC71' },
  { name: 'Vermelho Despesa', value: '#E74C3C' },
  { name: 'Azul Investimento', value: '#3498DB' },
  { name: 'Amarelo Alerta', value: '#F1C40F' },
  { name: 'Laranja', value: '#E67E22' },
  { name: 'Cinza Muted', value: '#95A5A6' },
  { name: 'Turquesa', value: '#1ABC9C' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8A05BE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setName('');
    setColor('#8A05BE');
    setEditingId(null);
    setError(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setName(cat.name);
    setColor(cat.color);
    setEditingId(cat.id);
    setError(null);
    setOpenDialog(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Usuário não autenticado');

      if (editingId) {
        // Edit existing category
        const { error: updateError } = await supabase
          .from('categories')
          .update({ name, color })
          .eq('id', editingId);

        if (updateError) throw updateError;
      } else {
        // Create new category
        const { error: insertError } = await supabase
          .from('categories')
          .insert([{ name, color }]);

        if (insertError) throw insertError;
      }

      setOpenDialog(false);
      fetchCategories();
    } catch (err: any) {
      console.error('Erro ao salvar categoria:', err);
      setError(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria? Lançamentos associados a ela não serão excluídos, mas ficarão sem categoria padrão.')) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Categorias</Typography>
          <Typography variant="body1" color="text.secondary">Cadastre e personalize categorias para categorizar seus lançamentos financeiros.</Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<Add />}
          onClick={handleOpenCreate}
        >
          Nova Categoria
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <CategoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" sx={{ mb: 1 }}>Nenhuma categoria cadastrada</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Cadastre suas categorias customizadas para obter relatórios precisos dos seus gastos.
            </Typography>
            <Button variant="outlined" startIcon={<Add />} onClick={handleOpenCreate}>
              Cadastrar Primeira Categoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {categories.map((cat) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cat.id}>
              <Card 
                sx={{ 
                  borderColor: tokens.colors.neutral.border,
                  background: tokens.colors.neutral.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  '&:hover': {
                    borderColor: 'rgba(168, 85, 247, 0.25)',
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: cat.color }} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {cat.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small" onClick={() => handleOpenEdit(cat)} sx={{ color: 'primary.main', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)} sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* dialog for Edit/Create Category */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        <form onSubmit={handleSaveCategory}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ borderRadius: 3 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Nome da Categoria"
              placeholder="Ex: Assinaturas, Mercado..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
            />

            <TextField
              select
              label="Cor Preset"
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

            <TextField
              label="Código Hexagonal da Cor"
              placeholder="Ex: #FF5733"
              value={color}
              onChange={(e) => setColor(e.target.value)}
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
