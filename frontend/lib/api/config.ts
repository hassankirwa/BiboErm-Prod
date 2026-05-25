export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy frontend/.env.example to .env.local.",
    );
  }
  return url.replace(/\/$/, "");
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export const DEV_DEVICE_UUID =
  process.env.NEXT_PUBLIC_DEV_DEVICE_UUID ??
  "00000000-0000-0000-0000-000000000001";
