export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface HealthCheckResponse {
  uptime: number;
  message: string;
  timestamp: number;
  environment: string;
  database?: string;
}
