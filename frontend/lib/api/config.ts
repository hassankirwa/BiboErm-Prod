export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

export const DEV_DEVICE_UUID =
  process.env.NEXT_PUBLIC_DEV_DEVICE_UUID ??
  "00000000-0000-0000-0000-000000000001";
