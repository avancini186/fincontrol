export interface DashboardStats {
  balance: number;
  income: number;
  expenses: number;
}

export interface PieChartItem {
  name: string;
  value: number;
}

export interface BarChartItem {
  key: string;
  name: string;
  Receitas: number;
  Despesas: number;
}

export interface DashboardTransaction {
  id: string;
  user_id: string;
  account_id: string;
  statement_id: string | null;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  merchant: string | null;
  raw_description: string;
  category_confirmed: boolean;
  created_at: string;
}

export interface DashboardData {
  stats: DashboardStats;
  pieData: PieChartItem[];
  barData: BarChartItem[];
  recentTransactions: DashboardTransaction[];
  pendingReviewCount: number;
}
