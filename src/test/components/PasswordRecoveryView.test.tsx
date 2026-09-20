import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PasswordRecoveryView from '../../screens/PasswordRecoveryView';

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
    sendRecoveryCode: vi.fn().mockResolvedValue({ success: true, message: 'Code sent' }),
    verifyRecoveryCode: vi.fn().mockResolvedValue({ success: true, message: 'Verified' }),
    resetPassword: vi.fn().mockResolvedValue({ success: true, message: 'Reset complete' }),
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
  });

  it('renders email input on first step', () => {
    renderRecovery();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('has send code button', () => {
    renderRecovery();
    expect(screen.getByText(/send verification code/i)).toBeInTheDocument();
  });

  it('shows step indicator', () => {
    renderRecovery();
    // Step indicator circles
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
