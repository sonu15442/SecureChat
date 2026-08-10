import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthModal from './AuthModal';

describe('AuthModal Component', () => {
  it('renders login header and input fields', () => {
    render(<AuthModal onLogin={() => {}} />);
    expect(screen.getByText(/SecureChat Login/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alex_rivera/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });

  it('displays validation error if submitted empty', () => {
    render(<AuthModal onLogin={() => {}} />);
    const submitBtn = screen.getByRole('button', { name: /Sign In to SecureChat/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/Please enter both username and password/i)).toBeInTheDocument();
  });

  it('triggers onLogin when form is submitted with valid credentials', () => {
    const handleLogin = vi.fn();
    render(<AuthModal onLogin={handleLogin} />);
    
    const usernameInput = screen.getByPlaceholderText(/alex_rivera/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to SecureChat/i });

    fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    expect(handleLogin).toHaveBeenCalledTimes(1);
    expect(handleLogin.mock.calls[0][0].username).toBe('@john_doe');
  });
});
