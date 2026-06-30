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
        gap: '24px',
      }}>
        {/* RILOGRAM Logo */}
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
          background: 'transparent',
          position: 'relative'
        }}>
          <img 
            src="/rilogram_logo.png" 
            alt="Rilogram Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.22)', transformOrigin: 'center' }}
          />
        </div>

        {/* Animated spinner */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid rgba(168,85,247,0.15)',
          borderTop: '3px solid #a855f7',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>

      {/* Developed by RJN */}
      <div style={{
        position: 'absolute',
        bottom: '36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1,
      }}>
        <span style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.35)',
          fontWeight: 400,
          letterSpacing: '1px',
          marginBottom: '8px',
        }}>
          from
        </span>
        <img 
          src="/assets/logo/RJN.png" 
          alt="RJN Logo" 
          style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            border: '2px solid rgba(255, 255, 255, 0.1)',
            objectFit: 'cover' 
          }}
        />
      </div>
    </div>
  );
}
