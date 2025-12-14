import { create } from 'zustand';
import { walletApi } from '@/api/endpoints';
import type { WalletBalance, Game, Deposit, PaginatedResponse } from '@/types';

interface WalletStore {
  balance: WalletBalance | null;
  transactions: (Game | Deposit)[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  fetchBalance: () => Promise<void>;
  fetchTransactions: (page?: number, limit?: number) => Promise<void>;
  clearError: () => void;
  clearTransactions: () => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  balance: null,
  transactions: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchBalance: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const balance = await walletApi.getBalance();
      set({ balance, isLoading: false, error: null });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
      });
      throw error;
    }
  },

  fetchTransactions: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await walletApi.getTransactions(page, limit);
      
      if (page === 1) {
        set({ transactions: response.items });
      } else {
        set((state) => ({ 
          transactions: [...state.transactions, ...response.items] 
        }));
      }
      
      set({
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearTransactions: () => {
    set({ transactions: [] });
  },
}));
