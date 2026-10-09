import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PasswordRecoveryView from '../../screens/PasswordRecoveryView';

const mockSendPasswordReset = vi.fn();

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
    sendPasswordReset: mockSendPasswordReset,
  }),
}));

function renderRecovery() {
  return render(
    <MemoryRouter>
      <PasswordRecoveryView />
    </MemoryRouter>
  );
}

describe('PasswordRecoveryView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendPasswordReset.mockResolvedValue({ success: true, message: 'Reset link sent' });
  });

  it('renders email input on first step', () => {
    renderRecovery();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('has a send reset link button', () => {
    renderRecovery();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('calls sendPasswordReset with the normalized email on submit', async () => {
    renderRecovery();
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: '  USER@Example.com ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockSendPasswordReset).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('shows confirmation state after a successful send', async () => {
    mockSendPasswordReset.mockResolvedValue({
      success: true,
      message: 'Password reset link sent to user@example.com',
    });
    renderRecovery();
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/password reset link sent/i)).toBeInTheDocument();
  });

  it('shows an error when sending fails', async () => {
    mockSendPasswordReset.mockResolvedValue({
      success: false,
      message: 'Could not send the reset email.',
    });
    renderRecovery();
    fireEvent.change(screen.getByPlaceholderText(/you@example.com/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/could not send the reset email/i)).toBeInTheDocument();
    });
    // stays on the email form so the user can retry
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('does not ask for a 6-digit code anywhere', () => {
    renderRecovery();
    expect(screen.queryByText(/verification code/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/6-digit/i)).not.toBeInTheDocument();
  });
});
