import React, { useEffect, useState } from 'react';

/**
 * Listens for pwaManager's 'pwa-update-available' event and shows a brief,
 * non-blocking toast while the app self-heals (auto-reloads onto the new
 * bundle a couple seconds later). Purely informational — the reload itself
 * is triggered by pwaManager, not this component.
 */
export default function UpdateAvailableToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisible(true);
    window.addEventListener('pwa-update-available', onUpdate);
    return () => window.removeEventListener('pwa-update-available', onUpdate);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: '#111',
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          animation: 'go7-spin 0.8s linear infinite',
        }}
      />
      Updating Go7…
      <style>{`@keyframes go7-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
