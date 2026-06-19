import { create } from 'zustand';
import type { PageType } from '../types';

interface AppStoreState {
  session: any | null;
  currentPage: PageType;
  filters: {
    accountId: string;
    dateRange: { start: string; end: string } | null;
  };
  themeMode: 'light' | 'dark';
  
  setSession: (session: any | null) => void;
  setCurrentPage: (page: PageType) => void;
  setFilters: (filters: Partial<AppStoreState['filters']>) => void;
  toggleThemeMode: () => void;
}

export const useAppStore = create<AppStoreState>((set) => ({
  session: null,
  currentPage: 'dashboard',
  filters: {
    accountId: '',
    dateRange: null,
  },
  themeMode: 'dark', // Padrão do app é escuro

  setSession: (session) => set({ session }),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  toggleThemeMode: () => set((state) => ({
    themeMode: state.themeMode === 'light' ? 'dark' : 'light'
  })),
}));
