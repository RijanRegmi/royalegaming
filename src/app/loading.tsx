export default function Loading() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glowing orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 70%)',
        top: '10%',
        left: '5%',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(0, 168, 132, 0.08) 0%, rgba(0,0,0,0) 70%)',
        bottom: '10%',
        right: '5%',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        gap: '16px',
      }}>
        {/* Animated spinner */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '3px solid rgba(168,85,247,0.15)',
          borderTop: '3px solid #a855f7',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        <p style={{ color: '#8fa0b5', fontSize: '14px', margin: 0 }}>Loading Rilogram...</p>
      </div>

      {/* Developed by RJN */}
      <div style={{
        position: 'absolute',
        bottom: '28px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1,
      }}>
        <img 
          src="/assets/logo/RJN.png" 
          alt="RJN Logo" 
          style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'contain' }}
        />
        <span style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Developed by RJN
        </span>
      </div>
    </div>
  );
}
