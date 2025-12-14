import { apiClient } from './client';
import type {
  User,
  LoginCredentials,
  RegisterData,
  RefreshTokenResponse,
  WalletBalance,
  Game,
  Deposit,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<{ user: User; tokens: RefreshTokenResponse }> => {
    const response = await apiClient.post<ApiResponse<{ user: User; tokens: RefreshTokenResponse }>>('/auth/login', credentials);
    return response.data.data!;
  },

  register: async (data: RegisterData): Promise<{ user: User; tokens: RefreshTokenResponse }> => {
    const response = await apiClient.post<ApiResponse<{ user: User; tokens: RefreshTokenResponse }>>('/auth/register', data);
    return response.data.data!;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<ApiResponse<RefreshTokenResponse>>('/auth/refresh', { refreshToken });
    return response.data.data!;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile');
    return response.data.data!;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/profile', data);
    return response.data.data!;
  },
};

export const walletApi = {
  getBalance: async (): Promise<WalletBalance> => {
    const response = await apiClient.get<ApiResponse<WalletBalance>>('/wallet/balance');
    return response.data.data!;
  },

  getTransactions: async (page = 1, limit = 20): Promise<PaginatedResponse<Game | Deposit>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Game | Deposit>>>('/wallet/transactions', {
      params: { page, limit },
    });
    return response.data.data!;
  },
};

export const gamesApi = {
  getGameHistory: async (page = 1, limit = 20): Promise<PaginatedResponse<Game>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Game>>>('/games/history', {
      params: { page, limit },
    });
    return response.data.data!;
  },

  getCurrentGame: async (): Promise<Game | null> => {
    const response = await apiClient.get<ApiResponse<Game | null>>('/games/current');
    return response.data.data || null;
  },

  startGame: async (gameType: string, amount: number): Promise<Game> => {
    const response = await apiClient.post<ApiResponse<Game>>('/games/start', { gameType, amount });
    return response.data.data!;
  },

  endGame: async (gameId: string, result: 'win' | 'lose' | 'draw'): Promise<Game> => {
    const response = await apiClient.patch<ApiResponse<Game>>(`/games/${gameId}/end`, { result });
    return response.data.data!;
  },
};

export const depositsApi = {
  getDeposits: async (page = 1, limit = 20): Promise<PaginatedResponse<Deposit>> => {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Deposit>>>('/deposits', {
      params: { page, limit },
    });
    return response.data.data!;
  },

  createDeposit: async (amount: number, method: 'card' | 'bank' | 'crypto'): Promise<Deposit> => {
    const response = await apiClient.post<ApiResponse<Deposit>>('/deposits', { amount, method });
    return response.data.data!;
  },

  getDepositMethods: async (): Promise<Array<{ id: string; name: string; type: string; fees: number }>> => {
    const response = await apiClient.get<ApiResponse<Array<{ id: string; name: string; type: string; fees: number }>>>('/deposits/methods');
    return response.data.data!;
  },
};

export default {
  auth: authApi,
  wallet: walletApi,
  games: gamesApi,
  deposits: depositsApi,
};
