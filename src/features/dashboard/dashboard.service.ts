import { supabase } from '../../supabaseClient';
import type { DashboardTransaction } from './dashboard.types';

export const dashboardService = {
  /**
   * Obtém a quantidade de transações pendentes de revisão.
   */
  async getPendingReviewCount(): Promise<number> {
    const { count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_confirmed', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Obtém todas as transações confirmadas para consolidação dos KPIs e gráficos.
   */
  async getConfirmedTransactions(): Promise<DashboardTransaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category_confirmed', true);

    if (error) throw error;
    return (data as DashboardTransaction[]) || [];
  },

  /**
   * Obtém as últimas 5 transações confirmadas.
   */
  async getRecentTransactions(limit = 5): Promise<DashboardTransaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category_confirmed', true)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as DashboardTransaction[]) || [];
  }
};
