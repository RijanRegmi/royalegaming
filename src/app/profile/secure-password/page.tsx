'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield, MessageSquare, Check, Key } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
}

export default function SecurePasswordPage() {
  const router = useRouter();

  // Auth & loading states
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestingCode, setRequestingCode] = useState<boolean>(false);
  const [verifyingCode, setVerifyingCode] = useState<boolean>(false);
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);

  // Wizard state: 'request' | 'verify' | 'new-password'
  const [step, setStep] = useState<'request' | 'verify' | 'new-password'>('request');

  // Form inputs
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Password visibility
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Status alerts
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Resend countdown timer
  const [countdown, setCountdown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (res.ok && data.authenticated) {
          setUser(data.user);
        } else {
          router.push('/login?redirect=/profile/secure-password');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Allow document scrolling for this page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [router]);

  // Start countdown timer for code resending
  const startTimer = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Request code
  const handleRequestCode = async () => {
    setRequestingCode(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setStep('verify');
      setSuccess(data.message);
      startTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(msg);
    } finally {
      setRequestingCode(false);
    }
  };

  // Digit code handling (forgot password style)
  const handleDigitChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`digit-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        const newCode = [...verificationCode];
        newCode[index - 1] = '';
        setVerificationCode(newCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digitsOnly = pastedData.replace(/\D/g, '');

    if (digitsOnly.length > 0) {
      const newCode = [...verificationCode];
      const limit = Math.min(digitsOnly.length, 6);
      for (let i = 0; i < limit; i++) {
        newCode[i] = digitsOnly[i];
      }
      setVerificationCode(newCode);
      const focusIndex = Math.min(limit, 5);
      const targetInput = document.getElementById(`digit-${focusIndex}`);
      if (targetInput) targetInput.focus();
    }
  };

  // Step 2: Verify Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = verificationCode.join('');
    if (fullCode.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setVerifyingCode(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setStep('new-password');
      setSuccess('Verification code verified successfully! Enter your new password.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      setError(msg);
    } finally {
      setVerifyingCode(false);
    }
  };

  // Step 3: Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setResettingPassword(true);
    setError(null);
    setSuccess(null);

    const fullCode = verificationCode.join('');

    try {
      const res = await fetch('/api/auth/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode, password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setSuccess('Password updated successfully! Redirecting to profile...');
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setError(msg);
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading page...</p>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      <div className="auth-card glass" style={{ maxWidth: '520px', width: '100%', margin: '40px auto' }}>

        {/* Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/profile')}
            className="icon-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
          >
            <ArrowLeft size={16} /> Back to Settings
          </button>
        </div>

        {/* Title */}
        <div className="auth-logo" style={{ marginBottom: '28px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
            background: 'transparent',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <img
              src="/rilogram_logo.png"
              alt="Rilogram Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.22)', transformOrigin: 'center' }}
            />
          </div>
          <h1>Secure Change</h1>
          <p>Verify your email to update your password</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {/* STEP 1: REQUEST CODE */}
        {step === 'request' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We will send a 6-digit secure verification code to your registered Gmail address: <strong>{user?.email}</strong>.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRequestCode}
              disabled={requestingCode}
              style={{ marginTop: '12px' }}
            >
              {requestingCode ? (
                <div className="flex-center">
                  <Loader2 className="animate-spin" size={16} />&nbsp;Sending code...
                </div>
              ) : (
                'Send Verification Code'
              )}
            </button>
          </div>
        )}

        {/* STEP 2: VERIFY CODE */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="auth-form">
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
              Enter the 6-digit verification code sent to <strong>{user?.email}</strong>
            </p>

            <div className="form-group">
              <div className="code-inputs-container" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {verificationCode.map((digit, index) => (
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
                    disabled={verifyingCode}
                    required
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={{ width: '44px', height: '44px', fontSize: '18px' }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={verifyingCode}
              style={{ marginTop: '12px' }}
            >
              {verifyingCode ? (
                <div className="flex-center">
                  <Loader2 className="animate-spin" size={16} />&nbsp;Verifying code...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span
                onClick={() => {
                  setStep('request');
                  setError(null);
                  setSuccess(null);
                }}
                style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Back
              </span>

              <button
                type="button"
                onClick={handleRequestCode}
                disabled={countdown > 0 || requestingCode}
                style={{ fontSize: '13px', color: countdown > 0 || requestingCode ? 'var(--text-muted)' : 'var(--accent-color)', cursor: countdown > 0 || requestingCode ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {step === 'new-password' && (
          <form onSubmit={handleChangePassword} className="auth-form">
            <div className="form-group">
              <label>New Password *</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  className="form-input has-toggle"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resettingPassword}
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
              <label>Confirm Password *</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  className="form-input has-toggle"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resettingPassword}
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

            <button
              type="submit"
              className="btn-primary"
              disabled={resettingPassword}
              style={{ marginTop: '12px' }}
            >
              {resettingPassword ? (
                <div className="flex-center">
                  <Loader2 className="animate-spin" size={16} />&nbsp;Updating Password...
                </div>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
