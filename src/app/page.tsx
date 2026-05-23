'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, LogOut, LogIn, User, Shield, Gamepad2, ArrowRight, Loader2, Sparkles } from 'lucide-react';

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
    <div className="h-screen bg-gradient-to-br from-[#0c0f12] via-[#10141a] to-[#080a0d] text-[#e9edef] overflow-y-auto relative pb-20">
      {/* Dynamic glow decoration */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* CSS custom animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 168, 132, 0.5); }
          50% { transform: scale(1.08); box-shadow: 0 0 20px 8px rgba(0, 168, 132, 0.25); }
        }
        .pulse-chat {
          animation: pulse-glow 2.5s infinite ease-in-out;
        }
        .text-glow {
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#161a1f]/85 backdrop-blur-md border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-900/30">
            <Gamepad2 className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              RoyaleGaming <Sparkles size={14} className="text-yellow-400 fill-yellow-400" />
            </h1>
            <p className="text-[10px] text-purple-400/80 font-semibold tracking-wider uppercase">Vegas Casino Lobby</p>
          </div>
        </div>

        <nav className="flex items-center gap-4">
          {verifyingAuth ? (
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          ) : authenticated ? (
            <div className="flex items-center gap-3">
              {/* User badge */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-semibold text-white">{user.name}</span>
                <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">
                  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Player'}
                </span>
              </div>
              
              {user.role === 'super_admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-3.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/20 text-purple-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Shield size={14} /> Control Room
                </button>
              )}

              <button
                onClick={handleChatAccess}
                className="px-4 py-1.5 bg-[#00a884] hover:bg-[#00c99e] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00a884]/10 flex items-center gap-1.5"
              >
                <MessageSquare size={14} fill="white" /> Support Chat
              </button>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors border border-white/5"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleChatAccess}
                className="px-4 py-1.5 bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[#00a884]/25"
              >
                <MessageSquare size={14} /> Support Chat
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs tracking-wide rounded-lg shadow-md hover:shadow-purple-500/20 transition-all flex items-center gap-1.5"
              >
                <LogIn size={14} /> Sign In
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* Hero Banner */}
      <section className="max-w-6xl mx-auto px-6 mt-10 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Royale <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-500 to-purple-600 text-glow">Gaming Portal</span>
        </h2>
        <p className="mt-3 text-sm md:text-base text-[#8696a0] max-w-xl mx-auto leading-relaxed">
          Access the industry's premium slot platforms directly. Get real-time support from our administrators whenever you need.
        </p>
      </section>

      {/* Game Cards Grid */}
      <main className="max-w-6xl mx-auto px-6 mt-12">
        {loadingGames ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="text-purple-500 animate-spin" size={40} />
            <p className="text-xs text-[#8696a0]">Loading gaming platforms...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20 bg-[#161a1f]/40 rounded-2xl border border-white/5 p-8 max-w-md mx-auto">
            <Gamepad2 size={48} className="mx-auto text-[#667781] mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-white mb-2">No Gaming Platforms</h3>
            <p className="text-xs text-[#8696a0] mb-6">Ask the super administrator to add some games to the lobby directory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {games.map((game) => (
              <div
                key={game._id}
                className="group relative bg-[#161a1f] border border-white/5 rounded-[20px] p-4 flex flex-col items-center justify-between transition-all duration-300 hover:scale-[1.03] hover:border-purple-500/35 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] shadow-lg"
              >
                {/* Logo container */}
                <div className="w-full aspect-square rounded-[14px] overflow-hidden mb-4 bg-black/35 border border-white/5 relative">
                  <img
                    src={game.image}
                    alt={game.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                    onError={(e) => {
                      // Fallback image if broken URL
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=400';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Name */}
                <h3 className="text-sm md:text-base font-semibold text-white mb-4 text-center tracking-wide group-hover:text-purple-300 transition-colors">
                  {game.name}
                </h3>

                {/* Play Now Button */}
                <button
                  onClick={() => window.open(game.link, '_blank')}
                  className="w-full py-2.5 bg-[#b500ff] hover:bg-[#c214ff] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-purple-500/25 active:scale-95 transition-all"
                >
                  PLAY NOW
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Chat Support FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleChatAccess}
          className="pulse-chat w-14 h-14 rounded-full flex items-center justify-center bg-[#00a884] hover:bg-[#00c99e] text-white shadow-lg shadow-[#00a884]/30 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
          title="Connect with support"
        >
          <MessageSquare size={26} fill="white" className="group-hover:rotate-12 transition-transform duration-300" />
        </button>
      </div>

      {/* Sticky Bottom Bar for anonymous players */}
      {!authenticated && !verifyingAuth && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#161a1f]/95 backdrop-blur-md border-t border-white/5 py-3 px-6 flex items-center justify-center gap-4 text-center">
          <span className="text-xs text-[#8696a0] hidden md:inline">
            Have questions or issues with deposits/withdrawals? Talk to our managers.
          </span>
          <button
            onClick={handleChatAccess}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:from-purple-500 hover:to-fuchsia-500"
          >
            Sign In to Live Support <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
