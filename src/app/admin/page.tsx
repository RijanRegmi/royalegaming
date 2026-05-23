'use strict';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  MessageSquare, 
  Users, 
  UserCheck, 
  ArrowLeft, 
  RefreshCw, 
  UserPlus, 
  X, 
  Mail, 
  Phone, 
  Lock, 
  Gamepad2, 
  Plus, 
  Edit2, 
  Trash2, 
  Globe, 
  Image as ImageIcon 
} from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'users' | 'games'>('users');
  
  // Common states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Users management states ---
  const [profiles, setProfiles] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // --- Games management states ---
  const [games, setGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<any>(null); // null for create, game object for edit
  const [gameName, setGameName] = useState('');
  const [gameLink, setGameLink] = useState('');
  const [gameImageUrl, setGameImageUrl] = useState('');
  const [gameImageFile, setGameImageFile] = useState<File | null>(null);
  const [gameImagePreview, setGameImagePreview] = useState('');
  const [savingGame, setSavingGame] = useState(false);

  // Fetch admin dashboard details (users profiles)
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

  // Fetch games
  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (res.ok && data.success) {
        setGames(data.games);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setLoadingGames(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchGames();

    // Allow document scrolling for admin dashboard page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [router]);

  // Handle user roles changes (users tab)
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

  // Handle creating administrative accounts (users tab)
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

  // --- Games operations ---

  const openCreateModal = () => {
    setEditingGame(null);
    setGameName('');
    setGameLink('');
    setGameImageUrl('');
    setGameImagePreview('');
    setGameImageFile(null);
    setShowGameModal(true);
    setFeedback(null);
  };

  const openEditModal = (game: any) => {
    setEditingGame(game);
    setGameName(game.name);
    setGameLink(game.link);
    setGameImageUrl(game.image);
    setGameImagePreview(game.image);
    setGameImageFile(null);
    setShowGameModal(true);
    setFeedback(null);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to delete this game platform?')) return;

    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/games?id=${gameId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete game');
      }

      setGames((prev) => prev.filter((g) => g._id !== gameId));
      setFeedback({ type: 'success', message: 'Successfully deleted game platform!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName || !gameLink) {
      setFeedback({ type: 'error', message: 'Name and play link are required' });
      return;
    }

    setSavingGame(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('name', gameName);
      formData.append('link', gameLink);

      if (gameImageFile) {
        formData.append('file', gameImageFile);
      } else if (gameImageUrl) {
        formData.append('imageUrl', gameImageUrl);
      } else if (!editingGame) {
        throw new Error('Please select an image file or enter an image URL');
      }

      let res;
      if (editingGame) {
        formData.append('id', editingGame._id);
        res = await fetch('/api/admin/games', {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/games', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save game');
      }

      await fetchGames();

      setGameName('');
      setGameLink('');
      setGameImageFile(null);
      setGameImageUrl('');
      setGameImagePreview('');
      setEditingGame(null);
      setShowGameModal(false);

      setFeedback({
        type: 'success',
        message: `Successfully ${editingGame ? 'updated' : 'created'} game platform: ${gameName}!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSavingGame(false);
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

  // Calculate accounts stats
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
            Manage game lobby platforms, user support routing, and administrator roles
          </p>
        </div>
        <button className="btn-secondary" onClick={() => router.push('/')}>
          <ArrowLeft size={16} /> Back to Lobby Front
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

      {/* Tabs Switcher */}
      <div 
        className="admin-tabs" 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px', 
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px' 
        }}
      >
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'users' ? '3px solid var(--super-admin-color)' : '3px solid transparent',
            color: activeTab === 'users' ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'none',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Users size={16} /> User Accounts
        </button>
        <button
          className={`tab-btn ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('games');
            fetchGames();
          }}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'games' ? '3px solid var(--super-admin-color)' : '3px solid transparent',
            color: activeTab === 'games' ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: 'none',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Gamepad2 size={16} /> Lobby Game Platforms
        </button>
      </div>

      {/* Stats Cards (Dynamic based on Tab) */}
      {activeTab === 'users' ? (
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
      ) : (
        <div className="admin-stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-wrapper users" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--super-admin-color)' }}>
              <Gamepad2 size={22} />
            </div>
            <div>
              <div className="stat-label">Total Games</div>
              <div className="stat-number">{games.length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper admins" style={{ background: 'rgba(0, 168, 132, 0.1)', color: 'var(--accent-color)' }}>
              <Globe size={22} />
            </div>
            <div>
              <div className="stat-label">Active Links</div>
              <div className="stat-number">{games.filter(g => g.link).length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper messages" style={{ background: 'rgba(0, 128, 255, 0.1)', color: 'var(--admin-color)' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="stat-label">Lobby Grid</div>
              <div className="stat-number">Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Tab Contents */}
      {activeTab === 'users' ? (
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
      ) : (
        /* Games Directory Grid view */
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
            <span style={{ fontWeight: 600 }}>Lobby Game Platforms</span>
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
                onClick={openCreateModal}
              >
                <Plus size={16} /> Add Game Card
              </button>
              <button className="icon-btn" title="Refresh data" onClick={fetchGames}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loadingGames ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No games found. Click "Add Game Card" to create one.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Game Name</th>
                  <th>Image File / URL</th>
                  <th>Game Redirect Link</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game._id}>
                    <td>
                      <div className="profile-cell">
                        <div style={{ 
                          width: '46px', 
                          height: '46px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '1px solid var(--border-color)', 
                          background: 'rgba(0,0,0,0.3)',
                          flexShrink: 0
                        }}>
                          <img 
                            src={game.image} 
                            alt={game.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 600, marginLeft: '12px' }}>{game.name}</span>
                      </div>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)', 
                          wordBreak: 'break-all',
                          fontFamily: 'monospace'
                        }}
                      >
                        {game.image}
                      </span>
                    </td>
                    <td>
                      <a 
                        href={game.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          color: 'var(--accent-color)', 
                          fontSize: '13px', 
                          textDecoration: 'underline',
                          wordBreak: 'break-all'
                        }}
                      >
                        {game.link}
                      </a>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          className="icon-btn" 
                          title="Edit Game Details" 
                          onClick={() => openEditModal(game)}
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="icon-btn" 
                          title="Delete Platform" 
                          onClick={() => handleDeleteGame(game._id)}
                          style={{ color: 'var(--error-color)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Account Creation Modal (Tab: Users) */}
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

      {/* Game Add/Edit Modal (Tab: Games) */}
      {showGameModal && (
        <div className="modal-overlay" onClick={() => setShowGameModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{editingGame ? 'Edit Game Platform' : 'Add New Game Platform'}</h2>
              <button className="icon-btn" onClick={() => setShowGameModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveGame}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Live Card Preview Box */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px',
                  gap: '8px'
                }}>
                  {gameImagePreview ? (
                    <div style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      border: '2px solid var(--super-admin-color)',
                      boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)'
                    }}>
                      <img 
                        src={gameImagePreview} 
                        alt="Slot preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ 
                      width: '110px', 
                      height: '110px', 
                      borderRadius: '12px', 
                      border: '2px dashed var(--border-color)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-muted)' 
                    }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {gameName || 'Platform Logo'} Card Preview
                  </span>
                </div>

                <div className="form-group">
                  <label>Game Name *</label>
                  <div className="input-wrapper">
                    <Gamepad2 size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. FireKirin, OrionStar, Juwa"
                      className="form-input"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      disabled={savingGame}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Play Link URL *</label>
                  <div className="input-wrapper">
                    <Globe size={16} className="input-icon" />
                    <input
                      type="url"
                      placeholder="https://firekirin.xyz/ (or game link)"
                      className="form-input"
                      value={gameLink}
                      onChange={(e) => setGameLink(e.target.value)}
                      disabled={savingGame}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload Image File</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="game-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setGameImageFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setGameImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      disabled={savingGame}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ 
                        padding: '10px 14px', 
                        fontSize: '13px', 
                        width: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        margin: 0, 
                        justifyContent: 'center',
                        border: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.02)'
                      }}
                      onClick={() => document.getElementById('game-file-input')?.click()}
                      disabled={savingGame}
                    >
                      <ImageIcon size={15} /> 
                      {gameImageFile ? `Selected: ${gameImageFile.name.substring(0, 20)}...` : 'Choose Image File'}
                    </button>
                  </div>
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--text-muted)', 
                    fontSize: '11px', 
                    margin: '2px 0' 
                  }}
                >
                  — OR —
                </div>

                <div className="form-group">
                  <label>Direct Image URL</label>
                  <div className="input-wrapper">
                    <ImageIcon size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Paste online image URL (e.g. https://...)"
                      className="form-input"
                      value={gameImageUrl}
                      onChange={(e) => {
                        setGameImageUrl(e.target.value);
                        setGameImagePreview(e.target.value);
                      }}
                      disabled={savingGame}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setShowGameModal(false)}
                  disabled={savingGame}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0 }}
                  disabled={savingGame}
                >
                  {savingGame ? 'Saving...' : editingGame ? 'Save Changes' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
