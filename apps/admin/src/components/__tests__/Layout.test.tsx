import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/components/Login', () => ({
  default: () => <div>Login</div>,
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: '1',
        email: 'admin@example.com',
        role: 'Admin',
        createdAt: new Date(),
      },
    });
  });

  it('renders sidebar navigation', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('displays user email in profile menu', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  it('displays user role', () => {
    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
