import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsView from '../../screens/SettingsView';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
      React.createElement('a', { href: to, children }),
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user123456789012', email: 'test@test.com', fullName: 'Test User' },
    logoutFn: vi.fn(),
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title', () => {
    render(<SettingsView />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders user email', () => {
    render(<SettingsView />);
    expect(screen.getByText('test@test.com')).toBeInTheDocument();
  });

  it('renders user ID info', () => {
    render(<SettingsView />);
    expect(screen.getByText(/User ID/)).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<SettingsView />);
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('renders terms link', () => {
    render(<SettingsView />);
    const termsLink = screen.getByText(/Terms & Conditions/);
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('renders Show Book Covers toggle', () => {
    render(<SettingsView />);
    expect(screen.getByText('Show Book Covers')).toBeInTheDocument();
  });

  it('renders Notifications toggle', () => {
    render(<SettingsView />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});
