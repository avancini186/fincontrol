import React from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Alert,
  Avatar
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalanceWallet,
  CloudUpload,
  RateReview,
  ReceiptLong,
  ArrowForwardIos,
  ShowChart
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
import { tokens } from '../../design-system/tokens';
import { DashboardSkeleton } from '../../components/SkeletonLoader';

interface DashboardPageProps {
  onNavigate: (page: PageType) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { data, isLoading, isError, error } = useDashboardData();

  // Dynamic colors for category chart
  const COLORS = [
    tokens.colors.brand.purpleLight,
    tokens.colors.semantic.investment,
    tokens.colors.semantic.income,
    '#E9D5FF',
    '#C084FC',
    '#A78BFA',
    '#818CF8',
    '#F472B6'
  ];

  if (isLoading) {
    return <DashboardSkeleton />;
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
      {/* Greetings Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h2" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, letterSpacing: -0.5 }}>
            Bom dia, André 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Aqui está o resumo das suas finanças
          </Typography>
        </Box>
      </Box>

      {pendingReviewCount > 0 && (
        <Alert 
          severity="info" 
          action={
            <Button color="inherit" size="small" onClick={() => onNavigate('review')} sx={{ fontWeight: 700 }}>
              Revisar Agora
            </Button>
          }
          sx={{ mb: 4, borderRadius: 3, border: '1px solid rgba(168, 85, 247, 0.2)' }}
        >
          Você tem <strong>{pendingReviewCount}</strong> lançamentos importados aguardando revisão e confirmação.
        </Alert>
      )}

      {/* Grid de KPIs - Responsive Layout */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Saldo Atual */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Saldo Atual
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'Outfit, sans-serif' }}>
                  R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.semantic.income, display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                  <TrendingUp sx={{ fontSize: 14 }} /> 12,5% <span style={{ color: tokens.colors.neutral.textSecondary }}>vs mês anterior</span>
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(168, 85, 247, 0.1)', p: 1.5, borderRadius: '12px' }}>
                <AccountBalanceWallet sx={{ color: 'primary.main', fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Receitas */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Receitas
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'Outfit, sans-serif', color: tokens.colors.semantic.income }}>
                  R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.semantic.income, display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                  <TrendingUp sx={{ fontSize: 14 }} /> 18,2% <span style={{ color: tokens.colors.neutral.textSecondary }}>vs mês anterior</span>
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(46, 204, 113, 0.1)', p: 1.5, borderRadius: '12px' }}>
                <TrendingUp sx={{ color: tokens.colors.semantic.income, fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Despesas */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Despesas
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'Outfit, sans-serif', color: tokens.colors.semantic.expense }}>
                  R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.semantic.expense, display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                  <TrendingDown sx={{ fontSize: 14 }} /> 8,7% <span style={{ color: tokens.colors.neutral.textSecondary }}>vs mês anterior</span>
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(231, 76, 60, 0.1)', p: 1.5, borderRadius: '12px' }}>
                <TrendingDown sx={{ color: tokens.colors.semantic.expense, fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Investimentos (Mock value/Total Investido) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Total Investido
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontFamily: 'Outfit, sans-serif', color: tokens.colors.semantic.investment }}>
                  R$ 23.450,10
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.colors.semantic.investment, display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                  <TrendingUp sx={{ fontSize: 14 }} /> 5,1% <span style={{ color: tokens.colors.neutral.textSecondary }}>vs mês anterior</span>
                </Typography>
              </Box>
              <Box sx={{ bgcolor: 'rgba(52, 152, 219, 0.1)', p: 1.5, borderRadius: '12px' }}>
                <ShowChart sx={{ color: tokens.colors.semantic.investment, fontSize: 24 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos - Responsive Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Despesas por Categoria (Esquerdo) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>Gastos por Categoria</Typography>
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
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: tokens.colors.neutral.surface, borderColor: tokens.colors.neutral.border, borderRadius: 8 }}
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gasto']} 
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Evolução Mensal (Direito) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: 380, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>Evolução Mensal</Typography>
              {barData.length === 0 ? (
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Sem dados suficientes para exibir gráficos.</Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData}>
                      <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.3)" fontSize={11} tickLine={false} />
                      <YAxis stroke="rgba(255, 255, 255, 0.3)" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: tokens.colors.neutral.surface, borderColor: tokens.colors.neutral.border, borderRadius: 8 }}
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]} 
                      />
                      <Legend iconType="circle" iconSize={8} />
                      <Bar dataKey="Receitas" fill={tokens.colors.semantic.income} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Despesas" fill={tokens.colors.semantic.expense} radius={[4, 4, 0, 0]} />
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
        {/* Lançamentos (Esquerdo) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h3" sx={{ mb: 2 }}>Últimos Lançamentos</Typography>
              {recentTransactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Nenhuma transação confirmada ainda.
                </Typography>
              ) : (
                <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, p: 0 }}>
                  {recentTransactions.slice(0, 5).map((tx, idx) => {
                    const isExpense = tx.amount < 0;
                    const dateFormatted = new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    
                    return (
                      <React.Fragment key={tx.id}>
                        {idx > 0 && <Divider sx={{ opacity: 0.05, my: 0.5 }} />}
                        <ListItem 
                          sx={{ 
                            px: 1, 
                            py: 1,
                            borderRadius: 2,
                            transition: 'all 150ms ease',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.02)',
                            }
                          }}
                        >
                          <Avatar sx={{ bgcolor: isExpense ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)', color: isExpense ? 'error.main' : 'success.main', mr: 2, width: 36, height: 36 }}>
                            {tx.description[0]?.toUpperCase() || '$'}
                          </Avatar>
                          <ListItemText 
                            primary={<Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{tx.description}</Typography>} 
                            secondary={<Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{dateFormatted} • {tx.category || 'Outros'}</Typography>} 
                          />
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 700, 
                              color: isExpense ? tokens.colors.semantic.expense : tokens.colors.semantic.income 
                            }}
                          >
                            {isExpense ? '-' : '+'} R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

        {/* Links Rápidos / Ações Rápidas (Direito) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
              <Typography variant="h3" sx={{ mb: 1 }}>Ações Rápidas</Typography>
              
              <Button 
                variant="outlined" 
                startIcon={<CloudUpload sx={{ color: 'primary.main' }} />} 
                endIcon={<ArrowForwardIos sx={{ fontSize: '10px !important', ml: 'auto', opacity: 0.5 }} />}
                fullWidth
                onClick={() => onNavigate('upload')}
                sx={{ 
                  py: 1.5, 
                  justifyContent: 'flex-start', 
                  px: 3, 
                  border: `1px solid ${tokens.colors.neutral.border}`,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(168, 85, 247, 0.04)',
                  }
                }}
              >
                <Box sx={{ textAlign: 'left', ml: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Importar novo extrato</Typography>
                  <Typography variant="caption" color="text.secondary">CSV, PDF, OFX ou Imagem</Typography>
                </Box>
              </Button>

              <Button 
                variant="outlined" 
                startIcon={<RateReview sx={{ color: 'primary.main' }} />} 
                endIcon={<ArrowForwardIos sx={{ fontSize: '10px !important', ml: 'auto', opacity: 0.5 }} />}
                fullWidth
                onClick={() => onNavigate('review')}
                sx={{ 
                  py: 1.5, 
                  justifyContent: 'flex-start', 
                  px: 3, 
                  border: `1px solid ${tokens.colors.neutral.border}`,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(168, 85, 247, 0.04)',
                  }
                }}
              >
                <Box sx={{ textAlign: 'left', ml: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Revisar lançamentos</Typography>
                  <Typography variant="caption" color="text.secondary">Lançamentos pendentes</Typography>
                </Box>
              </Button>

              <Button 
                variant="outlined" 
                startIcon={<ReceiptLong sx={{ color: 'primary.main' }} />} 
                endIcon={<ArrowForwardIos sx={{ fontSize: '10px !important', ml: 'auto', opacity: 0.5 }} />}
                fullWidth
                onClick={() => onNavigate('transactions')}
                sx={{ 
                  py: 1.5, 
                  justifyContent: 'flex-start', 
                  px: 3, 
                  border: `1px solid ${tokens.colors.neutral.border}`,
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(168, 85, 247, 0.04)',
                  }
                }}
              >
                <Box sx={{ textAlign: 'left', ml: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>Ver transações</Typography>
                  <Typography variant="caption" color="text.secondary">Todas as suas movimentações</Typography>
                </Box>
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
