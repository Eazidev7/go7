import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import {
  DEFAULT_PRICING_SETTINGS,
  normalizePricingSettings,
  subscribePricingSettings,
} from '../utils/pricingSettings';

export function usePricingSettings() {
  const [settings, setSettings] = useState(() =>
    normalizePricingSettings(DEFAULT_PRICING_SETTINGS)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = subscribePricingSettings(
      db,
      (next) => {
        setSettings(next);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { settings, loading, error };
}
