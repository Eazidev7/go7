import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=g.go7.app';
const MARKET_URL = 'market://details?id=g.go7.app';

/**
 * In-app version gate. Reads appConfig/mobile from Firestore:
 *   minimumVersionCode — builds below this are HARD BLOCKED until update
 *   latestVersionCode  — builds below this get a dismissable update prompt
 *   updateMessage      — optional custom message
 * Fails open: if the doc is missing/unreadable, the app runs normally.
 */
export default function AppUpdateGate() {
  const [gate, setGate] = useState(null); // { force: bool, message: string }

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const info = await App.getInfo();
        const build = Number(info.build) || 0;
        if (!build) return;
        const snap = await getDoc(doc(db, 'appConfig', 'mobile'));
        if (!snap.exists() || cancelled) return;
        const cfg = snap.data();
        const min = Number(cfg.minimumVersionCode) || 0;
        const latest = Number(cfg.latestVersionCode) || 0;
        if (min && build < min) {
          setGate({ force: true, message: cfg.updateMessage || '' });
        } else if (latest && build < latest && cfg.softUpdateEnabled !== false) {
          setGate({ force: false, message: cfg.updateMessage || '' });
        }
      } catch {
        // fail open — never block the app on a config read error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!gate) return null;

  const openStore = () => {
    try {
      window.location.href = MARKET_URL;
      setTimeout(() => {
        window.location.href = PLAY_STORE_URL;
      }, 1200);
    } catch {
      window.open(PLAY_STORE_URL, '_blank');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'rgba(17,24,39,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
          {gate.force ? 'Update required' : 'Update available'}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
          {gate.message ||
            (gate.force
              ? 'This version of Go7 is no longer supported. Update to the latest version to continue ordering.'
              : 'A newer version of Go7 is available with improvements and fixes.')}
        </p>
        <button
          onClick={openStore}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            border: 'none',
            background: '#e0001b',
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Update on Google Play
        </button>
        {!gate.force && (
          <button
            onClick={() => setGate(null)}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '10px 0',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
