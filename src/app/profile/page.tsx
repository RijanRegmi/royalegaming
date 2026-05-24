'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield, LogOut } from 'lucide-react';

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

  // Password change states
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

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
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [router]);

  // Handle User Sign Out
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
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

  // Handle Direct Password Change
  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordError('New password and confirm password are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setResettingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const res = await fetch('/api/auth/profile/change-password-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {user && (user.role === 'super_admin' || user.role === 'admin') && (
              <button 
                onClick={() => router.push('/admin')}
                className="lobby-btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}
              >
                <Shield size={14} /> Control Room
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="lobby-btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '8px', color: 'var(--error-color)', borderColor: 'rgba(234, 0, 56, 0.2)' }}
              title="Sign Out"
            >
              <LogOut size={14} />
              <span className="lobby-btn-label">Sign Out</span>
            </button>
          </div>
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

          <form onSubmit={handleDirectPasswordChange} className="auth-form">
            <div className="form-group">
              <label>Current Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  className="form-input has-toggle"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={resettingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="password-toggle-btn"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

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
              <label>Confirm New Password *</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resettingPassword}
                  required
                />
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

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span 
                onClick={() => router.push('/profile/secure-password')}
                className="auth-switch-link"
                style={{ fontSize: '13px' }}
              >
                Change password using email verification code
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
