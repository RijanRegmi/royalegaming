'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, LogIn, Shield, Gamepad2, ArrowRight, Loader2 } from 'lucide-react';

interface GameItem {
  _id: string;
  name: string;
  image: string;
  link: string;
}

export default function Home() {
  const router = useRouter();
  const [games, setGames] = useState<GameItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loadingGames, setLoadingGames] = useState<boolean>(true);
  const [verifyingAuth, setVerifyingAuth] = useState<boolean>(true);

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
        router.refresh();
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
          <div className="lobby-logo-icon">
            <Gamepad2 className="text-white" size={22} />
          </div>
          <div>
            <span className="lobby-logo-text">RoyaleGaming</span>
            <div className="lobby-logo-sub">Vegas Casino Lobby</div>
          </div>
        </div>

        <nav className="lobby-nav-actions">
          {verifyingAuth ? (
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          ) : authenticated ? (
            <>
              {/* User badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{user.name}</span>
                <span style={{ fontSize: '10px', color: '#a855f7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Player'}
                </span>
              </div>
              
              {user.role === 'super_admin' && (
                <button onClick={() => router.push('/admin')} className="lobby-btn-secondary">
                  Control Room
                </button>
              )}

              <button onClick={handleChatAccess} className="lobby-btn-chat">
                <MessageSquare size={15} fill="white" /> Support Chat
              </button>

              <button onClick={handleLogout} className="lobby-btn-secondary" title="Sign Out">
                <LogOut size={15} />
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
              {games.map((game) => (
                <div key={game._id} className="lobby-card">
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
                    onClick={() => window.open(game.link, '_blank')}
                    className="lobby-play-button"
                  >
                    PLAY NOW
                  </button>
                </div>
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
