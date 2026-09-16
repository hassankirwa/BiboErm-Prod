export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get validationErrors(): Record<string, string[]> | undefined {
    const errors = this.body?.errors;
    if (errors && typeof errors === "object" && !Array.isArray(errors)) {
      return errors as Record<string, string[]>;
    }
    return undefined;
  }

  fieldErrors(): Record<string, string[]> {
    return this.validationErrors ?? {};
  }

  get firstFieldError(): string | undefined {
    const errors = this.validationErrors;
    if (!errors) return undefined;
    const first = Object.values(errors)[0];
    return first?.[0];
  }

  firstError(): string | undefined {
    return this.firstFieldError ?? this.message;
  }

  /** Machine-readable code from production API payloads (`error`). */
  get errorCode(): string | undefined {
    const code = this.body?.error;
    return typeof code === "string" && code.trim() !== "" ? code : undefined;
  }
}

const HTML_OR_STACK_MARKERS = [
  "<!doctype",
  "<html",
  "stacktrace",
  "stack trace",
  "trace:",
  "sqlstate[",
  "pdoexception",
  "vendor/laravel",
  "vendor\\laravel",
  "call stack",
];

const STATUS_FALLBACKS: Record<number, string> = {
  400: "Invalid request. Check your input and try again.",
  401: "Your session expired. Sign in again.",
  403: "You do not have permission to do that.",
  404: "The requested resource was not found.",
  408: "The request timed out. Try again.",
  413: "This file is larger than the server upload limit. Try a smaller workbook or raise PHP/nginx upload limits.",
  419: "Your session expired. Refresh the page and try again.",
  422: "Some fields are invalid. Check the form and try again.",
  429: "Too many requests. Wait a moment and try again.",
  500: "Server error while loading this page. Check server logs if it keeps failing.",
  502: "The API gateway is unavailable. Try again shortly.",
  503: "The service is temporarily unavailable. Try again shortly.",
  504: "The server timed out. Try again shortly.",
};

function looksUnsafeForClient(message: string): boolean {
  const lower = message.toLowerCase();
  if (HTML_OR_STACK_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }
  if (message.length > 400) {
    return true;
  }
  // Absolute paths / SQL dumps
  if (/[A-Za-z]:\\/.test(message) || /\/(?:var|home|Users|usr)\//.test(message)) {
    return true;
  }
  if (/\bselect\b.+\bfrom\b/i.test(message) && message.length > 120) {
    return true;
  }
  return false;
}

/** Strip HTML / stack / SQL noise from an API or network message. */
export function filterClientErrorMessage(
  message: string | null | undefined,
  fallback: string,
): string {
  const trimmed = (message ?? "").trim();
  if (!trimmed) {
    return fallback;
  }
  if (looksUnsafeForClient(trimmed)) {
    return fallback;
  }
  // Collapse whitespace from accidental multi-line payloads.
  return trimmed.replace(/\s+/g, " ").slice(0, 360);
}

export function messageFromApiErrorBody(
  body: Record<string, unknown> | null | undefined,
  status: number,
  fallback?: string,
): string {
  const statusFallback =
    fallback ?? STATUS_FALLBACKS[status] ?? `Request failed with status ${status}`;

  if (!body) {
    return statusFallback;
  }

  const message = typeof body.message === "string" ? body.message : null;
  const detail =
    typeof body.detail === "string" && process.env.NODE_ENV !== "production"
      ? body.detail
      : null;

  const filtered = filterClientErrorMessage(message, statusFallback);
  if (
    detail &&
    !looksUnsafeForClient(detail) &&
    (filtered === statusFallback || process.env.NODE_ENV !== "production")
  ) {
    if (filtered === statusFallback) {
      return filterClientErrorMessage(detail, statusFallback);
    }
    const safeDetail = filterClientErrorMessage(detail, "");
    return safeDetail ? `${filtered} (${safeDetail})` : filtered;
  }
  return filtered;
}

/** User-facing message from API failures (422 field errors, etc.). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const fromFields = err.firstFieldError;
    if (fromFields) {
      return filterClientErrorMessage(fromFields, fallback);
    }
    return filterClientErrorMessage(err.message, STATUS_FALLBACKS[err.status] ?? fallback);
  }
  if (err instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(err.message)) {
    return "Network error. Check your connection and that the API is reachable.";
  }
  if (err instanceof Error && err.message) {
    return filterClientErrorMessage(err.message, fallback);
  }
  return fallback;
}
