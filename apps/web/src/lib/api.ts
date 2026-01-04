export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export type ApiError = { message: string; details?: any };

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: { message: "Invalid JSON from server", details: text } };
  }
}

export async function api<T>(path: string, init: RequestInit & { csrf?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");

  if (init.csrf) headers.set("x-csrf-token", init.csrf);

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include"
  });

  const data = await parseJson(res);
  if (!res.ok) {
    const err = (data?.error as ApiError) || { message: "Request failed" };
    throw Object.assign(new Error(err.message), { details: err.details, status: res.status });
  }
  return data as T;
}
