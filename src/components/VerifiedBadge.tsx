import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  style?: React.CSSProperties;
}

export default function VerifiedBadge({ size = 12, style }: VerifiedBadgeProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      style={{ 
        display: 'inline-block', 
        marginLeft: '3px',
        marginRight: '3px',
        flexShrink: 0,
        verticalAlign: 'middle',
        position: 'relative',
        top: '-0.5px',
        ...style
      }}
    >
      <title>Verified</title>
      {/* Blue Scalloped Rosette Background */}
      <path 
        fill="#0095f6" 
        d="M12.003 21.13c-.12 0-.24-.04-.34-.12l-2.07-1.62a.43.43 0 0 0-.27-.09H6.68c-.24 0-.44-.2-.44-.44v-2.64c0-.1.03-.2.09-.27l1.62-2.07c.17-.22.17-.53 0-.75l-1.62-2.07a.43.43 0 0 1-.09-.27V5.16c0-.24.2-.44.44-.44h2.64c.1 0 .2-.03.27-.09l2.07-1.62c.19-.15.46-.15.65 0l2.07 1.62c.07.06.17.09.27.09h2.64c.24 0 .44.2.44.44v2.64c0 .1-.03.2-.09.27l-1.62 2.07c-.17.22-.17.53 0 .75l1.62 2.07c.06.07.09.17.09.27v2.64c0 .24-.2.44-.44.44h-2.64c-.1 0-.2.03-.27.09l-2.07 1.62c-.1.08-.22.12-.34.12z" 
      />
      {/* White Checkmark */}
      <path 
        fill="#ffffff" 
        d="M9.083 12.63l-1.65-1.65a.55.55 0 0 0-.78.78l2.04 2.04c.2.2.53.2.73 0l4.77-4.77a.55.55 0 0 0-.78-.78l-4.33 4.38z" 
      />
    </svg>
  );
}
