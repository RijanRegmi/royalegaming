'use strict';
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, MessageSquare, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [redirectUrl, setRedirectUrl] = useState('/');

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password wizard
  const [forgotStep, setForgotStep] = useState<'none' | 'email' | 'code' | 'reset'>('none');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCodeDigits, setForgotCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mount state for hydration safety
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get('redirect');
      if (redir) {
        setRedirectUrl(redir);
      }
      const tabParam = params.get('tab');
      if (tabParam === 'register' || tabParam === 'signup') {
        setActiveTab('register');
      }
    }
  }, []);

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Guest login failed');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !regEmail || !regPassword || !regConfirmPassword) {
      setError('All fields are required');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      setSuccessMessage(data.message);
      setForgotStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...forgotCodeDigits];
    newDigits[index] = value;
    setForgotCodeDigits(newDigits);

    // Auto-focus next input if filled
    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !forgotCodeDigits[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newDigits = [...forgotCodeDigits];
        newDigits[index - 1] = '';
        setForgotCodeDigits(newDigits);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    // Extract only digits, ignoring spaces, dashes, or other non-numeric characters
    const digitsOnly = pastedData.replace(/\D/g, '');
    
    if (digitsOnly.length > 0) {
      const newDigits = [...forgotCodeDigits];
      const limit = Math.min(digitsOnly.length, 6);
      for (let i = 0; i < limit; i++) {
        newDigits[i] = digitsOnly[i];
      }
      setForgotCodeDigits(newDigits);
      // Focus the appropriate input based on the pasted length
      const focusIndex = Math.min(limit, 5);
      const targetInput = document.getElementById(`digit-${focusIndex}`);
      if (targetInput) targetInput.focus();
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = forgotCodeDigits.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid code');
      }
      setForgotStep('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const fullCode = forgotCodeDigits.join('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          code: fullCode,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setSuccessMessage(data.message);
      setForgotStep('none');
      setForgotEmail('');
      setForgotCodeDigits(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setRegConfirmPassword('');
      setActiveTab('signin');
      setEmailOrPhone(forgotEmail);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card glass">
        <div className="auth-logo">
          <img 
            src="/royale_logo.jpg" 
            alt="Royale Gaming Logo" 
            style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px' }}
          />
          <h1>Royale Gaming</h1>
          <p>Support Chat System</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

        {forgotStep === 'none' ? (
          <>
            <div className="auth-tabs">
              <div
                className={`auth-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                Sign In
              </div>
              <div
                className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                Register
              </div>
            </div>

            {activeTab === 'signin' ? (
              <form className="auth-form" onSubmit={handleSignInSubmit}>
                <div className="form-group">
                  <label>Email or Phone</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Enter email or phone number"
                      className="form-input"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      disabled={loading}
                      autoCapitalize="none"
                      autoCorrect="off"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      className="form-input has-toggle"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="password-toggle-btn"
                    >
                      {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="forgot-password-link-container">
                  <span
                    className="forgot-password-link"
                    onClick={() => {
                      setForgotStep('email');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Loading...</div> : 'Sign In'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <div className="input-wrapper">
                    <UserIcon size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Your Name"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      required
                      maxLength={50}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="form-input"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={loading}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      className="form-input"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                      disabled={loading}
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Password (min 6 chars)"
                      className="form-input has-toggle"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={6}
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="password-toggle-btn"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password *</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      className="form-input has-toggle"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="password-toggle-btn"
                    >
                      {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Loading...</div> : 'Register'}
                </button>
              </form>
            )}

            <div className="auth-switch-text">
              {activeTab === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <span className="auth-switch-link" onClick={() => { setActiveTab('register'); setError(null); setSuccessMessage(null); }}>
                    Register here
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="auth-switch-link" onClick={() => { setActiveTab('signin'); setError(null); setSuccessMessage(null); }}>
                    Sign In here
                  </span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="auth-form-container">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                {forgotStep === 'email' && 'Forgot Password'}
                {forgotStep === 'code' && 'Verification Code'}
                {forgotStep === 'reset' && 'Reset Password'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {forgotStep === 'email' && 'Enter your email to receive a 6-digit verification code.'}
                {forgotStep === 'code' && `We sent a code to ${forgotEmail}.`}
                {forgotStep === 'reset' && 'Choose a new password for your account.'}
              </p>
            </div>

            {forgotStep === 'email' && (
              <form className="auth-form" onSubmit={handleForgotEmailSubmit}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      placeholder="email@example.com"
                      className="form-input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={loading}
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      maxLength={100}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Sending Code...</div> : 'Send Verification Code'}
                </button>

                <button
                  type="button"
                  className="guest-btn"
                  style={{ marginTop: '4px' }}
                  onClick={() => {
                    setForgotStep('none');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={loading}
                >
                  Back to Sign In
                </button>
              </form>
            )}

            {forgotStep === 'code' && (
              <form className="auth-form" onSubmit={handleVerifyCodeSubmit}>
                <div className="form-group">
                  <label style={{ textAlign: 'center', marginBottom: '8px' }}>Verification Code</label>
                  <div className="code-inputs-container">
                    {forgotCodeDigits.map((digit, index) => (
                      <input
                        key={index}
                        id={`digit-${index}`}
                        type="text"
                        maxLength={1}
                        className="code-digit-input"
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        disabled={loading}
                        required
                        autoComplete="off"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Verifying...</div> : 'Verify Code'}
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="guest-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setForgotStep('email');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    disabled={loading}
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    className="guest-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setForgotStep('none');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="New password (min 6 chars)"
                      className="form-input has-toggle"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={6}
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="password-toggle-btn"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      className="form-input has-toggle"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      maxLength={50}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="password-toggle-btn"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Resetting Password...</div> : 'Reset Password'}
                </button>

                <button
                  type="button"
                  className="guest-btn"
                  onClick={() => {
                    setForgotStep('none');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
