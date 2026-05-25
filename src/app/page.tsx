'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, LogIn, Shield, Gamepad2, ArrowRight, Loader2, User as UserIcon } from 'lucide-react';
import AdSenseBanner from '@/components/AdSenseBanner';

interface GameItem {
  _id: string;
  name: string;
  image: string;
  link: string;
  agentLink?: string;
}

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<GameItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);
  const [linkMode, setLinkMode] = useState<'player' | 'agent'>('player');
  const [isFeedAdFilled, setIsFeedAdFilled] = useState<boolean>(false);

  // Fetch games and verify authentication
  useEffect(() => {
    const fetchGames = async () => {
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

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
          setAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setVerifyingAuth(false);
      }
    };

    fetchGames();
    checkAuth();

    // Allow document scrolling for lobby page
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        setAuthenticated(false);
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleChatAccess = () => {
    if (authenticated) {
      router.push('/chat');
    } else {
      router.push('/login?redirect=/chat');
    }
  };

  return (
    <div className="lobby-page">
      {/* Header Navbar */}
      <header className="lobby-navbar">
        <div className="lobby-logo" onClick={() => router.push('/')}>
          <img 
            src="/royale_logo.jpg" 
            alt="Royale Gaming Logo" 
            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', marginRight: '10px' }}
          />
          <div>
            <span className="lobby-logo-text">Royale Gaming</span>
            <div className="lobby-logo-sub">Vegas Casino Lobby</div>
          </div>
        </div>

        <nav className="lobby-nav-actions">
          {verifyingAuth ? (
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          ) : authenticated ? (
            <>
              {/* User badge */}
              <div className="lobby-user-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{user.name}</span>
                <span style={{ fontSize: '10px', color: '#a855f7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Player'}
                </span>
              </div>
              
              {(user.role === 'super_admin' || user.role === 'admin') && (
                <button onClick={() => router.push('/admin')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Control Room">
                  <Shield size={15} />
                  <span className="lobby-btn-label">Control Room</span>
                </button>
              )}

              <button onClick={() => router.push('/profile')} className="lobby-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="My Profile">
                <UserIcon size={15} />
                <span className="lobby-btn-label">Profile</span>
              </button>

              <button onClick={handleChatAccess} className="lobby-btn-chat">
                <MessageSquare size={15} fill="white" />
                <span className="lobby-btn-label">Support Chat</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={handleChatAccess} className="lobby-btn-chat" style={{ backgroundColor: 'rgba(0, 168, 132, 0.15)', color: '#00a884', border: '1px solid rgba(0, 168, 132, 0.25)' }}>
                <MessageSquare size={15} /> Support Chat
              </button>
              <button onClick={() => router.push('/login')} className="lobby-btn-primary">
                <LogIn size={15} /> Sign In
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <div className="lobby-container">
        
        {/* Hero Section */}
        <section className="lobby-hero">
          <h2>Royale <span style={{ color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.3)' }}>Gaming Portal</span></h2>
          <p>
            Access the industry's premium slot platforms directly. Get real-time support from our administrators whenever you need.
          </p>
        </section>

        {/* Google AdSense Banner */}
        {process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID && (
          <AdSenseBanner adSlot={process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID} />
        )}

        {/* Link Mode Switcher */}
        {authenticated && (user?.role === 'super_admin' || user?.role === 'admin') && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#a855f7',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '16px',
              textShadow: '0 0 15px rgba(168, 85, 247, 0.4)'
            }}>
              Game Links
            </h2>
            <div className="lobby-mode-container">
              <div className={`lobby-mode-switcher ${linkMode}-active`}>
                <button
                  type="button"
                  onClick={() => setLinkMode('player')}
                  className={`lobby-mode-btn ${linkMode === 'player' ? 'active-player' : ''}`}
                >
                  <span>Player Links</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLinkMode('agent')}
                  className={`lobby-mode-btn ${linkMode === 'agent' ? 'active-agent' : ''}`}
                >
                  <span>Agent Links</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Lobby Grid */}
        <main>
          {loadingGames ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px' }}>
              <Loader2 className="animate-spin" style={{ color: '#a855f7' }} size={40} />
              <p style={{ fontSize: '13px', color: '#8fa0b5' }}>Loading gaming platforms...</p>
            </div>
          ) : games.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'rgba(18, 31, 69, 0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '480px', margin: '0 auto' }}>
              <Gamepad2 size={48} style={{ color: '#8fa0b5', marginBottom: '16px', opacity: 0.5, margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>No Gaming Platforms</h3>
              <p style={{ fontSize: '13px', color: '#8fa0b5' }}>Ask the super administrator to add some game platforms to the lobby.</p>
            </div>
          ) : (
            <div className="lobby-grid-layout">
              {games.map((game, index) => (
                <Fragment key={game._id}>
                  {index === 4 && process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT_ID && (
                    <div 
                      className="lobby-card adsense-feed-card" 
                      style={{ 
                        display: isFeedAdFilled ? 'flex' : 'none', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        minHeight: isFeedAdFilled ? '320px' : '0', 
                        padding: isFeedAdFilled ? '16px' : '0', 
                        background: 'rgba(18, 31, 69, 0.4)', 
                        borderRadius: '20px', 
                        border: isFeedAdFilled ? '1px solid rgba(255,255,255,0.05)' : 'none' 
                      }}
                    >
                      <AdSenseBanner 
                        adSlot={process.env.NEXT_PUBLIC_ADSENSE_FEED_SLOT_ID} 
                        adFormat="fluid" 
                        fullWidthResponsive={false} 
                        onStatusChange={(status) => setIsFeedAdFilled(status === 'filled')}
                      />
                    </div>
                  )}
                  <div className="lobby-card">
                    {/* Image container */}
                    <div className="lobby-card-img-container">
                      <img
                        src={game.image}
                        alt={game.name}
                        className="lobby-card-img"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';
                        }}
                      />
                    </div>

                    {/* Platform Name */}
                    <h3 className="lobby-card-title">{game.name}</h3>

                    {/* Play Button */}
                    <button
                      onClick={() => {
                        if (!authenticated) {
                          router.push('/login');
                          return;
                        }
                        const targetLink = linkMode === 'agent' && game.agentLink ? game.agentLink : game.link;
                        window.open(targetLink, '_blank');
                      }}
                      className={`lobby-play-button ${linkMode === 'agent' ? 'agent-mode' : ''}`}
                    >
                      PLAY NOW
                    </button>
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Chat Support FAB */}
      <div className="lobby-chat-widget">
        <button onClick={handleChatAccess} className="lobby-chat-fab" title="Connect with support">
          <MessageSquare size={26} fill="white" />
        </button>
      </div>

      {/* Sticky Bottom Bar for Guest Players */}
      {!authenticated && !verifyingAuth && (
        <div className="lobby-announcement-bar">
          <span style={{ fontSize: '13px', color: '#8fa0b5' }}>
            Have questions or issues with deposits/withdrawals? Talk to our managers.
          </span>
          <button
            onClick={handleChatAccess}
            className="lobby-btn-primary"
            style={{ padding: '8px 18px', fontSize: '12px', width: 'auto' }}
          >
            Sign In to Live Support <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
