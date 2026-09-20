import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginView from '../../screens/LoginView';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
      React.createElement('a', { href: to, children }),
    useNavigate: () => vi.fn(),
  };
});

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    loginByUsername: vi.fn(),
  }),
}));

describe('LoginView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with all fields', () => {
    render(<LoginView />);

    expect(screen.getByPlaceholderText(/enter your username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginView />);

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('renders sign up link', () => {
    render(<LoginView />);

    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    render(<LoginView />);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when both fields filled', async () => {
    render(<LoginView />);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await userEvent.type(screen.getByPlaceholderText(/enter your username/i), 'testuser');
    await userEvent.type(screen.getByPlaceholderText(/enter your password/i), 'password123');

    expect(submitBtn).not.toBeDisabled();
  });
});
