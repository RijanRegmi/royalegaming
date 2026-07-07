import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function VerifiedBadge({ size = 16, style }: VerifiedBadgeProps) {
  return (
    <svg 
      viewBox="0 0 16 16" 
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
      {/* 16-lobe Rosette Background */}
      <path 
        fill="#0095f6" 
        d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01-.622-.636z" 
      />
      {/* Crisp White Checkmark Overlay */}
      <path 
        fill="#ffffff" 
        d="M10.354 6.854L7.354 9.854a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708z" 
      />
    </svg>
  );
}
