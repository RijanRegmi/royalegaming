'use client';

import { useEffect } from 'react';

interface AdSenseBannerProps {
  adSlot: string;
  style?: React.CSSProperties;
  adFormat?: string;
  fullWidthResponsive?: boolean;
}

export default function AdSenseBanner({
  adSlot,
  style = { display: 'block' },
  adFormat = 'auto',
  fullWidthResponsive = true,
}: AdSenseBannerProps) {
  useEffect(() => {
    try {
      // Safely initialize the AdSense slot on mount
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense initialization error:', err);
    }
  }, []);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-XXXXXXXXXXXXXXXX";

  return (
    <div className="adsense-banner-container" style={{ margin: '20px 0', overflow: 'hidden', textAlign: 'center' }}>
      <ins
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
