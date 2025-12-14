import apiClient from './client';
import type {
  AuthResponse,
  TOTPSetupResponse,
  TOTPVerifyRequest,
  Game,
  UserProfile,
  Transaction,
  AuditLog,
  PaginatedResponse,
  PaginationParams,
} from '@/types';

const API_BASE = '/api/admin';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post(`${API_BASE}/auth/login`, {
      email,
      password,
    });
    return response.data;
  },

  setupTOTP: async (): Promise<TOTPSetupResponse> => {
    const response = await apiClient.post(`${API_BASE}/auth/totp/setup`);
    return response.data;
  },

  verifyTOTP: async (payload: TOTPVerifyRequest): Promise<AuthResponse> => {
    const response = await apiClient.post(`${API_BASE}/auth/totp/verify`, payload);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post(`${API_BASE}/auth/logout`);
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post(`${API_BASE}/auth/refresh`, {
      refreshToken,
    });
    return response.data;
  },

  validateSession: async (): Promise<{ valid: boolean }> => {
    const response = await apiClient.get(`${API_BASE}/auth/validate`);
    return response.data;
  },
};

export const gamesApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<Game>> => {
    const response = await apiClient.get(`${API_BASE}/games`, { params });
    return response.data;
  },

  get: async (id: string): Promise<Game> => {
    const response = await apiClient.get(`${API_BASE}/games/${id}`);
    return response.data;
  },

  create: async (game: Partial<Game>): Promise<Game> => {
    const response = await apiClient.post(`${API_BASE}/games`, game);
    return response.data;
  },

  update: async (id: string, game: Partial<Game>): Promise<Game> => {
    const response = await apiClient.put(`${API_BASE}/games/${id}`, game);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE}/games/${id}`);
  },
};

export const usersApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<UserProfile>> => {
    const response = await apiClient.get(`${API_BASE}/users`, { params });
    return response.data;
  },

  get: async (id: string): Promise<UserProfile> => {
    const response = await apiClient.get(`${API_BASE}/users/${id}`);
    return response.data;
  },

  getBalance: async (id: string): Promise<{ balance: number; currency: string }> => {
    const response = await apiClient.get(`${API_BASE}/users/${id}/balance`);
    return response.data;
  },

  getTransactions: async (
    id: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get(`${API_BASE}/users/${id}/transactions`, {
      params,
    });
    return response.data;
  },
};

export const transactionsApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<Transaction>> => {
    const response = await apiClient.get(`${API_BASE}/transactions`, { params });
    return response.data;
  },

  get: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get(`${API_BASE}/transactions/${id}`);
    return response.data;
  },
};

export const auditApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get(`${API_BASE}/audit-logs`, { params });
    return response.data;
  },
};

export const settingsApi = {
  get: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get(`${API_BASE}/settings`);
    return response.data;
  },

  update: async (settings: Record<string, any>): Promise<Record<string, any>> => {
    const response = await apiClient.put(`${API_BASE}/settings`, settings);
    return response.data;
  },

  toggleMaintenance: async (enabled: boolean): Promise<{ enabled: boolean }> => {
    const response = await apiClient.post(`${API_BASE}/settings/maintenance`, {
      enabled,
    });
    return response.data;
  },
};

export const statsApi = {
  getDashboard: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get(`${API_BASE}/stats/dashboard`);
    return response.data;
  },
};
