import { nanoid } from "nanoid";

export function base64url(bytes: ArrayBuffer): string {
  const b = new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  const b64 = btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return b64;
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer);
}

export async function sha256Base64url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(hash);
}

/**
 * PBKDF2 password hashing (Workers-compatible).
 * Stored format: pbkdf2_sha256$<iter>$<salt_b64url>$<hash_b64url>
 */
export async function hashPassword(password: string, iter = 150_000): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = base64url(saltBytes.buffer);

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256
  );
  const hash = base64url(derived);
  return `pbkdf2_sha256$${iter}$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [alg, iterStr, saltB64, hashB64] = parts;
  if (alg !== "pbkdf2_sha256") return false;
  const iter = Number(iterStr);
  if (!Number.isFinite(iter) || iter < 50_000) return false;

  const saltBytes = base64urlToBytes(saltB64);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: iter },
    key,
    256
  );
  const computed = base64url(derived);
  return timingSafeEqual(computed, hashB64);
}

function base64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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
