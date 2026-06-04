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
}

/** User-facing message from API failures (422 field errors, etc.). */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.firstError() ?? err.message ?? fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
