import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import AuthModal from './AuthModal';

// Mock API module
vi.mock('../utils/api', () => ({
  registerUser: vi.fn(async (email, fullName) => {
    if (!email || !email.trim()) {
      throw new Error('Please enter a valid email address.');
    }
    if (!fullName || !fullName.trim()) {
      throw new Error('Please enter your full name.');
    }
    return {
      success: true,
      user: {
        id: 'user_reg_123',
        name: fullName,
        username: `@${email.split('@')[0]}`,
        email: email
      },
      password: 'xK9m2pQ7'
    };
  }),
  loginUser: vi.fn(async (email, password) => {
    if (password !== 'xK9m2pQ7') {
      throw new Error('Incorrect password. Please try again.');
    }
    return {
      success: true,
      user: {
        id: 'user_reg_123',
        name: 'Alex Rivera',
        username: `@${email.split('@')[0]}`
      }
    };
  }),
  checkEmailExists: vi.fn(async (email) => {
    if (email === 'alex@gmail.com') {
      return { exists: true, name: 'Alex Rivera', username: '@alex', email };
    }
    return { exists: false };
  }),
  checkDisplayNameExists: vi.fn(async () => ({ exists: false })),
  sendPasswordResetOtp: vi.fn(async (email) => {
    if (email !== 'alex@gmail.com') {
      throw new Error('No account found with this email.');
    }
    return {
      success: true,
      message: 'A 6-digit verification code has been sent directly to your Gmail inbox (alex@gmail.com).'
    };
  }),
  verifyOtpAndResetPassword: vi.fn(async (email, otp, newPassword) => {
    return {
      success: true,
      message: 'Password successfully reset! Please sign in with your new password.'
    };
  }),
  resetPassword: vi.fn(async (email) => {
    if (!email || !email.trim()) {
      throw new Error('Please enter your registered email address.');
    }
    return {
      success: true,
      password: 'newPassword123'
    };
  })
}));

describe('AuthModal Component with Email + Password Flow', () => {
  it('renders login form by default', () => {
    const { container } = render(<AuthModal onLogin={() => {}} />);
    expect(screen.getByText(/SecureChat/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/alex@example.com/i)).toBeInTheDocument();
    // Submit button is the one inside the form
    const submitBtn = container.querySelector('form button[type="submit"]');
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.textContent).toContain('Sign In');
  });

  it('validates empty email on login', async () => {
    const { container } = render(<AuthModal onLogin={() => {}} />);
    const form = container.querySelector('form');

    fireEvent.submit(form);

    expect(await screen.findByText('Please enter your email address.')).toBeInTheDocument();
  });

  it('switches to register tab and registers user', async () => {
    render(<AuthModal onLogin={() => {}} />);

    // Click Register tab
    fireEvent.click(screen.getByText('Register'));

    const emailInput = screen.getByPlaceholderText(/alex@example.com/i);
    const nameInput = screen.getByPlaceholderText(/Alex Rivera/i);

    fireEvent.change(emailInput, { target: { value: 'alex@example.com' } });
    fireEvent.change(nameInput, { target: { value: 'Alex Rivera' } });

    const form = document.querySelector('form');
    fireEvent.submit(form);

    // Should show generated password
    await waitFor(() => {
      expect(screen.getByText('Account Created!')).toBeInTheDocument();
      expect(screen.getByText('xK9m2pQ7')).toBeInTheDocument();
    });
  });

  it('logs in with correct password', async () => {
    const handleLogin = vi.fn();
    const { container } = render(<AuthModal onLogin={handleLogin} />);

    const emailInput = screen.getByPlaceholderText(/alex@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'alex@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'xK9m2pQ7' } });

    const form = container.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(handleLogin).toHaveBeenCalledWith(expect.objectContaining({
        id: 'user_reg_123',
        name: 'Alex Rivera'
      }));
    });
  });

  it('verifies Gmail address and requests OTP without displaying code in app', async () => {
    render(<AuthModal onLogin={() => {}} />);

    // Click Forgot Password?
    fireEvent.click(screen.getByText('Forgot Password?'));

    const emailInput = screen.getByPlaceholderText(/yourname@gmail.com/i);
    
    // Type email with typo: alex@gmai.com
    fireEvent.change(emailInput, { target: { value: 'alex@gmai.com' } });
    expect(await screen.findByText(/Did you mean @gmail.com\?/i)).toBeInTheDocument();

    // Fix to valid registered Gmail
    fireEvent.change(emailInput, { target: { value: 'alex@gmail.com' } });

    // Wait for registered account verification
    await waitFor(() => {
      expect(screen.getByText(/Correct registered Gmail: Alex Rivera/i)).toBeInTheDocument();
    });

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP to Gmail/i });
    expect(sendOtpBtn).not.toBeDisabled();
    fireEvent.click(sendOtpBtn);

    // Wait for OTP Sent notice
    await waitFor(() => {
      expect(screen.getByText(/OTP Sent to alex@gmail.com/i)).toBeInTheDocument();
    });

    // Ensure NO dev OTP code or hint is rendered in the app!
    expect(screen.queryByText(/Dev OTP/i)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter 6-digit OTP/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paste Code/i })).toBeInTheDocument();
  });
});
