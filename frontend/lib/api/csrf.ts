import { getApiBaseUrl } from "./config";

let csrfPromise: Promise<void> | null = null;

export function getXsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split("=")[1] ?? "");
}

export function getCsrfTokenFromCookie(): string | null {
  return getXsrfToken();
}

export async function ensureCsrfCookie(): Promise<void> {
  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = fetch(`${getApiBaseUrl()}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  }).then(() => {
    csrfPromise = null;
  });

  return csrfPromise;
}
