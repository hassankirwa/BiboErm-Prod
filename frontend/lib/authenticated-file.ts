import { getApiBaseUrl } from "@/lib/api/config";
import { getDeviceUuid } from "@/lib/api/device";

/** Private file URLs from the API (may omit /v1 on legacy records). */
export function normalizePrivateFileApiUrl(url: string): string {
  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  let normalized = url.replace(/\/api\/files\//, "/api/v1/files/");

  const pathMatch = normalized.match(/\/api\/v1\/files\/[^\s?#]+/);
  if (pathMatch) {
    return `${apiBase}${pathMatch[0]}`;
  }

  if (normalized.startsWith("/")) {
    normalized = `${apiBase}${normalized}`;
  }

  return normalized;
}

export function isPrivateFileApiUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  return url.includes("/api/files/") || url.includes("/api/v1/files/");
}

type ResolvedEntry = {
  kind: "resolved";
  objectUrl: string;
  refCount: number;
};

type PendingEntry = {
  kind: "pending";
  promise: Promise<string | null>;
  refCount: number;
};

type CacheEntry = ResolvedEntry | PendingEntry;

const objectUrlCache = new Map<string, CacheEntry>();

async function loadObjectUrl(
  normalized: string,
  pendingEntry: PendingEntry,
): Promise<string | null> {
  try {
    const response = await fetch(normalized, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "image/*,*/*",
        "X-Requested-With": "XMLHttpRequest",
        "X-Device-UUID": getDeviceUuid(),
        "X-Device-Id": getDeviceUuid(),
      },
    });

    if (!response.ok) {
      if (objectUrlCache.get(normalized) === pendingEntry) {
        objectUrlCache.delete(normalized);
      }
      return null;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const buffer = await response.arrayBuffer();
    const blobType = contentType.startsWith("image/")
      ? contentType
      : contentType || "application/octet-stream";
    const blob = new Blob([buffer], { type: blobType });
    const objectUrl = URL.createObjectURL(blob);
    const current = objectUrlCache.get(normalized);

    if (current !== pendingEntry) {
      URL.revokeObjectURL(objectUrl);
      return current?.kind === "resolved" ? current.objectUrl : null;
    }

    if (pendingEntry.refCount <= 0) {
      URL.revokeObjectURL(objectUrl);
      objectUrlCache.delete(normalized);
      return null;
    }

    objectUrlCache.set(normalized, {
      kind: "resolved",
      objectUrl,
      refCount: pendingEntry.refCount,
    });

    return objectUrl;
  } catch {
    if (objectUrlCache.get(normalized) === pendingEntry) {
      objectUrlCache.delete(normalized);
    }
    return null;
  }
}

/** Acquire a shared blob URL for a private API file. Call release when done. */
export async function acquireAuthenticatedFileObjectUrl(
  apiUrl: string,
): Promise<string | null> {
  const normalized = normalizePrivateFileApiUrl(apiUrl);
  const existing = objectUrlCache.get(normalized);

  if (existing?.kind === "resolved") {
    existing.refCount += 1;
    return existing.objectUrl;
  }

  if (existing?.kind === "pending") {
    existing.refCount += 1;
    return existing.promise;
  }

  const pendingEntry: PendingEntry = {
    kind: "pending",
    promise: Promise.resolve(null),
    refCount: 1,
  };
  pendingEntry.promise = loadObjectUrl(normalized, pendingEntry);
  objectUrlCache.set(normalized, pendingEntry);

  return pendingEntry.promise;
}

/** Release a previously acquired blob URL. Revokes only when no consumers remain. */
export function releaseAuthenticatedFileObjectUrl(apiUrl: string): void {
  const normalized = normalizePrivateFileApiUrl(apiUrl);
  const entry = objectUrlCache.get(normalized);
  if (!entry) return;

  entry.refCount -= 1;

  if (entry.refCount > 0) return;

  if (entry.kind === "resolved") {
    URL.revokeObjectURL(entry.objectUrl);
  }

  objectUrlCache.delete(normalized);
}

/** Drop a cached blob URL so the next acquire refetches (e.g. after img onError). */
export function invalidateAuthenticatedFileObjectUrl(apiUrl: string): void {
  const normalized = normalizePrivateFileApiUrl(apiUrl);
  const entry = objectUrlCache.get(normalized);
  if (!entry) return;

  if (entry.kind === "resolved") {
    URL.revokeObjectURL(entry.objectUrl);
  }

  objectUrlCache.delete(normalized);
}

/** @deprecated Prefer acquire/release for lifecycle-safe blob URLs. */
export async function fetchAuthenticatedFileObjectUrl(
  apiUrl: string,
): Promise<string | null> {
  return acquireAuthenticatedFileObjectUrl(apiUrl);
}

/** @deprecated Prefer releaseAuthenticatedFileObjectUrl(apiUrl). */
export function revokeAuthenticatedFileObjectUrl(objectUrl: string | null): void {
  if (!objectUrl?.startsWith("blob:")) return;

  for (const [normalized, entry] of objectUrlCache.entries()) {
    if (entry.kind === "resolved" && entry.objectUrl === objectUrl) {
      releaseAuthenticatedFileObjectUrl(normalized);
      return;
    }
  }

  URL.revokeObjectURL(objectUrl);
}
