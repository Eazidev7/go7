/**
 * React hook exposing the canonical delivery-pricing engine.
 *
 * Loads pricingSettings/current + deliveryZones once and exposes `quote`/`getFee`.
 * Until the config is enabled (or while it loads / errors) it returns the
 * legacy fee (e.g. FOOD ₦500), so the flow is unchanged until enabled.
 */
import { useEffect, useState, useCallback } from 'react';
import { loadDeliveryPricingConfig, legacyDeliveryPricingConfig } from '../lib/pricingConfig';
import { calculateDeliveryFee } from '../lib/pricingCore';

export function useDeliveryPricing(db) {
  const [config, setConfig] = useState(legacyDeliveryPricingConfig());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const cfg = await loadDeliveryPricingConfig(db);
      if (active) {
        setConfig(cfg);
        setReady(true);
      }
    })().catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [db]);

  /** Full transparent quote. */
  const quote = useCallback(
    (params) => calculateDeliveryFee({ ...params, config }),
    [config]
  );

  /** Just the numeric fee. */
  const getFee = useCallback(
    (params) => calculateDeliveryFee({ ...params, config }).deliveryFee,
    [config]
  );

  return { config, ready, quote, getFee };
}
