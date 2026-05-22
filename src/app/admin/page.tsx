'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, MessageSquare, Users, UserCheck, ArrowLeft, RefreshCw, UserPlus, X, Mail, Phone, Lock } from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for Admin registration
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Verify user is super admin
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      
      if (!authRes.ok || !authData.authenticated) {
        router.push('/login');
        return;
      }
      
      if (authData.user.role !== 'super_admin') {
        router.push('/chat'); // Redirect normal admins or users away
        return;
      }
      
      setCurrentUser(authData.user);

      // 2. Fetch all profiles
      const profilesRes = await fetch('/api/admin/all-profiles');
      const profilesData = await profilesRes.json();
      
      if (profilesRes.ok && profilesData.success) {
        const sanitized = profilesData.profiles.map((p: any) => ({
          ...p,
          _id: p._id || p.id,
          id: p.id || p._id,
        }));
        setProfiles(sanitized);
      } else {
        throw new Error('Failed to fetch system profiles');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update role');
      }

      // Update local profiles list
      setProfiles((prev) =>
        prev.map((p) => ((p._id || p.id) === userId ? { ...p, role: newRole } : p))
      );

      setFeedback({ type: 'success', message: `Successfully updated user role to ${newRole}` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setFeedback({ type: 'error', message: 'Name, email, and password are required' });
      return;
    }

    setCreatingAdmin(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          phone: newAdminPhone,
          password: newAdminPassword,
          role: newAdminRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      // Add to list and close
      const newUser = {
        ...data.user,
        _id: data.user.id || data.user._id,
        id: data.user.id || data.user._id,
      };
      setProfiles((prev) => [newUser, ...prev]);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPhone('');
      setNewAdminPassword('');
      setNewAdminRole('admin');
      setShowCreateModal(false);

      setFeedback({ type: 'success', message: 'Successfully created administrative account' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading control panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fullscreen-loader" style={{ flexDirection: 'column', gap: '20px', padding: '20px', textAlign: 'center' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px 30px',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '450px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(234, 0, 56, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff4b6b'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Connection Error</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
            We encountered an issue loading your data. Please check your connection and try again.
          </p>
          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={fetchDashboardData}
              style={{ flex: 1, margin: 0, padding: '12px', fontSize: '14px', width: 'auto' }}
            >
              Try Again
            </button>
            <button 
              className="btn-primary" 
              onClick={() => router.push('/login')}
              style={{ flex: 1, margin: 0, padding: '12px', fontSize: '14px', width: 'auto' }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Calculate some simple stats
  const totalUsers = profiles.length;
  const adminCount = profiles.filter((p) => p.role === 'admin' || p.role === 'super_admin').length;
  const regularUsersCount = profiles.filter((p) => p.role === 'user').length;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1>Control Room</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Manage administrative roles and system users
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/chat')}>
          <ArrowLeft size={16} /> Back to Support Chat
        </button>
      </header>

      {feedback && (
        <div
          className="auth-error"
          style={{
            background: feedback.type === 'success' ? 'rgba(37, 211, 102, 0.1)' : 'rgba(234, 0, 56, 0.1)',
            borderColor: feedback.type === 'success' ? 'rgba(37, 211, 102, 0.25)' : 'rgba(234, 0, 56, 0.25)',
            color: feedback.type === 'success' ? 'var(--success-color)' : '#ff4b6b',
            marginBottom: '24px',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon-wrapper users">
            <Users size={22} />
          </div>
          <div>
            <div className="stat-label">Total Accounts</div>
            <div className="stat-number">{totalUsers}</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper admins">
            <Shield size={22} />
          </div>
          <div>
            <div className="stat-label">Administrators</div>
            <div className="stat-number">{adminCount}</div>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon-wrapper messages">
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-label">Regular Users</div>
            <div className="stat-number">{regularUsersCount}</div>
          </div>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="admin-table-container glass">
        <div
          style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontWeight: 600 }}>System Accounts Directory</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              className="btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                width: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: 0,
                boxShadow: 'none'
              }}
              onClick={() => {
                setShowCreateModal(true);
                setFeedback(null);
              }}
            >
              <UserPlus size={16} /> Create Account
            </button>
            <button className="icon-btn" title="Refresh data" onClick={fetchDashboardData}>
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Profile Name / Email</th>
              <th>Phone Number</th>
              <th>Date Registered</th>
              <th>System Role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const profileId = profile._id || profile.id;
              const isSelf = profileId === currentUser.id;
              return (
                <tr key={profileId}>
                  <td>
                    <div className="profile-cell">
                      <div className="avatar-wrapper" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="avatar-image" />
                        ) : (
                          profile.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                            .substring(0, 2)
                        )}
                      </div>
                      <div className="profile-cell-details">
                        <span className="profile-cell-name">{profile.name}</span>
                        <span className="profile-cell-email">{profile.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: profile.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {profile.phone || '—'}
                    </span>
                  </td>
                  <td>
                    {new Date(profile.createdAt).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td>
                    {isSelf ? (
                      <span className="role-badge super_admin" style={{ padding: '6px 12px' }}>
                        Super Admin (You)
                      </span>
                    ) : (
                      <select
                        className="role-select"
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profileId, e.target.value)}
                        disabled={updatingId === profileId}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Account Creation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Administrative Account</h2>
              <button className="icon-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <div className="input-wrapper">
                    <Users size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Admin Full Name"
                      className="form-input"
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      disabled={creatingAdmin}
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
                      placeholder="admin@example.com"
                      className="form-input"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      disabled={creatingAdmin}
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
                      value={newAdminPhone}
                      onChange={(e) => setNewAdminPhone(e.target.value)}
                      disabled={creatingAdmin}
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
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      disabled={creatingAdmin}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Account Role</label>
                  <select
                    className="role-select"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    disabled={creatingAdmin}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creatingAdmin}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0 }}
                  disabled={creatingAdmin}
                >
                  {creatingAdmin ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
