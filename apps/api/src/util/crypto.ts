import { nanoid } from "nanoid";

/**
 * Convert bytes (ArrayBuffer / SharedArrayBuffer / ArrayBufferView) into base64url string.
 * Works in Cloudflare Workers. Typed to avoid TS BufferSource issues.
 */
export function base64url(input: BufferSource): string {
  // Normalize to Uint8Array regardless of whether input is ArrayBuffer, SharedArrayBuffer, or a view
  const bytes =
    input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : ArrayBuffer.isView(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : new Uint8Array(input as SharedArrayBuffer);

  // Convert to binary string for btoa
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);

  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlToBytes(b64url: string): Uint8Array {
  const b64 =
    b64url.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((b64url.length + 3) % 4);

  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr);
}

export async function sha256Base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(hash);
}

/**
 * PBKDF2 password hashing (Workers-compatible).
 * Stored format: pbkdf2_sha256$<iter>$<salt_b64url>$<hash_b64url>
 *
 * Cloudflare Workers runtime supports PBKDF2 iteration counts up to 100,000.
 */
export async function hashPassword(password: string, iter = 100_000): Promise<string> {
  // Clamp to Workers limit so we never generate an unusable hash
  const iterations = Math.min(Math.max(iter, 50_000), 100_000);

  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = base64url(saltBytes);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations },
    key,
    256
  );

  const hash = base64url(derived);
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;

  const [alg, iterStr, saltB64, hashB64] = parts;
  if (alg !== "pbkdf2_sha256") return false;

  const iter = Number(iterStr);
  if (!Number.isFinite(iter) || iter < 50_000) return false;

  // Workers limit: do NOT attempt >100k (would throw)
  if (iter > 100_000) return false;

  const saltBytes = base64urlToBytes(saltB64);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256
  );

  const computed = base64url(derived);
  return timingSafeEqual(computed, hashB64);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function newId(prefix: string) {
  return `${prefix}_${nanoid()}`;
}
