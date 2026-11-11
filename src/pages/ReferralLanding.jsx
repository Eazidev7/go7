import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const REFERRAL_STORAGE_KEY = 'go7_referral_code';

/**
 * /r/:code — public referral landing.
 *
 * Records the click server-side (analytics only — never generates a reward),
 * stores the normalized code so signup can attribute it, then redirects to
 * the app. Survives the click -> install -> signup gap via localStorage.
 */
const ReferralLanding = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = (code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized) {
      try {
        localStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
      } catch (_) {
        // storage unavailable — signup can still take the code manually
      }
      // Fire-and-forget analytics click; failure must not block landing.
      try {
        const track = httpsCallable(getFunctions(), 'trackReferralClick');
        track({
          code: normalized,
          source: 'LINK',
          utmSource: searchParams.get('utm_source'),
          utmMedium: searchParams.get('utm_medium'),
          utmCampaign: searchParams.get('utm_campaign'),
        }).catch(() => {});
      } catch (_) {}
    }
    navigate('/', { replace: true });
  }, [code, navigate, searchParams]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0F19', color: '#fff' }}>
      <p>Opening Go7…</p>
    </div>
  );
};

export default ReferralLanding;
