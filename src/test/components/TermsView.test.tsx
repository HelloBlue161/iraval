import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsView from '../../screens/TermsView';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
      React.createElement('a', { href: to, children }),
  };
});

describe('TermsView', () => {
  it('renders terms title', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText('Terms & Conditions')).toBeInTheDocument();
  });

  it('renders IP Warning section', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText(/Intellectual Property Warning/)).toBeInTheDocument();
  });

  it('renders Age Requirement section with 21+', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText(/Age Requirement/)).toBeInTheDocument();
    expect(screen.getByText(/21 years or/)).toBeInTheDocument();
  });

  it('renders Disclaimer section', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText(/Disclaimer/)).toBeInTheDocument();
  });

  it('renders Appropriate Use section', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText(/Appropriate Use/)).toBeInTheDocument();
  });

  it('renders Book Content Responsibility section', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    expect(screen.getByText(/Book Content Responsibility/)).toBeInTheDocument();
  });

  it('links back to signup', () => {
    render(<MemoryRouter><TermsView /></MemoryRouter>);
    const link = screen.getByText('Back to Signup');
    expect(link).toHaveAttribute('href', '/signup');
  });
});
