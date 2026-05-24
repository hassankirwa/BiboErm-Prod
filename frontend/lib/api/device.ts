import { DEV_DEVICE_UUID } from "./config";

const STORAGE_KEY = "bibo_device_uuid";

export function getDeviceUuid(): string {
  if (typeof window === "undefined") {
    return DEV_DEVICE_UUID;
  }

  let uuid = localStorage.getItem(STORAGE_KEY);
  if (!uuid) {
    uuid = DEV_DEVICE_UUID;
    localStorage.setItem(STORAGE_KEY, uuid);
  }
  return uuid;
}
