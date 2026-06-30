'use client';

import { useState } from 'react';
import AdSenseBanner from './AdSenseBanner';

interface SponsoredPostCardProps {
  style?: React.CSSProperties;
}

export default function SponsoredPostCard({ style }: SponsoredPostCardProps) {
  const [adStatus, setAdStatus] = useState<'filled' | 'unfilled' | 'loading'>('loading');
  const adSlot = process.env.NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID;

  // If there's no slot configured, hide the sponsored announcement card
  if (!adSlot) {
    return null;
  }

  // If the slot is configured but has returned "unfilled", hide the entire sponsored announcement card
  if (adStatus === 'unfilled') {
    return null;
  }

  return (
    <div 
      className="sponsored-post-card" 
      style={{ 
        ...style,
        display: adStatus === 'filled' ? 'block' : 'none' // Render but keep invisible while loading
      }}
    >
      <div className="sponsored-badge">Sponsored Announcement</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          color: '#ffffff',
          fontSize: '14px'
        }}>
          RL
        </div>
        <div>
          <h4 style={{ color: '#ffffff', fontWeight: 600, fontSize: '14px', margin: 0 }}>Rilogram Premium Events</h4>
          <span style={{ color: '#8fa0b5', fontSize: '11px' }}>Sponsored Partner</span>
        </div>
      </div>
      <p style={{ color: '#e9edef', fontSize: '14px', lineHeight: '1.5', margin: '0 0 12px 0' }}>
        Join the next big tournament! Compete with players worldwide and win big prizes. High speed servers, verified anti-cheat, and massive prize pools await.
      </p>
      <AdSenseBanner 
        adSlot={adSlot} 
        adFormat="fluid" 
        style={{ display: 'block' }} 
        onStatusChange={(status) => setAdStatus(status)}
      />
    </div>
  );
}
