'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './profile.module.css';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield, LogOut, Pencil, Trash2, Heart, Image as ImageIcon, X } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  username?: string;
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
  const [username, setUsername] = useState<string>('');

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

  // Custom view states for admin
  const [showEditForm, setShowEditForm] = useState<boolean>(true);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editDeleteImage, setEditDeleteImage] = useState<boolean>(false);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Post creator states
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch admin's own posts
  const loadMyPosts = async (userId: string) => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts?adminId=${userId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMyPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Error fetching admin posts:', err);
    } finally {
      setLoadingPosts(false);
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
          setUsername(data.user.username || '');
          
          const isAdmin = data.user.role === 'admin' || data.user.role === 'super_admin';
          setShowEditForm(!isAdmin);
          if (isAdmin) {
            loadMyPosts(data.user._id);
          }
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

  // Handle Profile Update (Name, Phone, Username)
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
      const isUserAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
      const res = await fetch('/api/auth/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          phone, 
          username: isUserAdmin ? username : undefined 
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setUser(data.user);
      if (data.user.username) {
        setUsername(data.user.username);
      }
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

  // Post Creator Handlers
  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveCreateImage = () => {
    setFile(null);
    setImagePreview(null);
    if (createFileInputRef.current) {
      createFileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setContent('');
        setFile(null);
        setImagePreview(null);
        if (createFileInputRef.current) {
          createFileInputRef.current.value = '';
        }
        setMyPosts((prev) => [data.post, ...prev]);
      } else {
        alert(data.error || 'Failed to publish announcement');
      }
    } catch (err) {
      console.error('Publish error:', err);
      alert('Error publishing announcement');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit/Delete/Like post handlers
  const startEditPost = (post: any) => {
    setEditingPostId(post._id);
    setEditContent(post.content || '');
    setEditImagePreview(post.image || null);
    setEditDeleteImage(false);
    setEditFile(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setEditFile(selectedFile);
      setEditDeleteImage(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleRemoveEditImage = () => {
    setEditFile(null);
    setEditImagePreview(null);
    setEditDeleteImage(true);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId) return;

    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('postId', editingPostId);
      formData.append('content', editContent);
      if (editFile) {
        formData.append('file', editFile);
      }
      formData.append('deleteImage', editDeleteImage ? 'true' : 'false');

      const res = await fetch('/api/posts', {
        method: 'PUT',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMyPosts((prev) =>
          prev.map((post) => (post._id === editingPostId ? data.post : post))
        );
        setEditingPostId(null);
      } else {
        alert(data.error || 'Failed to update post');
      }
    } catch (err) {
      console.error('Update post error:', err);
      alert('Error updating post');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/posts?postId=${postId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMyPosts(prev => prev.filter(p => p._id !== postId));
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Delete post error:', err);
      alert('Error deleting post');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMyPosts((prev) =>
          prev.map((post) => {
            if (post._id === postId) {
              return { ...post, likes: data.likes };
            }
            return post;
          })
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const formatPostTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="fullscreen-loader">
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px' }}>Loading profile...</p>
      </div>
    );
  }

  const isUserAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

  return (
    <div className="auth-page" style={{ overflowY: 'auto' }}>
      <div className="auth-card" style={{ maxWidth: '900px', width: '100%', margin: '40px auto' }}>

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
            {isUserAdmin && (
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

        {/* PROFILE HEADER SUMMARY */}
        <div className={styles.avatarContainer}>
          <div className={styles.avatarWrapper} onClick={showEditForm ? handleAvatarEdit : () => setLightboxImage(avatar)}>
            {avatar ? (
              <img src={avatar} alt="User Avatar" className={styles.avatarImage} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <UserIcon size={48} style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
            {showEditForm && (
              <div className={styles.avatarEditIcon}>
                <Pencil size={16} />
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>{name}</h1>
          {user?.username && (
            <p style={{ color: 'var(--accent-color)', fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>@{user.username}</p>
          )}
          <span style={{ 
            fontSize: '11px', 
            color: 'var(--text-secondary)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '4px 10px', 
            borderRadius: '12px',
            marginTop: '8px',
            display: 'inline-block'
          }}>
            {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Member'}
          </span>

          {/* Toggle Form / Details Edit View Button for Admins */}
          {isUserAdmin && (
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => {
                  setShowEditForm(!showEditForm);
                  setError(null);
                  setSuccess(null);
                }}
                className="lobby-btn-chat"
                style={{ fontSize: '13px', padding: '8px 18px', width: 'auto' }}
              >
                {showEditForm ? 'Back to Feed' : 'Edit Details'}
              </button>
            </div>
          )}
        </div>

        {/* CONDITIONAL RENDERING: SETTINGS EDIT FORM VS ADMIN PROFILE TIMELINE */}
        {showEditForm ? (
          <>
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

                {isUserAdmin && (
                  <div className="form-group">
                    <label>Username (Custom Invite Slug) *</label>
                    <div className="input-wrapper">
                      <UserIcon size={16} className="input-icon" />
                      <input
                        type="text"
                        placeholder="e.g. alex-support"
                        className="form-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={updatingProfile}
                        required
                      />
                    </div>
                  </div>
                )}

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
          </>
        ) : (
          /* ADMIN PROFILE FEED / ANNOUNCEMENTS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

            {/* Post Creator inside Profile Page */}
            <form onSubmit={handleCreatePost} className="post-creator-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Publish New Announcement</h3>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What credentials or updates do you want to announce?"
                className="post-textarea"
                style={{ minHeight: '80px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)' }}
                required
              />

              {imagePreview && (
                <div className="post-creator-preview" style={{ marginTop: '12px', position: 'relative' }}>
                  <img src={imagePreview} alt="Upload Preview" style={{ borderRadius: '8px', maxHeight: '180px', objectFit: 'cover' }} />
                  <button 
                    type="button" 
                    onClick={handleRemoveCreateImage}
                    className="post-creator-preview-remove"
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%' }}
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="post-creator-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <label className="post-attach-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <ImageIcon size={16} />
                  <span>Attach Image</span>
                  <input
                    type="file"
                    ref={createFileInputRef}
                    accept="image/*"
                    onChange={handleCreateFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                <button 
                  type="submit" 
                  disabled={submitting || (!content.trim() && !file)}
                  className="post-create-btn"
                  style={{ height: '36px', padding: '0 20px', borderRadius: '8px', fontSize: '13px' }}
                >
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>

            {/* Announcement Feed Title */}
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', margin: '8px 0 0 0' }}>Announcements Feed</h3>

            {/* Timeline posts list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loadingPosts ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                  <Loader2 className="animate-spin" style={{ color: 'var(--accent-color)' }} size={32} />
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading feed...</p>
                </div>
              ) : myPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>You haven&apos;t published any announcements yet.</p>
                </div>
              ) : (
                myPosts.map((post) => {
                  const hasLiked = user && post.likes.includes(user._id);
                  const isEditing = editingPostId === post._id;

                  return (
                    <div key={post._id} className="post-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                      {isEditing ? (
                        <form onSubmit={handleEditPost} className="post-creator-card" style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            placeholder="Update announcement..."
                            className="post-textarea"
                            style={{ minHeight: '80px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)' }}
                            required
                          />

                          {editImagePreview && (
                            <div className="post-creator-preview" style={{ marginTop: '12px', position: 'relative' }}>
                              <img src={editImagePreview} alt="Edit Attachment" style={{ borderRadius: '8px', maxHeight: '180px', objectFit: 'cover' }} />
                              <button 
                                type="button" 
                                onClick={handleRemoveEditImage}
                                className="post-creator-preview-remove"
                                style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer', width: '24px', height: '24px', borderRadius: '50%' }}
                              >
                                ×
                              </button>
                            </div>
                          )}

                          <div className="post-creator-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <label className="post-attach-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                <ImageIcon size={16} />
                                <span>Change Photo</span>
                                <input
                                  type="file"
                                  ref={editFileInputRef}
                                  accept="image/*"
                                  onChange={handleEditFileChange}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                type="button" 
                                onClick={() => setEditingPostId(null)}
                                className="lobby-btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px', width: 'auto', margin: 0, height: '32px' }}
                              >
                                Cancel
                              </button>
                              <button 
                                type="submit" 
                                disabled={editSubmitting || (!editContent.trim() && !editImagePreview)}
                                className="post-create-btn"
                                style={{ padding: '6px 16px', fontSize: '12px', height: '32px' }}
                              >
                                {editSubmitting ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div className="post-author-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {avatar ? (
                                <img 
                                  src={avatar} 
                                  alt={name} 
                                  className="post-avatar"
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="post-avatar" style={{ 
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  background: 'linear-gradient(135deg, var(--accent-color), #007c62)', 
                                  color: 'white', 
                                  fontWeight: 600, 
                                  fontSize: '13px' 
                                }}>
                                  {getInitials(name)}
                                </div>
                              )}
                              <div className="post-author-details" style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="post-author-name" style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{name}</span>
                                <span className="post-time" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{formatPostTime(post.createdAt)}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button 
                                onClick={() => startEditPost(post)}
                                className="post-edit-btn"
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                title="Edit Announcement"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeletePost(post._id)}
                                className="post-delete-btn"
                                style={{ background: 'none', border: 'none', color: 'rgba(234, 0, 56, 0.7)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                title="Delete Announcement"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {post.content && (
                            <div className="post-content" style={{ color: '#e2e8f0', fontSize: '14.5px', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{post.content}</div>
                          )}

                          {post.image && (
                            <div className="post-image-container" style={{ overflow: 'hidden', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer' }} onClick={() => setLightboxImage(post.image)}>
                              <img 
                                src={post.image} 
                                alt="Announcement Media" 
                                className="post-image" 
                                style={{ width: '100%', maxHeight: '320px', objectFit: 'cover' }}
                                title="Click to view full screen"
                              />
                            </div>
                          )}

                          <div className="post-actions" style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button 
                              onClick={() => handleLikePost(post._id)}
                              className={`post-action-btn like-btn ${hasLiked ? 'liked' : ''}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: hasLiked ? '#ff4b6b' : 'var(--text-secondary)', fontSize: '13px' }}
                            >
                              <Heart size={16} fill={hasLiked ? 'currentColor' : 'none'} />
                              <span>{post.likes.length} {post.likes.length === 1 ? 'Like' : 'Likes'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          className="lightbox-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-out'
          }} 
          onClick={() => setLightboxImage(null)}
        >
          <button 
            onClick={() => setLightboxImage(null)} 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: 'white',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Fullscreen preview" 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              objectFit: 'contain',
              borderRadius: '4px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }} 
          />
        </div>
      )}
    </div>
  );
}
