// NOTE:
// Hono's `c.json()` already serializes objects to JSON and sets headers.
// This module therefore returns *plain objects* that can be passed directly
// to `c.json(body, status, headers)`.

export function jsonOk<T>(data: T): T {
  return data;
}

export function badRequest(message: string, details?: unknown) {
  return { ok: false as const, error: { message, details } };
}

export function unauthorized(message = "Unauthorized") {
  return { ok: false as const, error: { message } };
}

export function forbidden(message = "Forbidden") {
  return { ok: false as const, error: { message } };
}

export function notFound(message = "Not Found") {
  return { ok: false as const, error: { message } };
}
