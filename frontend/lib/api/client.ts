import type { ApiErrorBody } from "@/lib/auth/types";
import { getDeviceId } from "@/lib/device-id";
import { API_URL, getApiBaseUrl } from "./config";
import { ensureCsrfCookie, getCsrfTokenFromCookie, getXsrfToken } from "./csrf";
import { getDeviceUuid } from "./device";
import { ApiError } from "./errors";
import { buildCacheKey, cachedRequest, invalidateApiCache } from "./request-cache";

export { ApiError, ensureCsrfCookie, invalidateApiCache };

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  skipCsrf?: boolean;
  skipRefresh?: boolean;
  headers?: Record<string, string>;
};

type ApiFetchOptions = RequestInit & {
  json?: unknown;
  skipAuthHeaders?: boolean;
  /** Bypass in-memory GET cache (default false). */
  skipCache?: boolean;
  /** How long to reuse a successful GET response (default 30s). */
  cacheTtlMs?: number;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      await ensureCsrfCookie();
      const xsrf = getXsrfToken();
      const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
          "X-Device-Id": getDeviceId(),
        },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    skipCsrf = false,
    skipRefresh = false,
    headers: extraHeaders = {},
  } = options;

  const isMutating = method !== "GET" && method !== "HEAD";

  if (isMutating && !skipCsrf) {
    await ensureCsrfCookie();
  }

  const xsrf = getXsrfToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-Device-Id": getDeviceId(),
    ...extraHeaders,
  };

  if (isMutating && xsrf) {
    headers["X-XSRF-TOKEN"] = xsrf;
  }

  if (body !== undefined && !formData) {
    headers["Content-Type"] = "application/json";
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}/api/v1${normalizedPath}`;

  const doFetch = () =>
    fetch(url, {
      method,
      credentials: "include",
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });

  let response = await doFetch();

  if (response.status === 401 && !skipRefresh && path !== "/auth/refresh") {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      if (isMutating && !skipCsrf) {
        await ensureCsrfCookie();
        const newXsrf = getXsrfToken();
        if (newXsrf) {
          headers["X-XSRF-TOKEN"] = newXsrf;
        }
      }
      response = await doFetch();
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorBody = (data as ApiErrorBody) ?? {};
    throw new ApiError(
      response.status,
      errorBody.message ?? `Request failed with status ${response.status}`,
      errorBody as Record<string, unknown>,
    );
  }

  return data as T;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    json,
    skipAuthHeaders,
    skipCache = false,
    cacheTtlMs,
    headers: initHeaders,
    ...rest
  } = options;
  const method = (rest.method ?? "GET").toUpperCase();
  const url = `${API_URL}${path}`;
  const isCacheableGet = method === "GET" && !skipCache;

  const execute = async (): Promise<T> => {
    const headers = new Headers(initHeaders);

    headers.set("Accept", "application/json");
    headers.set("X-Requested-With", "XMLHttpRequest");

    if (!skipAuthHeaders) {
      const deviceUuid = getDeviceUuid();
      headers.set("X-Device-UUID", deviceUuid);
      headers.set("X-Device-Id", deviceUuid);
    }

    if (json !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (MUTATING_METHODS.has(method)) {
      const csrf = getCsrfTokenFromCookie();
      if (csrf) {
        headers.set("X-XSRF-TOKEN", csrf);
      }
    }

    const res = await fetch(url, {
      ...rest,
      method,
      credentials: "include",
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const message =
        (typeof body.message === "string" && body.message) ||
        "Request failed. Please try again.";
      throw new ApiError(res.status, message, body);
    }

    return body as T;
  };

  if (isCacheableGet) {
    return cachedRequest<T>(buildCacheKey(method, url), execute, { ttlMs: cacheTtlMs });
  }

  const result = await execute();

  if (MUTATING_METHODS.has(method)) {
    invalidateApiCache(`GET:${API_URL}`);
  }

  return result;
}
