'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Bookmark, Pencil, Trash2 } from 'lucide-react';
import DoubleTapLikeImage from './DoubleTapLikeImage';
import { getUserAvatarColor } from '@/lib/avatar';

interface PostCardProps {
  post: any;
  user: any;
  onLike: (postId: string) => void;
  onEdit?: (post: any) => void;
  onDelete?: (postId: string) => void;
  onViewProfile?: (adminId: string, adminInfo: any) => void;
  fallbackName?: string;
  fallbackAvatar?: string;
  fallbackUsername?: string;
}

const VerifiedBadge = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="14" 
    height="14" 
    style={{ 
      fill: '#0095f6', 
      display: 'inline-block', 
      marginLeft: '4px',
      flexShrink: 0 
    }}
  >
    <title>Verified</title>
    <path d="M12.003 21.13c-.12 0-.24-.04-.34-.12l-2.07-1.62a.43.43 0 0 0-.27-.09H6.68c-.24 0-.44-.2-.44-.44v-2.64c0-.1.03-.2.09-.27l1.62-2.07c.17-.22.17-.53 0-.75l-1.62-2.07a.43.43 0 0 1-.09-.27V5.16c0-.24.2-.44.44-.44h2.64c.1 0 .2-.03.27-.09l2.07-1.62c.19-.15.46-.15.65 0l2.07 1.62c.07.06.17.09.27.09h2.64c.24 0 .44.2.44.44v2.64c0 .1-.03.2-.09.27l-1.62 2.07c-.17.22-.17.53 0 .75l1.62 2.07c.06.07.09.17.09.27v2.64c0 .24-.2.44-.44.44h-2.64c-.1 0-.2.03-.27.09l-2.07 1.62c-.1.08-.22.12-.34.12zm-2.92-8.5l-1.65-1.65a.55.55 0 0 0-.78.78l2.04 2.04c.2.2.53.2.73 0l4.77-4.77a.55.55 0 0 0-.78-.78l-4.33 4.38z" />
  </svg>
);

export default function PostCard({
  post,
  user,
  onLike,
  onEdit,
  onDelete,
  onViewProfile,
  fallbackName,
  fallbackAvatar,
  fallbackUsername
}: PostCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>(post.comments || []);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  useEffect(() => {
    setLocalLikes(post.likes || []);
  }, [post.likes]);

  useEffect(() => {
    setComments(post.comments || []);
  }, [post.comments]);

  const authorName = post.adminId?.name || fallbackName || 'Administrator';
  const authorUsername = post.adminId?.username || fallbackUsername || authorName.toLowerCase().replace(/\s+/g, '');
  const authorAvatar = post.adminId?.avatar || fallbackAvatar;

  const hasLiked = user && localLikes.includes(user.id || user._id);
  const isMyPost = user && (post.adminId?._id === (user.id || user._id) || post.adminId === (user.id || user._id));
  const isSuperAdmin = user && user.role === 'super_admin';

  // Format timestamp
  const formatPostTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return '';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatCount = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const likesCount = localLikes.length;

  const handleLikeClick = () => {
    onLike(post._id);
    
    // Optimistic local state update
    if (user) {
      const userId = user.id || user._id;
      if (localLikes.includes(userId)) {
        setLocalLikes(prev => prev.filter(id => id !== userId));
      } else {
        setLocalLikes(prev => [...prev, userId]);
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isPostingComment) return;

    setIsPostingComment(true);
    try {
      const response = await fetch('/api/posts/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post._id,
          text: newCommentText.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
        setNewCommentText('');
      } else {
        alert(data.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Error posting comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="post-card" style={{ display: 'flex', flexDirection: 'column', gap: '0px', padding: '16px' }}>
      
      {/* 1. Post Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '14px',
          width: '100%'
        }}
      >
        <div 
          onClick={() => onViewProfile && onViewProfile(post.adminId?._id || post.adminId, post.adminId)} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            cursor: onViewProfile ? 'pointer' : 'default' 
          }}
          title={onViewProfile ? "View Profile" : undefined}
        >
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={authorName}
              className="post-avatar"
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '2px solid rgba(168, 85, 247, 0.4)' 
              }}
            />
          ) : (
            <div 
              className="post-avatar"
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: getUserAvatarColor(post.adminId?.id || post.adminId?._id || authorName), 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '13px', 
                border: '2px solid rgba(168, 85, 247, 0.4)' 
              }}
            >
              {getInitials(authorName)}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="post-author-name" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13.5px' }}>
                {authorUsername}
              </span>
              <VerifiedBadge />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '0 4px' }}>•</span>
              <span className="post-time" style={{ color: 'var(--text-muted)', fontSize: '11px', margin: 0 }}>
                {formatPostTime(post.createdAt)}
              </span>
            </div>
            <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Official Announcement
            </span>
          </div>
        </div>

        {/* Edit / Delete actions for owners or super admins */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {(isMyPost || isSuperAdmin) && (
            <>
              {onEdit && (
                <button
                  onClick={() => onEdit(post)}
                  className="post-edit-btn"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    padding: '6px', 
                    display: 'flex', 
                    alignItems: 'center',
                    borderRadius: '50%'
                  }}
                  title="Edit Announcement"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Pencil size={15} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(post._id)}
                  className="post-delete-btn"
                  style={{
                    padding: '6px',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent'
                  }}
                  title="Delete Announcement"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. Post Description (NOW ON TOP OF IMAGE) */}
      {post.content && (
        <div 
          className="post-content" 
          style={{ 
            color: 'var(--text-primary)', 
            fontSize: '14.5px', 
            lineHeight: '1.5', 
            margin: '0 0 14px 0', 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: 'block'
          }}
        >
          <span 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: '6px',
              verticalAlign: 'middle'
            }}
          >
            <span 
              onClick={() => onViewProfile && onViewProfile(post.adminId?._id || post.adminId, post.adminId)}
              style={{ 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                cursor: onViewProfile ? 'pointer' : 'default' 
              }}
            >
              {authorUsername}
            </span>
            <VerifiedBadge />
          </span>
          {post.content}
        </div>
      )}

      {/* 3. Post Image (Using updated DoubleTapLikeImage component) */}
      {post.image && (
        <div 
          style={{ 
            marginLeft: '-16px', 
            marginRight: '-16px', 
            width: 'calc(100% + 32px)', 
            borderTop: '1px solid var(--border-color)',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-app)',
            marginBottom: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <DoubleTapLikeImage
            src={post.image}
            alt="Announcement Media"
            onLike={handleLikeClick}
          />
        </div>
      )}

      {/* 4. Action Bar (Instagram style but only Like, Comment, Bookmark) */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          marginTop: '4px',
          paddingTop: '6px',
          borderTop: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Like Action */}
          <button
            onClick={handleLikeClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: hasLiked ? '#ff4b6b' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 0',
              transition: 'transform 0.1s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Heart size={19} fill={hasLiked ? '#ff4b6b' : 'none'} stroke={hasLiked ? '#ff4b6b' : 'currentColor'} />
            <span style={{ color: 'var(--text-secondary)' }}>{formatCount(likesCount)}</span>
          </button>

          {/* Comment Action */}
          <button
            onClick={() => setShowComments(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: showComments ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 0'
            }}
          >
            <MessageCircle size={19} />
            <span>{formatCount(comments.length)}</span>
          </button>
        </div>

        {/* Bookmark Action */}
        <button
          onClick={() => setIsBookmarked(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isBookmarked ? '#a855f7' : 'var(--text-secondary)',
            padding: '4px 0',
            transition: 'transform 0.1s ease'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bookmark size={19} fill={isBookmarked ? '#a855f7' : 'none'} />
        </button>
      </div>

      {/* 5. Comments Modal Popup */}
      {showComments && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowComments(false)}
        >
          {/* Modal Container */}
          <div 
            style={{ 
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
              animation: 'scaleIn 0.2s ease-out',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '16px', 
                borderBottom: '1px solid var(--border-color)' 
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px' }}>Comments</span>
              <button 
                onClick={() => setShowComments(false)}
                style={{ 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer', 
                  fontSize: '20px', 
                  padding: '4px' 
                }}
              >
                ×
              </button>
            </div>

            {/* Comments List */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              {comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment._id || comment.createdAt} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {comment.userAvatar ? (
                      <img 
                        src={comment.userAvatar} 
                        alt={comment.userName} 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                      />
                    ) : (
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: getUserAvatarColor(comment.userId || comment.userName), 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '12px', 
                          fontWeight: 'bold' 
                        }}
                      >
                        {getInitials(comment.userName)}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px' }}>
                          {comment.userName}
                        </span>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {comment.text}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {formatPostTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>No comments yet. Be the first to comment!</span>
                </div>
              )}
            </div>

            {/* Comment Form */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              {user ? (
                <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    disabled={isPostingComment}
                    style={{
                      flex: 1,
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '20px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isPostingComment || !newCommentText.trim()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: newCommentText.trim() ? 'var(--accent-color)' : 'var(--text-secondary)',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: newCommentText.trim() ? 'pointer' : 'default',
                      padding: '0 8px'
                    }}
                  >
                    {isPostingComment ? 'Posting...' : 'Post'}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Please log in to write a comment.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
