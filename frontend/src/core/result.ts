// frontend/src/core/result.ts
// Result type for errors as values pattern

export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export function ok<T, E = Error>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<T, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return err(result.error);
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isOk(result)) {
    return ok(result.value);
  }
  return err(fn(result.error));
}

export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return err(result.error);
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

export function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}

export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (isOk(result)) {
    return Promise.resolve(result.value);
  }
  return Promise.reject(result.error);
}

export function fromPromise<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  return promise
    .then(value => ok(value) as Result<T, E>)
    .catch(error => err(error as E));
}

export class AppError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new AppError(message, 'VALIDATION_ERROR', details);
  }

  static notFound(message: string, details?: unknown) {
    return new AppError(message, 'NOT_FOUND', details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: unknown) {
    return new AppError(message, 'UNAUTHORIZED', details);
  }

  static forbidden(message: string = 'Forbidden', details?: unknown) {
    return new AppError(message, 'FORBIDDEN', details);
  }

  static notImplemented(message: string = 'Not implemented', details?: unknown) {
    return new AppError(message, 'NOT_IMPLEMENTED', details);
  }

  static network(message: string = 'Network error', details?: unknown) {
    return new AppError(message, 'NETWORK_ERROR', details);
  }
}
