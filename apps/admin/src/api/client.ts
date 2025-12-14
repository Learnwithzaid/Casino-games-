import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
