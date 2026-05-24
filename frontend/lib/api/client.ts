import type { ApiErrorBody } from "@/lib/auth/types";
import { getDeviceId } from "@/lib/device-id";
import { getApiBaseUrl } from "./config";
import { ensureCsrfCookie, getXsrfToken } from "./csrf";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  fieldErrors(): Record<string, string[]> {
    return this.body.errors ?? {};
  }

  firstError(): string | undefined {
    const errors = this.body.errors;
    if (!errors) {
      return this.body.message;
    }
    const first = Object.values(errors)[0];
    return first?.[0] ?? this.body.message;
  }
}

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  skipCsrf?: boolean;
  skipRefresh?: boolean;
  headers?: Record<string, string>;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      await ensureCsrfCookie();
      const xsrf = getXsrfToken();
      const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
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
  options: ApiRequestOptions = {}
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

  const url = `${getApiBaseUrl()}/api${path.startsWith("/") ? path : `/${path}`}`;

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
    throw new ApiError(response.status, (data as ApiErrorBody) ?? {});
  }

  return data as T;
}
