import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios, { AxiosError } from 'axios';
import type { 
  BalanceResponse, 
  BetRequest, 
  BetResponse, 
  GameHistory, 
  SpinResult, 
  SlotSymbol, 
  UserSettings 
} from '@monorepo/shared';

interface GameState {
  // User data
  userId: string | null;
  balance: string;
  currency: string;
  
  // Game state
  isSpinning: boolean;
  lastSpinResult: SpinResult | null;
  gameHistory: SpinResult[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  
  // Betting
  currentBet: number;
  betAmounts: number[];
  maxBet: number;
  
  // Session management
  sessionExpiry: Date | null;
  isConnected: boolean;
  
  // Actions
  setUserId: (userId: string) => void;
  fetchBalance: () => Promise<void>;
  placeBet: (betRequest: BetRequest) => Promise<BetResponse | null>;
  fetchGameHistory: (page?: number, limit?: number) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setCurrentBet: (amount: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  resetError: () => void;
  setConnectionStatus: (connected: boolean) => void;
  updateSessionExpiry: (expiry: Date) => void;
  clearGameHistory: () => void;
}

// API base URL - should be configurable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Symbol definitions for the slot machine
export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', name: 'Cherry', emoji: '🍒', value: 2, rarity: 'common' },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', value: 3, rarity: 'common' },
  { id: 'orange', name: 'Orange', emoji: '🍊', value: 4, rarity: 'common' },
  { id: 'plum', name: 'Plum', emoji: '🍇', value: 5, rarity: 'common' },
  { id: 'grape', name: 'Grape', emoji: '🍇', value: 6, rarity: 'common' },
  { id: 'bell', name: 'Bell', emoji: '🔔', value: 8, rarity: 'rare' },
  { id: 'seven', name: 'Seven', emoji: '7️⃣', value: 10, rarity: 'rare' },
  { id: 'star', name: 'Star', emoji: '⭐', value: 15, rarity: 'epic' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', value: 25, rarity: 'legendary' },
  { id: 'gold', name: 'Gold', emoji: '🥇', value: 50, rarity: 'legendary' }
];

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // Initial state
      userId: null,
      balance: '0',
      currency: 'PKR',
      isSpinning: false,
      lastSpinResult: null,
      gameHistory: [],
      isLoading: false,
      error: null,
      soundEnabled: false, // Default to false for mobile
      animationsEnabled: true,
      currentBet: 10,
      betAmounts: [5, 10, 25, 50, 100],
      maxBet: 1000,
      sessionExpiry: null,
      isConnected: navigator.onLine,

      // Actions
      setUserId: (userId: string) => {
        set({ userId });
        // Persist user ID
        localStorage.setItem('slot_user_id', userId);
      },

      fetchBalance: async () => {
        const { userId } = get();
        if (!userId) return;

        set({ isLoading: true, error: null });

        try {
          const response = await axios.get<BalanceResponse>(`${API_BASE_URL}/user/balance`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
          });

          set({
            balance: response.data.balance,
            currency: response.data.currency,
            isLoading: false,
          });
        } catch (error) {
          const axiosError = error as AxiosError;
          set({
            error: axiosError.response?.status === 401 
              ? 'Session expired. Please log in again.'
              : 'Failed to fetch balance. Please try again.',
            isLoading: false,
            isConnected: false,
          });

          if (axiosError.response?.status === 401) {
            // Auto logout on token expiry
            get().updateSessionExpiry(new Date());
          }
        }
      },

      placeBet: async (betRequest: BetRequest): Promise<BetResponse | null> => {
        const { userId } = get();
        if (!userId || get().isSpinning) return null;

        set({ isSpinning: true, error: null });

        try {
          const response = await axios.post<BetResponse>(`${API_BASE_URL}/game/bet`, betRequest, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
            timeout: 10000, // 10 second timeout
          });

          if (response.data.success && response.data.data) {
            set({
              balance: response.data.data.newBalance,
              lastSpinResult: response.data.data.spinResult,
              isSpinning: false,
            });

            // Add to game history
            const { gameHistory } = get();
            set({
              gameHistory: [response.data.data.spinResult, ...gameHistory.slice(0, 99)], // Keep last 100
            });

            return response.data;
          }

          set({ isSpinning: false });
          return response.data;
        } catch (error) {
          const axiosError = error as AxiosError;
          
          // Retry logic with exponential backoff
          if (axiosError.code === 'ECONNABORTED' || axiosError.response?.status >= 500) {
            set({
              error: 'Network error. Retrying...',
              isSpinning: false,
              isConnected: false,
            });
            return null;
          }

          set({
            error: axiosError.response?.status === 401 
              ? 'Session expired. Please log in again.'
              : 'Bet failed. Please try again.',
            isSpinning: false,
            isConnected: false,
          });

          if (axiosError.response?.status === 401) {
            get().updateSessionExpiry(new Date());
          }

          return null;
        }
      },

      fetchGameHistory: async (page = 1, limit = 20) => {
        const { userId } = get();
        if (!userId) return;

        set({ isLoading: true, error: null });

        try {
          const response = await axios.get<GameHistory>(`${API_BASE_URL}/game/history`, {
            params: { page, limit },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
          });

          set({
            gameHistory: response.data.spins,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: 'Failed to fetch game history.',
            isLoading: false,
          });
        }
      },

      updateSettings: (settings: Partial<UserSettings>) => {
        set((state) => ({
          soundEnabled: settings.soundEnabled ?? state.soundEnabled,
          animationsEnabled: settings.animationsEnabled ?? state.animationsEnabled,
          currentBet: settings.betAmount ?? state.currentBet,
        }));

        // Persist settings
        localStorage.setItem('slot_settings', JSON.stringify(get()));
      },

      setCurrentBet: (amount: number) => {
        set({ currentBet: Math.max(1, Math.min(amount, get().maxBet)) });
      },

      setSoundEnabled: (enabled: boolean) => {
        set({ soundEnabled: enabled });
      },

      setAnimationsEnabled: (enabled: boolean) => {
        set({ animationsEnabled: enabled });
      },

      resetError: () => {
        set({ error: null });
      },

      setConnectionStatus: (connected: boolean) => {
        set({ isConnected: connected });
      },

      updateSessionExpiry: (expiry: Date) => {
        set({ sessionExpiry: expiry });
      },

      clearGameHistory: () => {
        set({ gameHistory: [] });
      },
    }),
    {
      name: 'slot-game-store',
    }
  )
);

// Initialize from localStorage on store creation
if (typeof window !== 'undefined') {
  const savedUserId = localStorage.getItem('slot_user_id');
  const savedSettings = localStorage.getItem('slot_settings');
  
  if (savedUserId) {
    useGameStore.getState().setUserId(savedUserId);
  }
  
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      useGameStore.getState().updateSettings(settings);
    } catch (error) {
      console.warn('Failed to parse saved settings:', error);
    }
  }
}

// Connection status monitoring
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useGameStore.getState().setConnectionStatus(true);
    useGameStore.getState().fetchBalance();
  });

  window.addEventListener('offline', () => {
    useGameStore.getState().setConnectionStatus(false);
  });
}