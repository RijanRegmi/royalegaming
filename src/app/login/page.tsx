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

  // Password toggles
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password wizard
  const [forgotStep, setForgotStep] = useState<'none' | 'email' | 'code' | 'reset'>('none');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);

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
    }
  }, []);

  // Initialize Google Sign-in
  useEffect(() => {
    if (!mounted) return;

    const initGoogle = () => {
      const g = (window as any).google;
      if (g && g.accounts && g.accounts.id) {
        g.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id.apps.googleusercontent.com',
          callback: handleGoogleLogin,
        });

        if (googleBtnRef.current) {
          g.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            width: 380,
            text: 'signup_with',
            shape: 'rectangular',
          });
        }
      }
    };

    // Retry checking google object if Script has not fully executed
    const checkInterval = setInterval(() => {
      if ((window as any).google) {
        initGoogle();
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [mounted, activeTab, forgotStep]);

  const handleGoogleLogin = async (response: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google login failed');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const randomId = Math.random().toString(36).substring(2, 7).toUpperCase();
      const payload = {
        name: `Google Dev User ${randomId}`,
        email: `googledev_${randomId.toLowerCase()}@royalegaming.com`,
        sub: `mock_google_dev_sub_${randomId.toLowerCase()}`,
        picture: "https://lh3.googleusercontent.com/a/default-user"
      };
      // Encode as mock JWT
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const body = btoa(JSON.stringify(payload));
      const mockCredential = `${header}.${body}.mocksignature`;

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: mockCredential }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mock Google login failed');
      }

      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

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
    if (!name || !regEmail || !regPassword) {
      setError('Name, email, and password are required');
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

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCode) {
      setError('Please enter the verification code');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode }),
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
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          code: forgotCode,
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
      setForgotCode('');
      setNewPassword('');
      setConfirmPassword('');
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
          <div className="auth-logo-icon">
            <MessageSquare size={28} fill="white" />
          </div>
          <h1>RoyaleGaming</h1>
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
                      onChange={(e) => setRegPhone(e.target.value)}
                      disabled={loading}
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

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <div className="flex-center"><div className="spinner" style={{ width: '16px', height: '16px', borderTopColor: 'white' }}></div>&nbsp;Loading...</div> : 'Register'}
                </button>
              </form>
            )}

            <div className="divider">or</div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '12px' }}>
              <div ref={googleBtnRef} id="google-signin-btn"></div>
            </div>

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
                  <label>Verification Code</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="form-input"
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value)}
                      disabled={loading}
                      required
                      maxLength={6}
                    />
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
