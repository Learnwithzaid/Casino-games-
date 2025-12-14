import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import type { RefreshTokenResponse } from '@/types';

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
  }> = [];

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.instance(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await this.instance.post<RefreshTokenResponse>('/auth/refresh', {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            this.setTokens(accessToken, newRefreshToken);

            this.processQueue(null, accessToken);

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError as AxiosError, null);
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: AxiosError | null, token: string | null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token!);
      }
    });

    this.failedQueue = [];
  }

  private handleApiError(error: AxiosError) {
    const message = this.getErrorMessage(error);
    
    // Don't show toast for auth errors as they're handled by the interceptor
    if (error.response?.status !== 401) {
      toast.error(message);
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response) {
      const { status, data } = error.response;
      
      if (typeof data === 'object' && data && 'message' in data) {
        return (data as { message: string }).message;
      }
      
      switch (status) {
        case 400:
          return 'Invalid request data';
        case 403:
          return 'Access denied';
        case 404:
          return 'Resource not found';
        case 422:
          return 'Validation error';
        case 429:
          return 'Too many requests. Please try again later';
        case 500:
          return 'Server error. Please try again later';
        default:
          return `Request failed with status ${status}`;
      }
    } else if (error.request) {
      return 'Network error. Please check your connection';
    } else {
      return error.message || 'An unexpected error occurred';
    }
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }

  public setBaseURL(baseURL: string) {
    this.instance.defaults.baseURL = baseURL;
  }

  public setAuthHeader(token: string) {
    this.instance.defaults.headers.Authorization = `Bearer ${token}`;
  }

  public clearAuthHeader() {
    delete this.instance.defaults.headers.Authorization;
  }
}

export const apiClient = new ApiClient().getInstance();
export default ApiClient;
