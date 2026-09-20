import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupView from '../../screens/SignupView';

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
    signupFn: vi.fn(),
  }),
}));

// Mock authService
vi.mock('../../services/authService', () => ({
  isUsernameTaken: vi.fn().mockResolvedValue(false),
}));

describe('SignupView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(<SignupView />);

    expect(screen.getByPlaceholderText(/jane austen/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/janeaustens_reads/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/jane@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/min. 6 characters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/re-enter password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/10001/i)).toBeInTheDocument();
  });

  it('renders sign in link', () => {
    render(<SignupView />);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('shows password strength meter when typing', async () => {
    render(<SignupView />);
    const passwordInput = screen.getByPlaceholderText(/min. 6 characters/i);

    await userEvent.type(passwordInput, 'abc');
    await waitFor(() => {
      // Strength meter bars appear when typing
      const bars = document.querySelectorAll('[class*="h-1.5"]');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  it('shows password requirements', async () => {
    render(<SignupView />);
    const passwordInput = screen.getByPlaceholderText(/min. 6 characters/i);

    await userEvent.type(passwordInput, 'abc');

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('shows password strength label changes with longer input', async () => {
    render(<SignupView />);
    const passwordInput = screen.getByPlaceholderText(/min. 6 characters/i);

    await userEvent.type(passwordInput, 'ab');
    await waitFor(() => {
      // Short password shows "Weak"
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
    });

    // Clear and type longer password
    await userEvent.clear(passwordInput);
    await userEvent.type(passwordInput, 'MyStr0ng!Pass2025');
    await waitFor(() => {
      // Long password shows "Strong"
      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });
});
