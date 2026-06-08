"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acquireAuthenticatedFileObjectUrl,
  isPrivateFileApiUrl,
  invalidateAuthenticatedFileObjectUrl,
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
  failed: boolean;
} {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    if (!isPrivateFileApiUrl(src)) {
      setDisplaySrc(resolveMediaUrl(src));
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDisplaySrc(null);
    setFailed(false);

    void acquireAuthenticatedFileObjectUrl(src)
      .then((url) => {
        if (cancelled) return;
        if (!url) {
          setDisplaySrc(null);
          setFailed(true);
          return;
        }
        setDisplaySrc(url);
      })
      .catch(() => {
        if (!cancelled) {
          setDisplaySrc(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      const urlToRelease = src;
      queueMicrotask(() => {
        releaseAuthenticatedFileObjectUrl(urlToRelease);
      });
    };
  }, [src, retryNonce]);

  const onError = useCallback(() => {
    if (!src || !isPrivateFileApiUrl(src)) return;

    invalidateAuthenticatedFileObjectUrl(src);
    if (retryNonce < 1) {
      setRetryNonce((nonce) => nonce + 1);
      return;
    }

    releaseAuthenticatedFileObjectUrl(src);
    setDisplaySrc(null);
    setFailed(true);
  }, [src, retryNonce]);

  return { displaySrc, loading, onError, failed };
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
