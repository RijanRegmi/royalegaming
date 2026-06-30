'use client';

import React, { useState, useRef } from 'react';
import { Heart } from 'lucide-react';

interface DoubleTapLikeImageProps {
  src: string;
  alt: string;
  onLike: () => void;
}

export default function DoubleTapLikeImage({ src, alt, onLike }: DoubleTapLikeImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showHeart, setShowHeart] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPosition({ x, y });
  };

  const handleClick = () => {
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
      setIsZoomed(!isZoomed);
      clickTimeout.current = null;
    }, 250); // Delay to verify if it's a double click
  };

  return (
    <div
      ref={containerRef}
      className="post-image-container"
      style={{
        overflow: 'hidden',
        cursor: isZoomed ? 'zoom-out' : 'zoom-in',
        position: 'relative',
        width: 'calc(100% + 40px)',
        display: 'block',
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsZoomed(false)}
    >
      <img
        src={src}
        alt={alt}
        className="post-image"
        style={{
          transform: isZoomed ? 'scale(1.8)' : 'scale(1)',
          transformOrigin: `${position.x}% ${position.y}%`,
          transition: isZoomed ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          width: '100%',
          height: 'auto',
          maxHeight: '480px',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {showHeart && (
        <div className="heart-overlay heart-pop">
          <Heart size={80} fill="#ffffff" stroke="none" />
        </div>
      )}
    </div>
  );
}
