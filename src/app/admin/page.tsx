'use strict';
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  UserCheck, 
  ArrowLeft, 
  RefreshCw, 
  UserPlus, 
  X, 
  Mail, 
  Phone, 
  Lock, 
  Unlock,
  Gamepad2, 
  Plus, 
  Edit2, 
  Trash2, 
  Globe, 
  Image as ImageIcon,
  Copy,
  Check,
  Key,
  CreditCard,
  Search
} from 'lucide-react';

interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  username?: string;
  phone?: string;
  linkedAdmins?: string[] | User[];
  avatar?: string;
  isFrozen?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Game {
  id: string;
  _id: string;
  name: string;
  link: string;
  agentLink?: string;
  image?: string;
  isActive?: boolean;
}

interface Credential {
  id: string;
  _id: string;
  gameName: string;
  gameId: string;
  password?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Payment {
  id: string;
  _id: string;
  name: string;
  qrImage: string;
  isActive: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'users' | 'credentials' | 'payments' | 'notices' | 'games'>('users');
  
  // Common states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Users management states ---
  const [profiles, setProfiles] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [newAdminCyclePeriod, setNewAdminCyclePeriod] = useState<string>('30');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // --- Promote to admin modal states ---
  const [showPromoteModal, setShowPromoteModal] = useState<boolean>(false);
  const [promoteUserId, setPromoteUserId] = useState<string>('');
  const [promoteUserName, setPromoteUserName] = useState<string>('');
  const [promoteUsernameSlug, setPromoteUsernameSlug] = useState<string>('');
  const [promoteCyclePeriod, setPromoteCyclePeriod] = useState<string>('30');
  const [promotingRole, setPromotingRole] = useState<boolean>(false);

  // --- Edit/Delete user states ---
  const [showEditUserModal, setShowEditUserModal] = useState<boolean>(false);
  const [editingUserProfile, setEditingUserProfile] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState('user');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editUserLinkedAdmins, setEditUserLinkedAdmins] = useState<string[]>([]);

  // --- Games management states ---
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [showGameModal, setShowGameModal] = useState<boolean>(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null); // null for create, game object for edit
  const [gameName, setGameName] = useState('');
  const [gameLink, setGameLink] = useState('');
  const [gameAgentLink, setGameAgentLink] = useState('');
  const [gameImageUrl, setGameImageUrl] = useState('');
  const [gameImageFile, setGameImageFile] = useState<File | null>(null);
  const [gameImagePreview, setGameImagePreview] = useState('');
  const [savingGame, setSavingGame] = useState(false);

  // --- Secure Credentials management states ---
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState<boolean>(true);
  const [showCredentialModal, setShowCredentialModal] = useState<boolean>(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null); // null for create, credential object for edit
  const [credGameName, setCredGameName] = useState('');
  const [credGameId, setCredGameId] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [savingCredential, setSavingCredential] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'gameId' | 'password' | null>(null);

  // --- Payments management states ---
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null); // null for create, payment object for edit
  const [paymentName, setPaymentName] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [paymentQrFile, setPaymentQrFile] = useState<File | null>(null);
  const [paymentQrPreview, setPaymentQrPreview] = useState('');
  const [paymentIsActive, setPaymentIsActive] = useState<boolean>(true);
  const [savingPayment, setSavingPayment] = useState(false);

  // --- Notices & Extension states ---
  const [notices, setNotices] = useState<any[]>([]);
  const [loadingNotices, setLoadingNotices] = useState<boolean>(true);
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeContent, setNewNoticeContent] = useState('');
  const [newNoticeType, setNewNoticeType] = useState('global');
  const [newNoticeTargetRole, setNewNoticeTargetRole] = useState('admin');
  const [newNoticeTargetUserId, setNewNoticeTargetUserId] = useState('');
  const [savingNotice, setSavingNotice] = useState(false);

  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [extendUserId, setExtendUserId] = useState<string>('');
  const [extendUserName, setExtendUserName] = useState<string>('');
  const [extendDays, setExtendDays] = useState<string>('30');
  const [customDate, setCustomDate] = useState<string>('');
  const [extending, setExtending] = useState<boolean>(false);

  const fetchNotices = useCallback(async () => {
    setLoadingNotices(true);
    try {
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (res.ok && data.success) {
        setNotices(data.notices || []);
      }
    } catch (err) {
      console.error('Error fetching notices:', err);
    } finally {
      setLoadingNotices(false);
    }
  }, []);

  const handleExtendSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendUserId) return;

    setExtending(true);
    try {
      const res = await fetch('/api/admin/users/extend-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: extendUserId,
          extendDays: customDate ? undefined : extendDays,
          customDate: customDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extend subscription');
      }

      setFeedback({ type: 'success', message: `Successfully extended subscription for ${extendUserName}!` });
      setShowExtendModal(false);
      setCustomDate('');
      
      // Update profiles locally
      setProfiles((prev) =>
        prev.map((p) => {
          const pId = p._id || p.id;
          if (pId === extendUserId) {
            return {
              ...p,
              isFrozen: false,
              billingStartDate: data.user.billingStartDate,
              extendedUntil: data.user.extendedUntil,
            };
          }
          return p;
        })
      );
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setExtending(false);
    }
  };

  // --- Custom Confirm Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmModal({
      show: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      isDanger: options.isDanger,
      onConfirm: options.onConfirm,
    });
  };

  // Fetch admin dashboard details (users profiles)
  const fetchDashboardData = useCallback(async () => {
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
      
      if (authData.user.role !== 'super_admin' && authData.user.role !== 'admin') {
        router.push('/chat'); // Redirect normal players away
        return;
      }
      
      setCurrentUser(authData.user);

      // 2. Fetch all profiles (only if super_admin)
      if (authData.user.role === 'super_admin') {
        const profilesRes = await fetch('/api/admin/all-profiles');
        const profilesData = await profilesRes.json();
        
        if (profilesRes.ok && profilesData.success) {
          const sanitized = profilesData.profiles.map((p: User) => ({
            ...p,
            _id: p._id || p.id,
            id: p.id || p._id,
          }));
          setProfiles(sanitized);
        } else {
          throw new Error('Failed to fetch system profiles');
        }
      } else {
        // Automatically default standard admins to credentials tab
        setActiveTab('credentials');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Fetch games
  const fetchGames = useCallback(async () => {
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
  }, []);

  // Fetch secure credentials
  const fetchCredentials = useCallback(async () => {
    setLoadingCredentials(true);
    try {
      const res = await fetch('/api/admin/credentials');
      const data = await res.json();
      if (res.ok && data.success) {
        setCredentials(data.credentials);
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
    } finally {
      setLoadingCredentials(false);
    }
  }, []);

  const handleCopyToClipboard = async (text: string, id: string, field: 'gameId' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedId(null);
        setCopiedField(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const openCreateCredentialModal = () => {
    setEditingCredential(null);
    setCredGameName('');
    setCredGameId('');
    setCredPassword('');
    setShowCredentialModal(true);
    setFeedback(null);
  };

  const openEditCredentialModal = (cred: Credential) => {
    setEditingCredential(cred);
    setCredGameName(cred.gameName);
    setCredGameId(cred.gameId);
    setCredPassword(cred.password || '');
    setShowCredentialModal(true);
    setFeedback(null);
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only administrators can add or edit secure credentials' });
      return;
    }
    if (!credGameName || !credGameId || !credPassword) {
      setFeedback({ type: 'error', message: 'Game Name, Game ID, and Password are required' });
      return;
    }

    setSavingCredential(true);
    setFeedback(null);

    try {
      let res;
      const body = {
        gameName: credGameName,
        gameId: credGameId,
        password: credPassword,
      };

      if (editingCredential) {
        res = await fetch('/api/admin/credentials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: editingCredential._id }),
        });
      } else {
        res = await fetch('/api/admin/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save credential');
      }

      await fetchCredentials();

      setCredGameName('');
      setCredGameId('');
      setCredPassword('');
      setEditingCredential(null);
      setShowCredentialModal(false);

      setFeedback({
        type: 'success',
        message: `Successfully ${editingCredential ? 'updated' : 'created'} secure credential for ${credGameName}!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSavingCredential(false);
    }
  };

  const handleDeleteCredential = async (credId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only administrators can delete secure credentials' });
      return;
    }

    showConfirm({
      title: 'Delete Credential',
      message: 'Are you sure you want to delete this secure game credential? This action cannot be undone!',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        setFeedback(null);
        try {
          const res = await fetch(`/api/admin/credentials?id=${credId}`, {
            method: 'DELETE',
          });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to delete credential');
          }

          setCredentials((prev) => prev.filter((c) => c._id !== credId));
          setFeedback({ type: 'success', message: 'Successfully deleted secure game credential!' });
        } catch (err) {
          setFeedback({ type: 'error', message: (err as Error).message });
        }
      }
    });
  };

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (res.ok && data.success) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  const openCreatePaymentModal = () => {
    setEditingPayment(null);
    setPaymentName('');
    setPaymentQrUrl('');
    setPaymentQrPreview('');
    setPaymentQrFile(null);
    setPaymentIsActive(true);
    setShowPaymentModal(true);
    setFeedback(null);
  };

  const openEditPaymentModal = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentName(payment.name);
    setPaymentQrUrl(payment.qrImage);
    setPaymentQrPreview(payment.qrImage);
    setPaymentQrFile(null);
    setPaymentIsActive(payment.isActive);
    setShowPaymentModal(true);
    setFeedback(null);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only administrators can delete payment channels' });
      return;
    }

    showConfirm({
      title: 'Delete Payment Channel',
      message: 'Are you sure you want to delete this payment channel?',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        setFeedback(null);
        try {
          const res = await fetch(`/api/admin/payments?id=${paymentId}`, {
            method: 'DELETE',
          });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to delete payment channel');
          }

          setPayments((prev) => prev.filter((p) => p._id !== paymentId));
          setFeedback({ type: 'success', message: 'Successfully deleted payment channel!' });
        } catch (err) {
          setFeedback({ type: 'error', message: (err as Error).message });
        }
      }
    });
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only administrators can save payment channels' });
      return;
    }
    if (!paymentName) {
      setFeedback({ type: 'error', message: 'Gateway name is required' });
      return;
    }

    setSavingPayment(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('name', paymentName);
      formData.append('isActive', paymentIsActive ? 'true' : 'false');

      if (paymentQrFile) {
        formData.append('file', paymentQrFile);
      } else if (paymentQrUrl) {
        formData.append('qrImageUrl', paymentQrUrl);
      } else if (!editingPayment) {
        throw new Error('Please select a QR code image file or enter an image URL');
      }

      let res;
      if (editingPayment) {
        formData.append('id', editingPayment._id);
        res = await fetch('/api/admin/payments', {
          method: 'PUT',
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/payments', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save payment channel');
      }

      await fetchPayments();

      setPaymentName('');
      setPaymentQrFile(null);
      setPaymentQrUrl('');
      setPaymentQrPreview('');
      setEditingPayment(null);
      setShowPaymentModal(false);

      setFeedback({
        type: 'success',
        message: `Successfully ${editingPayment ? 'updated' : 'created'} payment channel: ${paymentName}!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSavingPayment(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchDashboardData();
      fetchGames();
      fetchCredentials();
      fetchPayments();
      fetchNotices();
    });

    // Allow document scrolling for admin dashboard page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [fetchDashboardData, fetchGames, fetchCredentials, fetchPayments, fetchNotices]);

  // Handle user roles changes (users tab)
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can change user roles' });
      return;
    }

    if (newRole === 'admin') {
      const userToPromote = profiles.find((p) => (p._id || p.id) === userId);
      setPromoteUserId(userId);
      setPromoteUserName(userToPromote?.name || 'User');
      setPromoteUsernameSlug(userToPromote?.username || '');
      setPromoteCyclePeriod('30');
      setShowPromoteModal(true);
      setFeedback(null);
      return;
    }

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
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setUpdatingId(null);
    }
  };

  // Submit handler for Promote to Admin
  const handleConfirmPromoteToAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteUserId || !promoteUsernameSlug || !promoteCyclePeriod) return;

    setPromotingRole(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: promoteUserId, 
          newRole: 'admin',
          username: promoteUsernameSlug,
          cyclePeriod: promoteCyclePeriod
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to promote user to Admin');
      }

      setProfiles((prev) =>
        prev.map((p) => ((p._id || p.id) === promoteUserId ? { 
          ...p, 
          role: 'admin', 
          username: promoteUsernameSlug,
          isFrozen: false
        } : p))
      );

      setShowPromoteModal(false);
      setFeedback({ type: 'success', message: `Successfully promoted ${promoteUserName} to Admin!` });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setPromotingRole(false);
    }
  };

  // Handle toggling account freeze state (users tab)
  const handleFreezeToggle = async (userId: string, isFrozen: boolean) => {
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can freeze or unfreeze accounts' });
      return;
    }
    setUpdatingId(userId);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isFrozen }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account freeze status');
      }

      setProfiles((prev) =>
        prev.map((p) => ((p._id || p.id) === userId ? { ...p, isFrozen } : p))
      );

      setFeedback({ 
        type: 'success', 
        message: `Successfully ${isFrozen ? 'frozen' : 'unfrozen'} account` 
      });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle creating administrative accounts (users tab)
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can create administrative accounts' });
      return;
    }
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
          username: newAdminRole === 'admin' ? newAdminUsername : undefined,
          phone: newAdminPhone,
          password: newAdminPassword,
          role: newAdminRole,
          cyclePeriod: newAdminRole === 'admin' ? newAdminCyclePeriod : undefined,
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
      setNewAdminUsername('');
      setNewAdminPhone('');
      setNewAdminPassword('');
      setNewAdminRole('admin');
      setShowCreateModal(false);

      setFeedback({ type: 'success', message: 'Successfully created administrative account' });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setCreatingAdmin(false);
    }
  };

  const openEditUserModal = (profile: User) => {
    setEditingUserProfile(profile);
    setEditUserName(profile.name);
    setEditUserEmail(profile.email);
    setEditUserUsername(profile.username || '');
    setEditUserPhone(profile.phone || '');
    setEditUserRole(profile.role);
    setEditUserPassword('');
    const adminsList = (profile.linkedAdmins || []).map((admin: any) => 
      typeof admin === 'string' ? admin : (admin._id || admin.id)
    ).filter(Boolean) as string[];
    setEditUserLinkedAdmins(adminsList);
    setShowEditUserModal(true);
    setFeedback(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can edit accounts' });
      return;
    }
    if (!editingUserProfile) {
      setFeedback({ type: 'error', message: 'No user selected to edit' });
      return;
    }
    if (!editUserName || !editUserEmail) {
      setFeedback({ type: 'error', message: 'Name and email are required' });
      return;
    }

    setUpdatingUser(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUserProfile._id || editingUserProfile.id,
          name: editUserName,
          email: editUserEmail,
          username: editUserRole === 'admin' ? editUserUsername : undefined,
          phone: editUserPhone,
          role: editUserRole,
          password: editUserPassword || undefined,
          linkedAdmins: editUserRole === 'user' ? editUserLinkedAdmins : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update account');
      }

      setProfiles((prev) =>
        prev.map((p) => {
          const pId = p._id || p.id;
          const updatedId = data.user.id || data.user._id;
          return pId === updatedId ? { ...p, ...data.user, _id: updatedId, id: updatedId } : p;
        })
      );

      setShowEditUserModal(false);
      setFeedback({ type: 'success', message: 'Successfully updated user account' });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can delete accounts' });
      return;
    }
    if (userId === currentUser.id) {
      setFeedback({ type: 'error', message: 'You cannot delete your own account' });
      return;
    }

    showConfirm({
      title: 'Delete User Account',
      message: 'Are you sure you want to delete this user? This will also delete all their messages. This action is irreversible!',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        setFeedback(null);
        try {
          const res = await fetch(`/api/admin/users?id=${userId}`, {
            method: 'DELETE',
          });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || 'Failed to delete account');
          }

          setProfiles((prev) => prev.filter((p) => (p._id || p.id) !== userId));
          setFeedback({ type: 'success', message: 'Successfully deleted user account!' });
        } catch (err) {
          setFeedback({ type: 'error', message: (err as Error).message });
        }
      }
    });
  };

  // --- Games operations ---

  const openCreateModal = () => {
    setEditingGame(null);
    setGameName('');
    setGameLink('');
    setGameAgentLink('');
    setGameImageUrl('');
    setGameImagePreview('');
    setGameImageFile(null);
    setShowGameModal(true);
    setFeedback(null);
  };

  const openEditModal = (game: Game) => {
    setEditingGame(game);
    setGameName(game.name);
    setGameLink(game.link);
    setGameAgentLink(game.agentLink || '');
    setGameImageUrl(game.image || '');
    setGameImagePreview(game.image || '');
    setGameImageFile(null);
    setShowGameModal(true);
    setFeedback(null);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can delete game platforms' });
      return;
    }

    showConfirm({
      title: 'Delete Game Platform',
      message: 'Are you sure you want to delete this game platform?',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
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
        } catch (err) {
          setFeedback({ type: 'error', message: (err as Error).message });
        }
      }
    });
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') {
      setFeedback({ type: 'error', message: 'Forbidden: Only super admins can save platforms' });
      return;
    }
    if (!gameName) {
      setFeedback({ type: 'error', message: 'Name is required' });
      return;
    }

    setSavingGame(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('name', gameName);
      formData.append('link', 'https://placeholder.com');
      formData.append('agentLink', 'https://placeholder.com');

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
      setGameAgentLink('');
      setGameImageFile(null);
      setGameImageUrl('');
      setGameImagePreview('');
      setEditingGame(null);
      setShowGameModal(false);

      setFeedback({
        type: 'success',
        message: `Successfully ${editingGame ? 'updated' : 'created'} game platform: ${gameName}!`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>Control Room</h1>
            <span className="role-badge" style={{
              background: currentUser.role === 'super_admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0, 168, 132, 0.15)',
              color: currentUser.role === 'super_admin' ? 'var(--super-admin-color)' : 'var(--accent-color)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Logged in as <strong style={{ color: 'var(--text-primary)' }}>{currentUser.name}</strong> • Manage showcase platforms, user support routing, and administrator roles
          </p>
        </div>
        <button className="btn-secondary" onClick={() => window.location.href = '/'}>
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
          paddingBottom: '10px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {currentUser.role === 'super_admin' && (
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
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={16} /> User Accounts
          </button>
        )}

        {currentUser.role === 'super_admin' && (
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
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <ImageIcon size={16} /> Manage Landing Page
          </button>
        )}

        {currentUser.role === 'super_admin' && (
          <button
            className={`tab-btn ${activeTab === 'notices' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('notices');
              fetchNotices();
            }}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'notices' ? '3px solid var(--super-admin-color)' : '3px solid transparent',
              color: activeTab === 'notices' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <Shield size={16} /> Notice Board
          </button>
        )}
        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <button
            className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('credentials');
              fetchCredentials();
            }}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'credentials' ? '3px solid var(--super-admin-color)' : '3px solid transparent',
              color: activeTab === 'credentials' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <Key size={16} /> Secure Credentials
          </button>
        )}
        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('payments');
              fetchPayments();
            }}
            style={{
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              borderBottom: activeTab === 'payments' ? '3px solid var(--super-admin-color)' : '3px solid transparent',
              color: activeTab === 'payments' ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <CreditCard size={16} /> Payment Channels
          </button>
        )}
      </div>

      {/* Stats Cards (Dynamic based on Tab) */}
      {activeTab === 'users' && currentUser.role === 'super_admin' ? (
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
      ) : activeTab === 'credentials' ? (
        <div className="admin-stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-wrapper users" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <Key size={22} />
            </div>
            <div>
              <div className="stat-label">Secure Credentials</div>
              <div className="stat-number">{credentials.length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper admins" style={{ background: 'rgba(37, 211, 102, 0.1)', color: 'var(--success-color)' }}>
              <Lock size={22} />
            </div>
            <div>
              <div className="stat-label">Access Level</div>
              <div className="stat-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Admin (Owner)
              </div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper messages" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="stat-label">Security Status</div>
              <div className="stat-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>Encrypted</div>
            </div>
          </div>
        </div>
      ) : activeTab === 'payments' ? (
        <div className="admin-stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-wrapper users" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div className="stat-label">Payment Channels</div>
              <div className="stat-number">{payments.length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper admins" style={{ background: 'rgba(0, 168, 132, 0.1)', color: 'var(--accent-color)' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="stat-label">Active Channels</div>
              <div className="stat-number">{payments.filter(p => p.isActive).length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper messages" style={{ background: 'rgba(234, 0, 56, 0.1)', color: '#ea0038' }}>
              <Lock size={22} />
            </div>
            <div>
              <div className="stat-label">Access Level</div>
              <div className="stat-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>Admin (Owner)</div>
            </div>
          </div>
        </div>
      ) : activeTab === 'notices' ? (
        <div className="admin-stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-wrapper users" style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--super-admin-color)' }}>
              <Users size={22} />
            </div>
            <div>
              <div className="stat-label">Total Notices</div>
              <div className="stat-number">{notices.length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper admins" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="stat-label">Active Alerts</div>
              <div className="stat-number">{notices.filter(n => n.isActive).length}</div>
            </div>
          </div>

          <div className="stat-card glass">
            <div className="stat-icon-wrapper messages" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <Lock size={22} />
            </div>
            <div>
              <div className="stat-label">Warning Notices</div>
              <div className="stat-number">{notices.filter(n => n.type === 'admin_warning' && n.isActive).length}</div>
            </div>
          </div>
        </div>
      ) : activeTab === 'games' ? (
        <div className="admin-stats-grid">
          <div className="stat-card glass">
            <div className="stat-icon-wrapper users" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
              <Gamepad2 size={22} />
            </div>
            <div>
              <div className="stat-label">Total Game Platforms</div>
              <div className="stat-number">{games.length}</div>
            </div>
          </div>
          <div className="stat-card glass">
            <div className="stat-icon-wrapper admins" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Globe size={22} />
            </div>
            <div>
              <div className="stat-label">Access Level</div>
              <div className="stat-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>Super Admin</div>
            </div>
          </div>
          <div className="stat-card glass">
            <div className="stat-icon-wrapper messages" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
              <Shield size={22} />
            </div>
            <div>
              <div className="stat-label">Lobby Configuration</div>
              <div className="stat-number" style={{ fontSize: '16px', fontWeight: 'bold' }}>Live Sync</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Primary Tab Contents */}
      {activeTab === 'users' && currentUser.role === 'super_admin' ? (() => {
        const query = searchQuery.toLowerCase().trim();
        const filteredProfiles = profiles.filter((p) => {
          if (!query) return true;
          return (
            (p.name && p.name.toLowerCase().includes(query)) ||
            (p.email && p.email.toLowerCase().includes(query)) ||
            (p.phone && p.phone.toLowerCase().includes(query)) ||
            (p.username && p.username.toLowerCase().includes(query))
          );
        });
        const adminProfiles = filteredProfiles.filter((p) => p.role === 'admin' || p.role === 'super_admin');
        const userProfiles = filteredProfiles.filter((p) => p.role === 'user');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Search Bar */}
            <div 
              className="glass" 
              style={{ 
                padding: '12px 20px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search administrative staff and standard users by name, email, phone, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* Administrators Table */}
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
                <div>
                  <span style={{ fontWeight: 600, display: 'block' }}>Administrative Staff Accounts</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Manage system administrators, moderators, and support staff
                  </span>
                </div>
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
              
              {adminProfiles.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No administrators found.
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Profile Name / Email</th>
                      <th>Phone Number</th>
                      <th>Billing Status / Cycle</th>
                      <th>System Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminProfiles.map((profile) => {
                      const profileId = profile._id || profile.id;
                      const isSelf = profileId === currentUser.id;
                      return (
                        <tr key={profileId}>
                          <td>
                            <div className="profile-cell">
                              <div className="avatar-wrapper" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                                {profile.avatar ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
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
                                <span className="profile-cell-name">
                                  {profile.name}
                                  {profile.role === 'admin' && profile.username && (
                                    <span style={{ fontSize: '11px', color: 'var(--super-admin-color)', marginLeft: '8px', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      /{profile.username}
                                    </span>
                                  )}
                                  {profile.isFrozen && (
                                    <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      Frozen
                                    </span>
                                  )}
                                </span>
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
                            {profile.role === 'admin' ? (() => {
                              const billingStart = (profile as any).billingStartDate ? new Date((profile as any).billingStartDate) : new Date(profile.createdAt);
                              const deadline = new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                              let effectiveDeadline = deadline;
                              if ((profile as any).extendedUntil && new Date((profile as any).extendedUntil) > deadline) {
                                effectiveDeadline = new Date((profile as any).extendedUntil);
                              }
                              const now = new Date();
                              const isFrozen = profile.isFrozen;
                              const isGrace = !isFrozen && now > effectiveDeadline;
                              
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      textTransform: 'uppercase',
                                      background: isFrozen 
                                        ? 'rgba(239, 68, 68, 0.15)' 
                                        : isGrace 
                                          ? 'rgba(245, 158, 11, 0.15)' 
                                          : 'rgba(16, 185, 129, 0.15)',
                                      color: isFrozen 
                                        ? '#ef4444' 
                                        : isGrace 
                                          ? '#f59e0b' 
                                          : '#10b981',
                                    }}>
                                      {isFrozen ? 'Frozen' : isGrace ? 'Grace Period' : 'Active'}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Expires: {effectiveDeadline.toLocaleDateString()}
                                  </span>
                                </div>
                              );
                            })() : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A (Super Admin)</span>
                            )}
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
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button 
                                className="icon-btn" 
                                title="Edit User Profile" 
                                onClick={() => openEditUserModal(profile)}
                                style={{ color: 'var(--accent-color)' }}
                              >
                                <Edit2 size={16} />
                              </button>
                              {profile.role === 'admin' && (
                                <button 
                                  className="icon-btn" 
                                  title="Extend Billing Cycle / Time"
                                  onClick={() => {
                                    setExtendUserId(profileId);
                                    setExtendUserName(profile.name);
                                    setExtendDays('30');
                                    setCustomDate('');
                                    setShowExtendModal(true);
                                  }}
                                  style={{ color: '#10b981' }}
                                >
                                  <RefreshCw size={16} />
                                </button>
                              )}
                              {!isSelf && profile.role !== 'super_admin' && (
                                <button 
                                  className="icon-btn" 
                                  title={profile.isFrozen ? "Unlock Account" : "Lock Account"}
                                  onClick={() => {
                                    const billingStart = (profile as any).billingStartDate ? new Date((profile as any).billingStartDate) : new Date(profile.createdAt);
                                    const deadline = new Date(billingStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                                    let effectiveDeadline = deadline;
                                    if ((profile as any).extendedUntil && new Date((profile as any).extendedUntil) > deadline) {
                                      effectiveDeadline = new Date((profile as any).extendedUntil);
                                    }
                                    const now = new Date();
                                    const isCycleEnded = now > effectiveDeadline;

                                    if (profile.isFrozen && isCycleEnded && profile.role === 'admin') {
                                      showConfirm({
                                        title: 'Extend Cycle Required',
                                        message: `The billing cycle for ${profile.name} has ended. You must extend their subscription cycle to unfreeze this account. Would you like to extend it now?`,
                                        confirmText: 'Extend Cycle',
                                        isDanger: false,
                                        onConfirm: () => {
                                          setExtendUserId(profileId);
                                          setExtendUserName(profile.name);
                                          setExtendDays('30');
                                          setCustomDate('');
                                          setShowExtendModal(true);
                                        }
                                      });
                                      return;
                                    }

                                    const action = profile.isFrozen ? 'unlock' : 'lock';
                                    showConfirm({
                                      title: `${profile.isFrozen ? 'Unlock' : 'Lock'} Account`,
                                      message: `Do you want to ${action} this account?`,
                                      confirmText: profile.isFrozen ? 'Unlock' : 'Lock',
                                      isDanger: !profile.isFrozen,
                                      onConfirm: () => handleFreezeToggle(profileId, !profile.isFrozen)
                                    });
                                  }}
                                  style={{ color: profile.isFrozen ? '#f59e0b' : '#10b981' }}
                                  disabled={updatingId === profileId}
                                >
                                  {profile.isFrozen ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                              )}
                              {!isSelf && (
                                <button 
                                  className="icon-btn" 
                                  title="Delete User" 
                                  onClick={() => handleDeleteUser(profileId)}
                                  style={{ color: 'var(--error-color)' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Standard Users Table */}
            <div className="admin-table-container glass">
              <div
                style={{
                  padding: '20px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <span style={{ fontWeight: 600, display: 'block' }}>Standard User Accounts (Players)</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Manage game lobby players, customer records, and active account locks
                </span>
              </div>
              
              {userProfiles.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No standard user players found.
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Profile Name / Email</th>
                      <th>Phone Number</th>
                      <th>Date Registered</th>
                      <th>System Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProfiles.map((profile) => {
                      const profileId = profile._id || profile.id;
                      const isSelf = profileId === currentUser.id;
                      return (
                        <tr key={profileId}>
                          <td>
                            <div className="profile-cell">
                              <div className="avatar-wrapper" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                                {profile.avatar ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
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
                                <span className="profile-cell-name">
                                  {profile.name}
                                  {profile.isFrozen && (
                                    <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '8px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      Frozen
                                    </span>
                                  )}
                                </span>
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
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button 
                                className="icon-btn" 
                                title="Edit User Profile" 
                                onClick={() => openEditUserModal(profile)}
                                style={{ color: 'var(--accent-color)' }}
                              >
                                <Edit2 size={16} />
                              </button>
                              {profile.role !== 'super_admin' && (
                                <button 
                                  className="icon-btn" 
                                  title={profile.isFrozen ? "Unlock Account" : "Lock Account"}
                                  onClick={() => {
                                    const action = profile.isFrozen ? 'unlock' : 'lock';
                                    showConfirm({
                                      title: `${profile.isFrozen ? 'Unlock' : 'Lock'} Account`,
                                      message: `Do you want to ${action} this account?`,
                                      confirmText: profile.isFrozen ? 'Unlock' : 'Lock',
                                      isDanger: !profile.isFrozen,
                                      onConfirm: () => handleFreezeToggle(profileId, !profile.isFrozen)
                                    });
                                  }}
                                  style={{ color: profile.isFrozen ? '#f59e0b' : '#10b981' }}
                                  disabled={updatingId === profileId}
                                >
                                  {profile.isFrozen ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                              )}
                              <button 
                                className="icon-btn" 
                                title="Delete User" 
                                onClick={() => handleDeleteUser(profileId)}
                                style={{ color: 'var(--error-color)' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })() : activeTab === 'notices' && currentUser.role === 'super_admin' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header section with Create button */}
          <div className="glass" style={{ padding: '20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 600 }}>Global Notice & Broadcast Board</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Publish notices, warnings, and announcements for administrators or standard users with immediate mobile push notifications.
              </p>
            </div>
            <button 
              className="btn-primary" 
              onClick={() => {
                setNewNoticeTitle('');
                setNewNoticeContent('');
                setNewNoticeType('global');
                setNewNoticeTargetRole('admin');
                setNewNoticeTargetUserId('');
                setShowNoticeModal(true);
                setFeedback(null);
              }}
              style={{ padding: '8px 16px', fontSize: '13px', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}
            >
              <Plus size={16} /> Publish Notice
            </button>
          </div>

          {/* Notices Grid/List */}
          {loadingNotices ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: 'var(--super-admin-color)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading notices...</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <Shield size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No Notices Published</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Use the publish button to send announcements or system alerts.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {notices.map((notice) => {
                const isWarning = notice.type === 'admin_warning' || notice.type === 'system';
                return (
                  <div 
                    key={notice._id} 
                    className="glass" 
                    style={{ 
                      padding: '20px', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      background: notice.isActive ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.005)',
                      opacity: notice.isActive ? 1 : 0.6
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: isWarning ? '#ef4444' : '#a855f7',
                          padding: '2px 8px',
                          borderRadius: '8px'
                        }}>
                          {notice.type}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Target: <strong style={{ color: 'var(--text-secondary)' }}>{notice.targetRole === 'all' ? 'Everyone' : notice.targetRole}</strong>
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontWeight: 700, fontSize: '15px', color: 'white' }}>{notice.title}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {notice.content}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(notice.createdAt).toLocaleString()}
                      </span>
                      <button 
                        className="icon-btn" 
                        onClick={async () => {
                          showConfirm({
                            title: 'Delete Notice',
                            message: 'Are you sure you want to delete this notice? It will disappear from all user feeds.',
                            confirmText: 'Delete',
                            isDanger: true,
                            onConfirm: async () => {
                              try {
                                const res = await fetch(`/api/notices?id=${notice._id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  setNotices(prev => prev.filter(n => n._id !== notice._id));
                                  setFeedback({ type: 'success', message: 'Notice deleted successfully' });
                                }
                              } catch (err) {
                                console.error('Delete notice error:', err);
                              }
                            }
                          });
                        }}
                        style={{ color: 'var(--error-color)' }}
                        title="Delete Notice"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'credentials' ? (
        /* Game Accounts (Secure) tab view */
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
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Secure Game Credentials</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') 
                  ? 'Manage and assign game accounts' 
                  : 'View and copy credentials for players (Read-only)'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
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
                    boxShadow: 'none',
                    background: '#eab308',
                    borderColor: '#eab308',
                    color: '#0f172a'
                  }}
                  onClick={openCreateCredentialModal}
                >
                  <Plus size={16} /> Add Game ID
                </button>
              )}
              <button className="icon-btn" title="Refresh data" onClick={fetchCredentials}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loadingCredentials ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : credentials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No game credentials found.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Game Name</th>
                  <th>Game ID / Username</th>
                  <th>Password</th>
                  <th>Last Updated</th>
                  {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#eab308',
                          boxShadow: '0 0 8px #eab308'
                        }}></div>
                        <span style={{ fontWeight: 600 }}>{cred.gameName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ 
                          fontFamily: 'monospace', 
                          background: 'rgba(255,255,255,0.06)', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#e2e8f0',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>{cred.gameId}</code>
                        <button
                          className="icon-btn"
                          title="Copy Username"
                          onClick={() => handleCopyToClipboard(cred.gameId, cred._id, 'gameId')}
                          style={{ 
                            padding: '4px', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}
                        >
                          {copiedId === cred._id && copiedField === 'gameId' ? (
                            <>
                              <Check size={14} style={{ color: 'var(--success-color)' }} />
                              <span style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%) translateY(-4px)',
                                background: '#1e293b',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                pointerEvents: 'none',
                                zIndex: 10
                              }}>Copied!</span>
                            </>
                          ) : (
                            <Copy size={14} style={{ color: 'var(--text-secondary)' }} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ 
                          fontFamily: 'monospace', 
                          background: 'rgba(255,255,255,0.06)', 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          fontSize: '13px',
                          color: '#e2e8f0',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>{cred.password}</code>
                        <button
                          className="icon-btn"
                          title="Copy Password"
                          onClick={() => handleCopyToClipboard(cred.password || '', cred._id, 'password')}
                          style={{ 
                            padding: '4px', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}
                        >
                          {copiedId === cred._id && copiedField === 'password' ? (
                            <>
                              <Check size={14} style={{ color: 'var(--success-color)' }} />
                              <span style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%) translateY(-4px)',
                                background: '#1e293b',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                                pointerEvents: 'none',
                                zIndex: 10
                              }}>Copied!</span>
                            </>
                          ) : (
                            <Copy size={14} style={{ color: 'var(--text-secondary)' }} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      {new Date(cred.updatedAt || cred.createdAt).toLocaleDateString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="icon-btn" 
                            title="Edit Credential" 
                            onClick={() => openEditCredentialModal(cred)}
                            style={{ color: 'var(--accent-color)' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn" 
                            title="Delete Credential" 
                            onClick={() => handleDeleteCredential(cred._id)}
                            style={{ color: 'var(--error-color)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'payments' && (currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
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
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Payment Channels Configuration</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Configure payment gateways and QR codes for admin chat sharing
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
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
                  onClick={openCreatePaymentModal}
                >
                  <Plus size={16} /> Add Payment Method
                </button>
              )}
              <button className="icon-btn" title="Refresh data" onClick={fetchPayments}>
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {loadingPayments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No payment channels found. Click &quot;Add Payment Method&quot; to create one.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Gateway Name</th>
                  <th>Status</th>
                  <th>QR Image File / URL</th>
                  {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      <div className="profile-cell">
                        <div style={{ 
                          width: '46px', 
                          height: '46px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '1px solid var(--border-color)', 
                          background: 'white',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px'
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={payment.qrImage} 
                            alt={payment.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400';
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 600, marginLeft: '12px' }}>{payment.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${payment.isActive ? 'super_admin' : 'user'}`} style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'uppercase' }}>
                        {payment.isActive ? 'Active' : 'Inactive'}
                      </span>
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
                        {payment.qrImage}
                      </span>
                    </td>
                    {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            className="icon-btn" 
                            title="Edit Payment Details" 
                            onClick={() => openEditPaymentModal(payment)}
                            style={{ color: 'var(--accent-color)' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="icon-btn" 
                            title="Delete Payment Channel" 
                            onClick={() => handleDeletePayment(payment._id)}
                            style={{ color: 'var(--error-color)' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'games' && currentUser.role === 'super_admin' ? (
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
            <div>
              <span style={{ fontWeight: 600, display: 'block' }}>Showcase Platform Configuration</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Add, edit, or delete showcase platforms and modify their display images
              </span>
            </div>
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
                <Plus size={16} /> Add Platform
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
              No platforms found. Click &quot;Add Platform&quot; to register your first showcase.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Platform Name</th>
                  <th>Image File / URL</th>
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
                          background: 'rgba(0,0,0,0.2)',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '2px'
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          type="button"
                          className="icon-btn" 
                          title="Edit Platform" 
                          onClick={() => openEditModal(game)}
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
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
      ) : null}

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
                      autoComplete="off"
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
                      autoComplete="off"
                    />
                  </div>
                </div>

                {newAdminRole === 'admin' && (
                  <div className="form-group">
                    <label>Admin Slug / Username (e.g. admin1) *</label>
                    <div className="input-wrapper">
                      <Globe size={16} className="input-icon" />
                      <input
                        type="text"
                        placeholder="admin1"
                        className="form-input"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        disabled={creatingAdmin}
                        required
                        pattern="^[a-z0-9_-]+$"
                        title="Only lowercase letters, numbers, hyphens, and underscores are allowed"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

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

                {newAdminRole === 'admin' && (
                  <div className="form-group">
                    <label>Billing Cycle Period *</label>
                    <select
                      className="role-select"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff' }}
                      value={newAdminCyclePeriod}
                      onChange={(e) => setNewAdminCyclePeriod(e.target.value)}
                      disabled={creatingAdmin}
                      required
                    >
                      <option value="30">1 Month (Standard Cycle)</option>
                      <option value="90">3 Month (Quarterly Cycle)</option>
                      <option value="180">6 Month (Half Year Cycle)</option>
                      <option value="360">12 Month (Full Year Cycle)</option>
                    </select>
                  </div>
                )}
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
              <h2>{editingGame ? 'Edit Showcase Platform' : 'Add New Showcase Platform'}</h2>
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <label>Platform Name *</label>
                  <div className="input-wrapper">
                    <ImageIcon size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Support Channel 1, Help Desk"
                      className="form-input"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
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

      {/* Game Credential Add/Edit Modal */}
      {showCredentialModal && (
        <div className="modal-overlay" onClick={() => setShowCredentialModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>{editingCredential ? 'Edit Secure Credential' : 'Add Secure Credential'}</h2>
              <button className="icon-btn" onClick={() => setShowCredentialModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCredential}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label>Game Name *</label>
                  <div className="input-wrapper">
                    <Gamepad2 size={16} className="input-icon" />
                    <input
                      type="text"
                      list="game-platforms-list"
                      placeholder="Select or type platform (e.g. FireKirin)"
                      className="form-input"
                      value={credGameName}
                      onChange={(e) => setCredGameName(e.target.value)}
                      disabled={savingCredential}
                      required
                    />
                    <datalist id="game-platforms-list">
                      {games.map(g => (
                        <option key={g._id} value={g.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="form-group">
                  <label>Game ID / Username *</label>
                  <div className="input-wrapper">
                    <Users size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. PLAYER007"
                      className="form-input"
                      value={credGameId}
                      onChange={(e) => setCredGameId(e.target.value)}
                      disabled={savingCredential}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Play@123"
                      className="form-input"
                      value={credPassword}
                      onChange={(e) => setCredPassword(e.target.value)}
                      disabled={savingCredential}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setShowCredentialModal(false)}
                  disabled={savingCredential}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0, background: '#eab308', borderColor: '#eab308', color: '#0f172a' }}
                  disabled={savingCredential}
                >
                  {savingCredential ? 'Saving...' : editingCredential ? 'Save Changes' : 'Create Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Gateway Add/Edit Modal (Tab: Payments) */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{editingPayment ? 'Edit Payment Channel' : 'Add New Payment Channel'}</h2>
              <button className="icon-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Live QR Preview Box */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'white', 
                  border: '1px dashed var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px',
                  gap: '8px'
                }}>
                  {paymentQrPreview ? (
                    <div style={{ 
                      width: '150px', 
                      height: '150px', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      border: '2px solid var(--super-admin-color)',
                      boxShadow: '0 0 15px rgba(168, 85, 247, 0.2)',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={paymentQrPreview} 
                        alt="QR code preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400';
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ 
                      width: '150px', 
                      height: '150px', 
                      borderRadius: '8px', 
                      border: '2px dashed var(--border-color)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.05)'
                    }}>
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <span style={{ fontSize: '11px', color: '#1e293b', fontWeight: 500 }}>
                    {paymentName || 'Gateway'} QR Preview
                  </span>
                </div>

                <div className="form-group">
                  <label>Gateway Name *</label>
                  <div className="input-wrapper">
                    <CreditCard size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Bkash, Esewa, CashApp, Google Pay"
                      className="form-input"
                      value={paymentName}
                      onChange={(e) => setPaymentName(e.target.value)}
                      disabled={savingPayment}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      id="payment-active-checkbox"
                      checked={paymentIsActive}
                      onChange={(e) => setPaymentIsActive(e.target.checked)}
                      disabled={savingPayment}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="payment-active-checkbox" style={{ margin: 0, cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                      Active (visible to users & admins)
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload QR Image File</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="payment-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setPaymentQrFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setPaymentQrPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      disabled={savingPayment}
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
                      onClick={() => document.getElementById('payment-file-input')?.click()}
                      disabled={savingPayment}
                    >
                      <ImageIcon size={15} /> 
                      {paymentQrFile ? `Selected: ${paymentQrFile.name.substring(0, 20)}...` : 'Choose Image File'}
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
                  <label>Direct QR Image URL</label>
                  <div className="input-wrapper">
                    <ImageIcon size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Paste online image URL (e.g. https://...)"
                      className="form-input"
                      value={paymentQrUrl}
                      onChange={(e) => {
                        setPaymentQrUrl(e.target.value);
                        setPaymentQrPreview(e.target.value);
                      }}
                      disabled={savingPayment}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setShowPaymentModal(false)}
                  disabled={savingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0 }}
                  disabled={savingPayment}
                >
                  {savingPayment ? 'Saving...' : editingPayment ? 'Save Changes' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal (Tab: Users) */}
      {showEditUserModal && editingUserProfile && (
        <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User Account</h2>
              <button className="icon-btn" onClick={() => setShowEditUserModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <div className="input-wrapper">
                    <Users size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="form-input"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      disabled={updatingUser}
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
                      placeholder="user@example.com"
                      className="form-input"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      disabled={updatingUser}
                      required
                    />
                  </div>
                </div>

                {editUserRole === 'admin' && (
                  <div className="form-group">
                    <label>Admin Slug / Username (e.g. admin1) *</label>
                    <div className="input-wrapper">
                      <Globe size={16} className="input-icon" />
                      <input
                        type="text"
                        placeholder="admin1"
                        className="form-input"
                        value={editUserUsername}
                        onChange={(e) => setEditUserUsername(e.target.value)}
                        disabled={updatingUser}
                        required
                        pattern="^[a-z0-9_-]+$"
                        title="Only lowercase letters, numbers, hyphens, and underscores are allowed"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      placeholder="+1234567890"
                      className="form-input"
                      value={editUserPhone}
                      onChange={(e) => setEditUserPhone(e.target.value)}
                      disabled={updatingUser}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reset Password (leave blank to keep current)</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      placeholder="New password (min 6 chars)"
                      className="form-input"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      disabled={updatingUser}
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Account Role</label>
                  <select
                    className="role-select"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    disabled={updatingUser || (editingUserProfile._id || editingUserProfile.id) === currentUser.id}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {(editingUserProfile._id || editingUserProfile.id) === currentUser.id && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>You cannot change your own role.</span>
                  )}
                </div>

                {editUserRole === 'user' && (
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Linked Support Admins</label>
                    <div style={{ 
                      maxHeight: '150px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'rgba(0,0,0,0.2)'
                    }}>
                      {profiles
                        .filter(p => p.role === 'admin' || p.role === 'super_admin')
                        .map((admin) => {
                          const adminId = admin._id || admin.id;
                          const isChecked = editUserLinkedAdmins.includes(adminId);
                          return (
                            <label key={adminId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditUserLinkedAdmins(prev => [...prev, adminId]);
                                  } else {
                                    setEditUserLinkedAdmins(prev => prev.filter(id => id !== adminId));
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                {admin.name} ({admin.role === 'super_admin' ? 'Super Admin' : `/${admin.username || 'admin'}`})
                              </span>
                            </label>
                          );
                        })}
                      {profiles.filter(p => p.role === 'admin' || p.role === 'super_admin').length === 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No administrative accounts available.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setShowEditUserModal(false)}
                  disabled={updatingUser}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px', margin: 0 }}
                  disabled={updatingUser}
                >
                  {updatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notice Creator Modal */}
      {showNoticeModal && (
        <div className="modal-overlay" onClick={() => setShowNoticeModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Publish Announcement / Notice</h2>
              <button className="icon-btn" onClick={() => setShowNoticeModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newNoticeTitle || !newNoticeContent) return;
              
              setSavingNotice(true);
              try {
                const res = await fetch('/api/notices', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: newNoticeTitle,
                    content: newNoticeContent,
                    type: newNoticeType,
                    targetRole: newNoticeTargetRole,
                    targetUserId: newNoticeTargetUserId || undefined,
                  })
                });
                
                const data = await res.json();
                if (res.ok && data.success) {
                  setNotices(prev => [data.notice, ...prev]);
                  setShowNoticeModal(false);
                  setFeedback({ type: 'success', message: 'Notice published and notifications dispatched successfully!' });
                } else {
                  throw new Error(data.error || 'Failed to save notice');
                }
              } catch (err) {
                setFeedback({ type: 'error', message: (err as Error).message });
              } finally {
                setSavingNotice(false);
              }
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Notice Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Server Maintenance Notice" 
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    required
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff' }}
                  />
                </div>
                
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Notice Content / Message</label>
                  <textarea 
                    placeholder="Provide details about your announcement..." 
                    value={newNoticeContent}
                    onChange={(e) => setNewNoticeContent(e.target.value)}
                    required
                    rows={4}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Notice Type</label>
                    <select 
                      value={newNoticeType} 
                      onChange={(e) => setNewNoticeType(e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%' }}
                    >
                      <option value="global" style={{ background: '#151e24', color: '#fff' }}>Global Announcement</option>
                      <option value="system" style={{ background: '#151e24', color: '#fff' }}>System Broadcast</option>
                      <option value="super_admin_broadcast" style={{ background: '#151e24', color: '#fff' }}>Direct Alert</option>
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Target Group</label>
                    <select 
                      value={newNoticeTargetRole} 
                      onChange={(e) => {
                        setNewNoticeTargetRole(e.target.value);
                        setNewNoticeTargetUserId(''); // Reset target individual when group changes
                      }}
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%' }}
                    >
                      <option value="admin" style={{ background: '#151e24', color: '#fff' }}>Administrators Only</option>
                      <option value="all" style={{ background: '#151e24', color: '#fff' }}>Everyone</option>
                      <option value="user" style={{ background: '#151e24', color: '#fff' }}>Standard Players Only</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Target Individual (Optional User ID)</label>
                  <select 
                    value={newNoticeTargetUserId}
                    onChange={(e) => setNewNoticeTargetUserId(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%' }}
                  >
                    <option value="" style={{ background: '#151e24', color: '#fff' }}>-- Select Specific User (Optional) --</option>
                    {profiles
                      .filter(p => {
                        if (newNoticeTargetRole === 'admin') return p.role === 'admin' || p.role === 'super_admin';
                        if (newNoticeTargetRole === 'user') return p.role === 'user';
                        return true;
                      })
                      .map(p => {
                        const id = p._id || p.id;
                        const label = `${p.name} (${p.username ? `@${p.username}` : p.email || 'No Username'})`;
                        return (
                          <option key={id} value={id} style={{ background: '#151e24', color: '#fff' }}>
                            {label}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={() => setShowNoticeModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', margin: 0, padding: '8px 20px' }} disabled={savingNotice}>
                  {savingNotice ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Time Modal */}
      {showExtendModal && (
        <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Extend Subscription Cycle</h2>
              <button className="icon-btn" onClick={() => setShowExtendModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleExtendSubscription}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Extend subscription time for administrator <strong style={{ color: '#fff' }}>{extendUserName}</strong>. This action will reset their cycle start date to today and unfreeze their account.
                </p>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Extension Duration</label>
                  <select 
                    value={extendDays} 
                    onChange={(e) => {
                      setExtendDays(e.target.value);
                      if (e.target.value) setCustomDate('');
                    }}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%' }}
                  >
                    <option value="30">1 Month (Standard Cycle)</option>
                    <option value="7">7 Days (Short Extension)</option>
                    <option value="14">14 Days (Medium Extension)</option>
                    <option value="90">3 Month (Quarterly Cycle)</option>
                    <option value="180">6 Month (Half Year Cycle)</option>
                    <option value="360">12 Month (Full Year Cycle)</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Or Select Custom Expiration Date</label>
                  <input 
                    type="date" 
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      if (e.target.value) setExtendDays('');
                    }}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff' }}
                  />
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={() => setShowExtendModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', margin: 0, padding: '8px 20px' }} disabled={extending}>
                  {extending ? 'Extending...' : 'Apply Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmModal.show && (
        <div className="modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', background: '#1e293b' }}>
            <div className="modal-header" style={{ borderBottom: confirmModal.isDanger ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(168, 85, 247, 0.2)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>{confirmModal.title}</h2>
              <button className="icon-btn" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '15px', lineHeight: '1.6' }}>
              {confirmModal.message}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: 'none', paddingTop: 0 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ 
                  padding: '8px 18px', 
                  margin: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                style={{ 
                  width: 'auto', 
                  padding: '8px 20px', 
                  margin: 0,
                  background: confirmModal.isDanger ? '#e11d48' : '#a855f7',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: confirmModal.isDanger ? '0 4px 12px rgba(225, 29, 72, 0.2)' : '0 4px 12px rgba(168, 85, 247, 0.2)'
                }}
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Promote to Admin Modal */}
      {showPromoteModal && (
        <div className="modal-overlay" onClick={() => setShowPromoteModal(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Promote User to Admin</h2>
              <button className="icon-btn" onClick={() => setShowPromoteModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleConfirmPromoteToAdmin}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Set up username slug and billing cycle period for promoting <strong style={{ color: '#fff' }}>{promoteUserName}</strong> to administrator.
                </p>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Admin Slug / Username (e.g. admin1) *</label>
                  <div className="input-wrapper">
                    <Globe size={16} className="input-icon" />
                    <input
                      type="text"
                      placeholder="admin1"
                      className="form-input"
                      value={promoteUsernameSlug}
                      onChange={(e) => setPromoteUsernameSlug(e.target.value)}
                      disabled={promotingRole}
                      required
                      pattern="^[a-z0-9_-]+$"
                      title="Only lowercase letters, numbers, hyphens, and underscores are allowed"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>Billing Cycle Period *</label>
                  <select 
                    value={promoteCyclePeriod} 
                    onChange={(e) => setPromoteCyclePeriod(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', color: '#fff', width: '100%' }}
                    disabled={promotingRole}
                    required
                  >
                    <option value="30">1 Month (Standard Cycle)</option>
                    <option value="90">3 Month (Quarterly Cycle)</option>
                    <option value="180">6 Month (Half Year Cycle)</option>
                    <option value="360">12 Month (Full Year Cycle)</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ width: 'auto', margin: 0, padding: '8px 16px' }} onClick={() => setShowPromoteModal(false)} disabled={promotingRole}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', margin: 0, padding: '8px 20px' }} disabled={promotingRole}>
                  {promotingRole ? 'Promoting...' : 'Confirm Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
