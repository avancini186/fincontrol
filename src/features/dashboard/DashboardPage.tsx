import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText, 
  Button, 
  Divider, 
  Alert
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalanceWallet,
  CloudUpload,
  RateReview,
  ReceiptLong
} from '@mui/icons-material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend 
} from 'recharts';
import type { PageType } from '../../types';
import { useDashboardData } from './dashboard.hooks';

interface DashboardPageProps {
  onNavigate: (page: PageType) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { data, isLoading, isError, error } = useDashboardData();
  const COLORS = ['#D0BCFF', '#CCC2DC', '#EFB8C8', '#81C784', '#64B5F6', '#FFB74D', '#A1887F', '#E0E0E0'];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 3 }}>
          {error?.message || 'Erro ao carregar dados do dashboard.'}
        </Alert>
      </Box>
    );
  }

  const { stats, pieData, barData, recentTransactions, pendingReviewCount } = data;

  return (
    <Box>
      {pendingReviewCount > 0 && (
        <Alert 
          severity="info" 
          action={
            <Button color="inherit" size="small" onClick={() => onNavigate('review')}>
              Revisar Agora
            </Button>
          }
          sx={{ mb: 4, borderRadius: 3 }}
        >
          Você tem <strong>{pendingReviewCount}</strong> lançamentos importados aguardando revisão e confirmação.
        </Alert>
      )}

      {/* Grid de KPIs */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Saldo Total</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 1 }}>
                  R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', p: 1.5, borderRadius: '50%' }}>
                <AccountBalanceWallet color="primary" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Receitas Confirmadas</Typography>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                  R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(129, 199, 132, 0.1)', p: 1.5, borderRadius: '50%' }}>
                <TrendingUp color="success" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Despesas Confirmadas</Typography>
                <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                  R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(242, 184, 181, 0.1)', p: 1.5, borderRadius: '50%' }}>
                <TrendingDown color="error" sx={{ fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Despesas por Categoria */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Gastos por Categoria</Typography>
              {pieData.length === 0 ? (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Nenhuma despesa confirmada neste período.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${value}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Evolução Mensal */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Evolução Mensal</Typography>
              {barData.length === 0 ? (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sem dados suficientes para exibir gráficos mensais.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData}>
                      <XAxis dataKey="name" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip formatter={(value) => `R$ ${value}`} />
                      <Legend />
                      <Bar dataKey="Receitas" fill="#81C784" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Despesas" fill="#F2B8B5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recentes & Atalhos */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Últimos Lançamentos Confirmados</Typography>
              {recentTransactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Nenhuma transação confirmada ainda.
                </Typography>
              ) : (
                <List>
                  {recentTransactions.map((tx, idx) => {
                    const isExpense = tx.amount < 0;
                    const dateFormatted = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    return (
                      <React.Fragment key={tx.id}>
                        {idx > 0 && <Divider sx={{ opacity: 0.05 }} />}
                        <ListItem sx={{ py: 1.5, px: 0 }}>
                          <ListItemText 
                            primary={tx.description} 
                            secondary={`${dateFormatted} • ${tx.category || 'Outros'}`} 
                          />
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: isExpense ? '#F2B8B5' : '#81C784' 
                            }}
                          >
                            {isExpense ? '-' : ''} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Links Rápidos */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>Ações Rápidas</Typography>
              <Button 
                variant="outlined" 
                startIcon={<CloudUpload />} 
                fullWidth
                onClick={() => onNavigate('upload')}
                sx={{ py: 1.2, justifyContent: 'flex-start', px: 3 }}
              >
                Importar Novo Extrato
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<RateReview />} 
                fullWidth
                onClick={() => onNavigate('review')}
                sx={{ py: 1.2, justifyContent: 'flex-start', px: 3 }}
              >
                Revisar Lançamentos Pendentes
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<ReceiptLong />} 
                fullWidth
                onClick={() => onNavigate('transactions')}
                sx={{ py: 1.2, justifyContent: 'flex-start', px: 3 }}
              >
                Ver Histórico de Transações
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
