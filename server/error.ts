export class LoomaError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "LoomaError";

    Object.setPrototypeOf(this, LoomaError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      cause: this.cause,
      stack: this.stack,
    };
  }
}
