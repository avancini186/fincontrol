import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dashboardService } from './dashboard.service';
import type { DashboardData, DashboardStats, PieChartItem, BarChartItem } from './dashboard.types';

export function useDashboardData(): {
  data: DashboardData | null;
  isLoading: boolean;
  isError: boolean;
  error: any;
  refetch: () => void;
} {
  // Query 1: Contagem de revisões pendentes
  const pendingQuery = useQuery({
    queryKey: ['dashboard', 'pendingCount'],
    queryFn: () => dashboardService.getPendingReviewCount(),
  });

  // Query 2: Transações confirmadas
  const confirmedQuery = useQuery({
    queryKey: ['dashboard', 'confirmedTransactions'],
    queryFn: () => dashboardService.getConfirmedTransactions(),
  });

  // Query 3: Transações recentes
  const recentQuery = useQuery({
    queryKey: ['dashboard', 'recentTransactions'],
    queryFn: () => dashboardService.getRecentTransactions(),
  });

  // Consolidar e transformar os dados de transações confirmadas usando useMemo
  const aggregatedData = useMemo(() => {
    if (!confirmedQuery.data) return null;

    const transactions = confirmedQuery.data;
    
    let totalBalance = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    
    const categoryMap: Record<string, number> = {};
    const monthlyMap: Record<string, { name: string; Receitas: number; Despesas: number }> = {};

    transactions.forEach((tx) => {
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      totalBalance += amount;
      
      if (amount > 0) {
        totalIncome += amount;
      } else {
        totalExpenses += Math.abs(amount);
      }

      // Gráfico de Pizza (apenas despesas)
      if (amount < 0) {
        const cat = tx.category || 'Outros';
        categoryMap[cat] = (categoryMap[cat] || 0) + Math.abs(amount);
      }

      // Gráfico de Barras Mensal (agrupado por YYYY-MM)
      const dateObj = new Date(tx.date + 'T00:00:00');
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { name: monthLabel, Receitas: 0, Despesas: 0 };
      }
      
      if (amount > 0) {
        monthlyMap[monthKey].Receitas += amount;
      } else {
        monthlyMap[monthKey].Despesas += Math.abs(amount);
      }
    });

    const stats: DashboardStats = {
      balance: totalBalance,
      income: totalIncome,
      expenses: totalExpenses,
    };

    // Formatando dados do gráfico de pizza
    const pieData: PieChartItem[] = Object.keys(categoryMap)
      .map((key) => ({
        name: key,
        value: Math.round(categoryMap[key] * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);

    // Formatando dados do gráfico de barras (últimos 6 meses)
    const barData: BarChartItem[] = Object.keys(monthlyMap)
      .map((key) => ({
        key,
        ...monthlyMap[key],
      }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6);

    return { stats, pieData, barData };
  }, [confirmedQuery.data]);

  const isLoading = pendingQuery.isLoading || confirmedQuery.isLoading || recentQuery.isLoading;
  const isError = pendingQuery.isError || confirmedQuery.isError || recentQuery.isError;
  const error = pendingQuery.error || confirmedQuery.error || recentQuery.error;

  const data: DashboardData | null = useMemo(() => {
    if (!aggregatedData || recentQuery.data === undefined || pendingQuery.data === undefined) {
      return null;
    }
    return {
      stats: aggregatedData.stats,
      pieData: aggregatedData.pieData,
      barData: aggregatedData.barData,
      recentTransactions: recentQuery.data,
      pendingReviewCount: pendingQuery.data,
    };
  }, [aggregatedData, recentQuery.data, pendingQuery.data]);

  const refetch = () => {
    pendingQuery.refetch();
    confirmedQuery.refetch();
    recentQuery.refetch();
  };

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
  };
}
