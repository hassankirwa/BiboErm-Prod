"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acquireAuthenticatedFileObjectUrl,
  invalidateAuthenticatedFileObjectUrl,
  isPrivateFileApiUrl,
  releaseAuthenticatedFileObjectUrl,
} from "@/lib/authenticated-file";
import { resolveMediaUrl } from "@/lib/media";

type MediaImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
};

/**
 * Renders stored media like HR avatars (public /media URLs) or private API files (cookie auth + blob).
 */
export function useMediaImageSrc(src: string | null | undefined): {
  displaySrc: string | null;
  loading: boolean;
  onError: () => void;
} {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setLoading(false);
      return;
    }

    if (!isPrivateFileApiUrl(src)) {
      setDisplaySrc(resolveMediaUrl(src));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDisplaySrc(null);

    void acquireAuthenticatedFileObjectUrl(src)
      .then((url) => {
        if (cancelled) return;
        setDisplaySrc(url);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      releaseAuthenticatedFileObjectUrl(src);
    };
  }, [src, retryKey]);

  const onError = useCallback(() => {
    if (!src || !isPrivateFileApiUrl(src)) return;

    invalidateAuthenticatedFileObjectUrl(src);
    setDisplaySrc(null);
    setRetryKey((current) => current + 1);
  }, [src]);

  return { displaySrc, loading, onError };
}

export function MediaImage({ src, alt, className, fallback = null }: MediaImageProps) {
  const { displaySrc, loading, onError } = useMediaImageSrc(src);

  if (loading) {
    return (
      <div
        className={className}
        aria-hidden
        data-slot="media-image-loading"
      />
    );
  }

  if (!displaySrc) {
    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displaySrc} alt={alt} className={className} onError={onError} />
  );
}
