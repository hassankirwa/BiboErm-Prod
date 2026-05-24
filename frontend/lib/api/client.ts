import { API_URL } from "./config";
import { getCsrfTokenFromCookie } from "./csrf";
import { getDeviceUuid } from "./device";
import { ApiError } from "./errors";

type ApiFetchOptions = RequestInit & {
  json?: unknown;
  skipAuthHeaders?: boolean;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function ensureCsrfCookie(): Promise<void> {
  const res = await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new ApiError(res.status, "Could not initialize session.");
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { json, skipAuthHeaders, headers: initHeaders, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();
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

  const res = await fetch(`${API_URL}${path}`, {
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
}
