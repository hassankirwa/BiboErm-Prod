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

  get firstFieldError(): string | undefined {
    const errors = this.validationErrors;
    if (!errors) return undefined;
    const first = Object.values(errors)[0];
    return first?.[0];
  }
}
