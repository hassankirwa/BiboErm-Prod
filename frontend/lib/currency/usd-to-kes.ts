import { apiFetch } from "@/lib/api/client";

export type ExchangeRateInfo = {
  from: string;
  to: string;
  rate: number;
  source: string;
  date: string;
  fallback: boolean;
};

export type QuotationExchangeRate = {
  rate: number;
  label: string;
  isManual?: boolean;
};

const CACHE_KEY = "bibo.usd_kes_rate";
const CACHE_TTL_MS = 60 * 60 * 1000;

type CachedRate = ExchangeRateInfo & { cachedAt: number };

function readCache(): CachedRate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(info: ExchangeRateInfo): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...info, cachedAt: Date.now() }));
}

export async function fetchUsdToKesRate(forceRefresh = false): Promise<ExchangeRateInfo> {
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) {
      const { cachedAt: _cachedAt, ...info } = cached;
      return info;
    }
  }

  const res = await apiFetch<{ data: ExchangeRateInfo }>(
    "/api/v1/lookups/exchange-rate?from=USD&to=KES",
    { skipCache: forceRefresh },
  );

  writeCache(res.data);
  return res.data;
}

export function convertUsdToKes(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

export function formatExchangeRateLabel(
  info: ExchangeRateInfo,
  effectiveRate?: number,
  isManual = false,
): string {
  const rate = effectiveRate ?? info.rate;
  const formatted = rate.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

  if (isManual) {
    return `1 USD = ${formatted} KES (manual override)`;
  }

  const sourceLabel = info.fallback ? "config fallback" : info.source;
  return `1 USD = ${formatted} KES (${sourceLabel}, ${info.date})`;
}

export function buildQuotationExchangeRate(
  info: ExchangeRateInfo | null,
  effectiveRate: number | null,
  isManual = false,
): QuotationExchangeRate | null {
  if (effectiveRate == null || effectiveRate <= 0) return null;

  const baseInfo = info ?? {
    from: "USD",
    to: "KES",
    rate: effectiveRate,
    source: "config",
    date: new Date().toISOString().slice(0, 10),
    fallback: true,
  };

  return {
    rate: effectiveRate,
    label: formatExchangeRateLabel(baseInfo, effectiveRate, isManual),
    isManual,
  };
}
