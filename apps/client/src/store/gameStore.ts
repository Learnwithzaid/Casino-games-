import { create } from 'zustand';
import { gamesApi } from '@/api/endpoints';
import type { Game, PaginatedResponse } from '@/types';

interface GameStore {
  currentGame: Game | null;
  gameHistory: Game[];
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Actions
  fetchCurrentGame: () => Promise<void>;
  fetchGameHistory: (page?: number, limit?: number) => Promise<void>;
  startGame: (gameType: string, amount: number) => Promise<Game>;
  endGame: (gameId: string, result: 'win' | 'lose' | 'draw') => Promise<Game>;
  clearError: () => void;
  clearGameHistory: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentGame: null,
  gameHistory: [],
  isPlaying: false,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchCurrentGame: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const currentGame = await gamesApi.getCurrentGame();
      set({ 
        currentGame, 
        isPlaying: !!currentGame && currentGame.status === 'playing',
        isLoading: false, 
        error: null 
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch current game',
      });
      throw error;
    }
  },

  fetchGameHistory: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await gamesApi.getGameHistory(page, limit);
      
      if (page === 1) {
        set({ gameHistory: response.items });
      } else {
        set((state) => ({ 
          gameHistory: [...state.gameHistory, ...response.items] 
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
        error: error instanceof Error ? error.message : 'Failed to fetch game history',
      });
      throw error;
    }
  },

  startGame: async (gameType: string, amount: number) => {
    set({ isLoading: true, error: null });
    
    try {
      const game = await gamesApi.startGame(gameType, amount);
      set({ 
        currentGame: game, 
        isPlaying: true, 
        isLoading: false, 
        error: null 
      });
      return game;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start game',
      });
      throw error;
    }
  },

  endGame: async (gameId: string, result: 'win' | 'lose' | 'draw') => {
    set({ isLoading: true, error: null });
    
    try {
      const game = await gamesApi.endGame(gameId, result);
      set({ 
        currentGame: null, 
        isPlaying: false, 
        isLoading: false, 
        error: null 
      });
      return game;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to end game',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearGameHistory: () => {
    set({ gameHistory: [] });
  },
}));
