"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  convertUsdToKes,
  fetchUsdToKesRate,
  type ExchangeRateInfo,
} from "./usd-to-kes";

export function useUsdToKesRate() {
  const [rateInfo, setRateInfo] = useState<ExchangeRateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState<number | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const info = await fetchUsdToKesRate(force);
      setRateInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load exchange rate");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveRate = useMemo(() => {
    if (manualOverride != null && manualOverride > 0) return manualOverride;
    return rateInfo?.rate ?? null;
  }, [manualOverride, rateInfo]);

  const convert = useCallback(
    (usd: number) => (effectiveRate != null ? convertUsdToKes(usd, effectiveRate) : usd),
    [effectiveRate],
  );

  const isManual = manualOverride != null && manualOverride > 0;

  return {
    rateInfo,
    effectiveRate,
    loading,
    error,
    manualOverride,
    setManualOverride,
    isManual,
    refresh: () => void load(true),
    convert,
  };
}
