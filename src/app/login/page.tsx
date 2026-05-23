'use strict';
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, MessageSquare } from 'lucide-react';

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
  }, [mounted, activeTab]);

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

      router.push(redirectUrl);
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

      router.push(redirectUrl);
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

      router.push(redirectUrl);
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

      router.push(redirectUrl);
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

      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message);
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

        <div className="auth-tabs">
          <div
            className={`auth-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signin');
              setError(null);
            }}
          >
            Sign In
          </div>
          <div
            className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              setError(null);
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
                  type="password"
                  placeholder="Enter password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
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
                  type="password"
                  placeholder="Password (min 6 chars)"
                  className="form-input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                />
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
              <span className="auth-switch-link" onClick={() => setActiveTab('register')}>
                Register here
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span className="auth-switch-link" onClick={() => setActiveTab('signin')}>
                Sign In here
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
