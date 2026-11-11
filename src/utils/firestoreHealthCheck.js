import { doc, getDoc } from 'firebase/firestore';

/**
 * Lightweight Firestore connectivity check (DEV only).
 * Read-only — never writes (writes to health_checks require admin and caused false alarms).
 */
export class FirestoreHealthChecker {
  constructor(db) {
    this.db = db;
    // Public-read path used by bills pricing (safe for any client)
    this.testDocPath = 'pricingSettings/bills';
  }

  async performHealthCheck() {
    console.log('🔍 Starting Firestore health check (read-only)...');

    const results = {
      connected: false,
      canRead: false,
      errors: [],
      latency: null,
    };

    const startTime = Date.now();

    try {
      const docSnap = await getDoc(doc(this.db, this.testDocPath));
      results.canRead = true;
      results.connected = true;
      results.latency = Date.now() - startTime;
      console.log(
        docSnap.exists()
          ? '✅ Firestore read OK (pricingSettings/bills)'
          : '✅ Firestore reachable (pricingSettings/bills missing — defaults apply)'
      );
    } catch (error) {
      console.error('❌ Firestore health check failed:', error);
      results.errors.push(error.message);
      this.diagnoseError(error);
    }

    this.generateHealthReport(results);
    return results;
  }

  diagnoseError(error) {
    if (error.code === 'permission-denied') {
      console.error(
        '🚨 Firestore permission-denied on public read path. Check live rules for pricingSettings (should allow read: if true). Do NOT open world-writable rules.'
      );
    } else if (error.code === 'unavailable') {
      console.error('🚨 Firestore unavailable — check network or https://status.firebase.google.com/');
    } else {
      console.error('❓ Firestore error:', { code: error.code, message: error.message });
    }
  }

  generateHealthReport(results) {
    console.log(
      `🏥 Firestore health: connected=${results.connected ? 'yes' : 'no'} read=${results.canRead ? 'ok' : 'fail'} latency=${results.latency ?? 'n/a'}ms`
    );
  }

  static suggestQuickFixes() {
    console.log(
      '🛠️ If Firestore fails: verify project ID, network, and that pricingSettings rules allow public read. Never use allow read, write: if true in production.'
    );
  }
}

export const runFirestoreHealthCheck = async (db) => {
  if (import.meta.env.DEV && db) {
    setTimeout(async () => {
      try {
        const checker = new FirestoreHealthChecker(db);
        await checker.performHealthCheck();
      } catch (error) {
        console.error('❌ Health check failed to run:', error);
        FirestoreHealthChecker.suggestQuickFixes();
      }
    }, 2000);
  }
};
