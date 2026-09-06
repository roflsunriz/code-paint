export class PaintValidationError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "PaintValidationError";
    this.path = path;
  }
}
