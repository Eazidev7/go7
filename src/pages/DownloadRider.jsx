import React from 'react';

export default function DownloadRider() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🏍️</div>
        <h1 style={{ color: '#E0001B', fontSize: 28, margin: '0 0 12px' }}>GO7 Rider</h1>
        <p style={{ color: '#555', fontSize: 15, lineHeight: 1.5, margin: '0 0 24px' }}>
          Download the rider app to accept delivery jobs, navigate, and earn.
        </p>
        <a
          href="/api/download-rider.php"
          download="go7-rider.apk"
          style={{ display: 'inline-block', background: '#E0001B', color: '#fff', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 16, fontWeight: 600 }}
        >
          Download APK
        </a>
        <p style={{ color: '#888', fontSize: 13, marginTop: 20 }}>
          Android 8.0+. After downloading, open the file to install.
        </p>
      </div>
    </div>
  );
}
