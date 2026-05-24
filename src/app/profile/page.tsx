'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  
  // Auth & loading states
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);
  
  // Alert/Message states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Password reset states
  const [codeSent, setCodeSent] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Resend cooldown timer
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
          setName(data.user.name);
          setPhone(data.user.phone || '');
          setEmail(data.user.email);
        } else {
          router.push('/login?redirect=/profile');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Allow document scrolling for profile page
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

  // Start cooldown timer for code resending
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

  // Handle Profile Update (Name, Phone)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setUpdatingProfile(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setUser(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Request verification code for password change
  const handleSendCode = async () => {
    setSendingCode(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      setPasswordSuccess(data.message);
      startTimer();
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  // Submit Password Change
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !newPassword) {
      setPasswordError('Please fill in both verification code and new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    setResettingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode, password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess('Password updated successfully!');
      setVerificationCode('');
      setNewPassword('');
      setCodeSent(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setCountdown(0);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      <div className="auth-card glass" style={{ maxWidth: '640px', width: '100%', margin: '40px auto' }}>
        
        {/* Header Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button 
            onClick={() => router.push('/')} 
            className="icon-btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', width: 'auto', padding: '6px 12px', borderRadius: '8px' }}
          >
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          
          {user && (user.role === 'super_admin' || user.role === 'admin') && (
            <button 
              onClick={() => router.push('/admin')}
              className="lobby-btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}
            >
              <Shield size={14} /> Control Room
            </button>
          )}
        </div>

        {/* Profile Logo/Title */}
        <div className="auth-logo" style={{ marginBottom: '24px' }}>
          <div className="auth-logo-icon">
            <UserIcon size={28} fill="white" />
          </div>
          <h1>Account Settings</h1>
          <p>Manage your details and security settings</p>
        </div>

        {/* PROFILE INFORMATION SECTION */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Personal Information
          </h2>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleUpdateProfile} className="auth-form">
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
                  disabled={updatingProfile}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={updatingProfile}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address (Cannot be changed)</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" style={{ opacity: 0.5 }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255, 255, 255, 0.01)' }}
                  value={email}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={updatingProfile}>
              {updatingProfile ? (
                <div className="flex-center">
                  <Loader2 className="animate-spin" size={16} />&nbsp;Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>

        {/* SECURITY / PASSWORD SECTION */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Change Password
          </h2>

          {passwordError && <div className="auth-error">{passwordError}</div>}
          {passwordSuccess && <div className="auth-success">{passwordSuccess}</div>}

          {!codeSent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                To secure your account, password updates require verification. A 6-digit code will be sent to your registered Gmail account: <strong>{email}</strong>.
              </p>
              <button 
                type="button" 
                className="guest-btn" 
                onClick={handleSendCode} 
                disabled={sendingCode}
                style={{ marginTop: '8px' }}
              >
                {sendingCode ? (
                  <div className="flex-center">
                    <Loader2 className="animate-spin" size={16} />&nbsp;Sending Code...
                  </div>
                ) : (
                  'Request Password Verification Code'
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChangeSubmit} className="auth-form">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Enter the verification code sent to <strong>{email}</strong> and your new password.
              </p>

              <div className="form-group">
                <label>Verification Code *</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="form-input"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    disabled={resettingPassword}
                    required
                    style={{ letterSpacing: '2px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>New Password *</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '8px' }} disabled={resettingPassword}>
                {resettingPassword ? (
                  <div className="flex-center">
                    <Loader2 className="animate-spin" size={16} />&nbsp;Updating Password...
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <span 
                  onClick={() => {
                    setCodeSent(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Cancel
                </span>
                
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  style={{ fontSize: '13px', color: countdown > 0 || sendingCode ? 'var(--text-muted)' : 'var(--accent-color)', cursor: countdown > 0 || sendingCode ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
