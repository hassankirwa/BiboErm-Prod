import { getApiBaseUrl } from "@/lib/api/config";

import { isPrivateFileApiUrl } from "@/lib/authenticated-file";

/** Normalize avatar/media URLs from the API for use in img/AvatarImage. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

/** True when the URL can be used directly in img (public /media), like HR profile photos. */
export function isDirectMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  return !isPrivateFileApiUrl(url);
}

export function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
