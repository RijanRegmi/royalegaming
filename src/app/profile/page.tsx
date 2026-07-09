'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import styles from './profile.module.css';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Loader2, Shield, LogOut, Pencil, Trash2, Heart, Image as ImageIcon, X, Sun, Moon, Plus, CreditCard } from 'lucide-react';
import AdSenseBanner from '@/components/AdSenseBanner';
import SponsoredPostCard from '@/components/SponsoredPostCard';
import DoubleTapLikeImage from '@/components/DoubleTapLikeImage';
import PostCard from '@/components/PostCard';
import VerifiedBadge from '@/components/VerifiedBadge';

interface User {
  id?: string;
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  username?: string;
  createdAt?: string;
  isFrozen?: boolean;
  isVerified?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();

  // Theme state
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Initialize theme mode from DOM class on mount
  useEffect(() => {
    const isLight = document.documentElement.classList.contains('light');
    setThemeMode(isLight ? 'light' : 'dark');
  }, []);

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

  // Ad loading status state
  const [leftAdStatus, setLeftAdStatus] = useState<'filled' | 'unfilled' | 'loading'>('loading');
  const [rightAdStatus, setRightAdStatus] = useState<'filled' | 'unfilled' | 'loading'>('loading');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Confirm', cancelText = 'Cancel') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText,
    });
  };

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, isOpen: false })),
      confirmText: 'OK',
      cancelText: '',
    });
  };

  // Post creator states
  const [content, setContent] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);

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
            loadMyPosts(data.user.id || data.user._id);
          }
        } else {
          router.push(res.status === 401 ? '/login?redirect=/profile&expired=true' : '/login?redirect=/profile');
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
        setIsCreatePostOpen(false);
      } else {
        showAlert('Error', data.error || 'Failed to publish announcement');
      }
    } catch (err) {
      console.error('Publish error:', err);
      showAlert('Error', 'Error publishing announcement');
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
        showAlert('Error', data.error || 'Failed to update post');
      }
    } catch (err) {
      console.error('Update post error:', err);
      showAlert('Error', 'Error updating post');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    showConfirm(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      async () => {
        try {
          const res = await fetch(`/api/posts?postId=${postId}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setMyPosts(prev => prev.filter(p => p._id !== postId));
          } else {
            showAlert('Error', data.error || 'Failed to delete post');
          }
        } catch (err) {
          console.error('Delete post error:', err);
          showAlert('Error', 'Error deleting post');
        }
      },
      'Delete',
      'Cancel'
    );
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
      <div className="lobby-content-layout" style={{ maxWidth: '1400px', margin: '40px auto', width: '100%' }}>


        <div className="auth-card" style={{ maxWidth: '900px', width: '100%', margin: '0' }}>

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

        {user?.isFrozen && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(245, 158, 11, 0.08) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 30px rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0
            }}>
              <Shield size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#f87171' }}>
                Account Frozen
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#fca5a5', lineHeight: '1.5' }}>
                Your account is frozen. Please contact support chat or check your payment due.
              </p>
              <button 
                onClick={() => router.push('/chat')}
                className="lobby-btn-chat"
                style={{
                  marginTop: '10px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: 'auto'
                }}
              >
                Go to Support Chat
              </button>
            </div>
          </div>
        )}

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
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {name}
            {user?.isVerified && <VerifiedBadge size={20} style={{ marginLeft: '0px', marginRight: '0px' }} />}
          </h1>
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

          {/* ── Become Admin / Upgrade / Extend subscription banners ── */}
          {user && user.role === 'user' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginTop: '20px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              width: '100%',
              maxWidth: '550px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ color: '#c084fc', display: 'flex', alignItems: 'center' }}><Shield size={20} /></div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#fff' }}>Become an Administrator</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>Configure custom checkout gateways, verify transactions, and manage players.</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/profile/become-admin')}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '12px', width: 'auto', margin: 0, cursor: 'pointer' }}
              >
                Upgrade
              </button>
            </div>
          )}

          {user && user.role === 'admin' && (() => {
            const billingStart = (user as any).billingStartDate ? new Date((user as any).billingStartDate) : new Date(user.createdAt || new Date());
            const deadline = new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            let effectiveDeadline = deadline;
            if ((user as any).extendedUntil && new Date((user as any).extendedUntil) > deadline) {
              effectiveDeadline = new Date((user as any).extendedUntil);
            }
            const now = new Date();
            const msRemaining = effectiveDeadline.getTime() - now.getTime();
            const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
            const isCycleEnded = now > effectiveDeadline;

            return (
              <div style={{
                background: isCycleEnded 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)',
                border: isCycleEnded 
                  ? '1px solid rgba(239, 68, 68, 0.2)'
                  : '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '16px',
                padding: '16px 20px',
                marginTop: '20px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                width: '100%',
                maxWidth: '550px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ color: isCycleEnded ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center' }}><CreditCard size={20} /></div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                      {isCycleEnded ? 'Billing Cycle Ended' : 'Administrative Billing Cycle'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {isCycleEnded 
                        ? 'Your billing cycle expired. Extend now to resume your console access.'
                        : `Plan expires in ${daysRemaining} day(s) (${effectiveDeadline.toLocaleDateString()}).`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/profile/become-admin')}
                  className="btn-primary"
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '12px', 
                    width: 'auto', 
                    margin: 0,
                    cursor: 'pointer',
                    background: isCycleEnded ? '#ef4444' : 'var(--accent-color)',
                    borderColor: 'transparent'
                  }}
                >
                  {isCycleEnded ? 'Renew Plan' : 'Extend'}
                </button>
              </div>
            );
          })()}

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

            {/* THEME SETTINGS SECTION */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Theme Settings
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>Theme Mode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Choose your preferred interface style</div>
                </div>
                
                {/* 2-Option Segmented Control */}
                <div className={styles.themeSwitcher}>
                  <button
                    type="button"
                    onClick={() => {
                      document.documentElement.classList.add('light');
                      localStorage.setItem('theme', 'light');
                      setThemeMode('light');
                      window.dispatchEvent(new Event('theme-changed'));
                    }}
                    className={`${styles.themeBtn} ${themeMode === 'light' ? styles.themeBtnActive : ''}`}
                  >
                    <Sun size={15} />
                    Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      document.documentElement.classList.remove('light');
                      localStorage.setItem('theme', 'dark');
                      setThemeMode('dark');
                      window.dispatchEvent(new Event('theme-changed'));
                    }}
                    className={`${styles.themeBtn} ${themeMode === 'dark' ? styles.themeBtnActive : ''}`}
                  >
                    <Moon size={15} />
                    Dark Mode
                  </button>
                </div>
              </div>
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
            {user?.isFrozen ? (
              <div className="post-creator-card" style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    Administrative Actions Suspended
                  </h3>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                    Your administrator account is frozen. Announcement creation is temporarily locked.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <button 
                  type="button" 
                  onClick={() => setIsCreatePostOpen(true)} 
                  className="write-announcement-trigger-btn"
                >
                  <Plus size={18} />
                  <span>Write New Announcement</span>
                </button>

                {isCreatePostOpen && (
                  <div className="announcement-modal-backdrop" onClick={() => setIsCreatePostOpen(false)}>
                    <form 
                      onSubmit={handleCreatePost} 
                      className="announcement-modal-card" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="announcement-modal-header">
                        <h3 className="announcement-modal-title">Publish Announcement</h3>
                        <button 
                          type="button" 
                          onClick={() => setIsCreatePostOpen(false)} 
                          className="announcement-modal-close-btn"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="announcement-user-row">
                        <div className="announcement-user-avatar">
                          {user?.name ? user.name[0].toUpperCase() : 'A'}
                        </div>
                        <div className="announcement-user-info">
                          <h4>{user?.name}</h4>
                          <span>{user?.role.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What updates do you want to announce today?"
                        className="announcement-textarea"
                        required
                      />

                      {imagePreview && (
                        <div className="announcement-image-preview">
                          <img src={imagePreview} alt="Upload Preview" />
                          <button 
                            type="button" 
                            onClick={handleRemoveCreateImage}
                            className="announcement-image-preview-remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      <div className="announcement-modal-actions">
                        <label className="announcement-attach-btn">
                          <ImageIcon size={18} />
                          <span>{file ? 'Image Attached' : 'Attach Photo'}</span>
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
                          className="announcement-publish-btn"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Publishing...</span>
                            </>
                          ) : (
                            <span>Publish</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}

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
                myPosts.map((post, index) => {
                  const hasLiked = user && post.likes.includes(user.id || user._id);
                  const isEditing = editingPostId === post._id;

                  return (
                    <Fragment key={post._id}>
                      {isEditing ? (
                        <div className="post-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
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
                        </div>
                      ) : (
                        <PostCard
                          post={post}
                          user={user}
                          onLike={handleLikePost}
                          onEdit={startEditPost}
                          onDelete={handleDeletePost}
                          fallbackName={name}
                          fallbackAvatar={avatar}
                          fallbackUsername={user?.username}
                        />
                      )}

                      {/* Inline sponsored ad block */}
                      {(index + 1) % 3 === 0 && (
                        <SponsoredPostCard style={{ marginTop: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }} />
                      )}
                    </Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>  </div>

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

      {confirmModal.isOpen && (
        <div className="custom-modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${confirmModal.cancelText ? 'warning' : ''}`}>
              <span className="modal-title">{confirmModal.title}</span>
              <button type="button" className="modal-close-btn" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="modal-actions">
              {confirmModal.cancelText && (
                <button type="button" className="btn-secondary" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                  {confirmModal.cancelText}
                </button>
              )}
              <button type="button" className="btn-danger" onClick={confirmModal.onConfirm}>
                {confirmModal.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
