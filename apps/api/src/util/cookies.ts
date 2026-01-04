export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    path?: string;
    domain?: string;
    maxAge?: number;
  } = {}
) {
  const segs = [`${name}=${encodeURIComponent(value)}`];
  segs.push(`Path=${opts.path ?? "/"}`);
  if (opts.domain) segs.push(`Domain=${opts.domain}`);
  if (opts.httpOnly) segs.push("HttpOnly");
  if (opts.secure) segs.push("Secure");
  segs.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (typeof opts.maxAge === "number") segs.push(`Max-Age=${opts.maxAge}`);
  return segs.join("; ");
}
