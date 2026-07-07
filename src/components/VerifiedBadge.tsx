import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function VerifiedBadge({ size = 13, style }: VerifiedBadgeProps) {
  return (
    <svg 
      viewBox="0 0 40 40" 
      width={size} 
      height={size} 
      style={{ 
        display: 'inline-block', 
        marginLeft: '4px',
        marginRight: '4px',
        flexShrink: 0,
        verticalAlign: 'middle',
        position: 'relative',
        top: '-1px',
        ...style
      }}
    >
      <title>Verified</title>
      {/* Clean Blue Circle */}
      <circle cx="20" cy="20" r="16.875" fill="#0095f6" />
      {/* Sharp White Checkmark */}
      <path 
        fill="#ffffff" 
        d="M28.558 18.095l-9.52 9.52a1 1 0 01-1.414 0l-4.52-4.52a1 1 0 011.414-1.414l3.813 3.813 8.813-8.814a1 1 0 111.414 1.414z" 
      />
    </svg>
  );
}
