import type { Env } from "../env";

export function db(env: Env) {
  return env.DB;
}

export async function run(env: Env, sql: string, params: unknown[] = []) {
  return await env.DB.prepare(sql).bind(...params).run();
}

export async function first<T>(env: Env, sql: string, params: unknown[] = []): Promise<T | null> {
  const res = await env.DB.prepare(sql).bind(...params).first();
  return (res as T) ?? null;
}

export async function all<T>(env: Env, sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await env.DB.prepare(sql).bind(...params).all();
  return (res.results as T[]) ?? [];
}
