'use client';

import { useEffect, useRef, useState } from 'react';

interface AdSenseBannerProps {
  adSlot: string;
  style?: React.CSSProperties;
  adFormat?: string;
  fullWidthResponsive?: boolean;
  onStatusChange?: (status: 'filled' | 'unfilled' | 'loading') => void;
}

export default function AdSenseBanner({
  adSlot,
  style = { display: 'block' },
  adFormat = 'auto',
  fullWidthResponsive = true,
  onStatusChange,
}: AdSenseBannerProps) {
  const [isUnfilled, setIsUnfilled] = useState(false);
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    try {
      // Safely initialize the AdSense slot on mount
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense initialization error:', err);
    }
  }, []);

  useEffect(() => {
    const insEl = insRef.current;
    if (!insEl) return;

    const checkStatus = () => {
      const status = insEl.getAttribute('data-ad-status');
      if (status === 'unfilled') {
        setIsUnfilled(true);
        onStatusChange?.('unfilled');
      } else if (status === 'filled') {
        setIsUnfilled(false);
        onStatusChange?.('filled');
      } else {
        onStatusChange?.('loading');
      }
    };

    // Initial check
    checkStatus();

    // Observe changes to the data-ad-status attribute
    const observer = new MutationObserver(() => {
      checkStatus();
    });

    observer.observe(insEl, { attributes: true, attributeFilter: ['data-ad-status'] });

    return () => {
      observer.disconnect();
    };
  }, [onStatusChange]);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX";

  return (
    <div 
      className={`adsense-banner-container ${isUnfilled ? 'is-hidden' : 'is-visible'}`} 
      style={{ 
        display: isUnfilled ? 'none' : 'block', 
        margin: isUnfilled ? '0' : '20px 0', 
        overflow: 'hidden', 
        textAlign: 'center' 
      }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={style}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}
