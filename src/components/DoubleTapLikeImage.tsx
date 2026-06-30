'use client';

import React, { useState, useRef } from 'react';
import { Heart, X, ZoomIn, ZoomOut } from 'lucide-react';

interface DoubleTapLikeImageProps {
  src: string;
  alt: string;
  onLike: () => void;
}

export default function DoubleTapLikeImage({ src, alt, onLike }: DoubleTapLikeImageProps) {
  const [showHeart, setShowHeart] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      // Double click detected
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      
      // Trigger like
      onLike();
      
      // Trigger heart pop animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
      return;
    }

    clickTimeout.current = setTimeout(() => {
      // Single click -> Open fullscreen view
      setIsFullscreen(true);
      setZoomScale(1);
      clickTimeout.current = null;
    }, 250);
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale(prev => Math.max(prev - 0.5, 1));
  };

  return (
    <>
      <div
        className="post-image-container"
        style={{
          overflow: 'hidden',
          cursor: 'zoom-in',
          position: 'relative',
          width: 'calc(100% + 40px)',
          display: 'block',
        }}
        onClick={handleClick}
      >
        <img
          src={src}
          alt={alt}
          className="post-image"
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '600px',
            objectFit: 'contain',
            backgroundColor: '#080f24',
            display: 'block',
          }}
        />
        {showHeart && (
          <div className="heart-overlay heart-pop">
            <Heart size={80} fill="#ffffff" stroke="none" />
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox / Zoom Portal */}
      {isFullscreen && (
        <div 
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
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setIsFullscreen(false)}
        >
          {/* Controls */}
          <div 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              gap: '12px',
              zIndex: 100000,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleZoomIn}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <button
              onClick={handleZoomOut}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'white',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                background: 'rgba(234, 0, 56, 0.2)',
                border: 'none',
                color: '#ea0038',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(234, 0, 56, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(234, 0, 56, 0.2)'}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Fullscreen Image Container */}
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
            }}
          >
            <img
              src={src}
              alt={alt}
              style={{
                maxWidth: '95vw',
                maxHeight: '95vh',
                objectFit: 'contain',
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.2s ease-out',
                cursor: zoomScale > 1 ? 'grab' : 'zoom-in',
                userSelect: 'none',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (zoomScale > 1) {
                  setZoomScale(1);
                } else {
                  setZoomScale(1.8);
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
