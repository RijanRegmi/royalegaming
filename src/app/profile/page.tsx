'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './profile.module.css';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield, LogOut, Pencil } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  createdAt?: string;
}

export default function ProfilePage() {
  const router = useRouter();

  // Auth & loading states
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
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

  // Avatar upload handling
  const [avatar, setAvatar] = useState<string>('');
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarEdit = () => {
    setShowAvatarModal(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fast preview local upload
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    setShowAvatarModal(false);

    // Call API to upload/save avatar
    try {
      setError(null);
      setSuccess(null);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch('/api/auth/profile/avatar', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      setAvatar(data.user.avatar || '');
      setUser(data.user);
      setSuccess('Avatar updated successfully!');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to upload avatar';
      setError(msg);
    }
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarModal(false);
    try {
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/auth/profile/avatar', {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove avatar');
      }

      setAvatar('');
      if (user) {
        setUser({ ...user, avatar: undefined });
      }
      setSuccess('Avatar removed successfully!');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to remove avatar';
      setError(msg);
    }
  };

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
          setAvatar(data.user.avatar || '');
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPasswordError(msg);
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
      <div className="auth-card" style={{ maxWidth: '640px', width: '100%', margin: '40px auto' }}>

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
        <div className={styles.avatarContainer}>
          <div className={styles.avatarWrapper} onClick={handleAvatarEdit}>
            {avatar ? (
              <img src={avatar} alt="User Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <UserIcon size={48} style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
            <div className={styles.avatarEditIcon}>
              <Pencil size={16} />
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>Account Settings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Manage your details and security settings</p>
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

      {showAvatarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAvatarModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Profile Photo</h3>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.uploadBtn}`}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAvatarModal(false);
                }}
              >
                Upload Photo
              </button>
              {avatar && (
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.removeBtn}`}
                  onClick={handleRemoveAvatar}
                >
                  Remove Photo
                </button>
              )}
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.cancelBtn}`}
                onClick={() => setShowAvatarModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
