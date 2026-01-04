// apps/api/src/db/sql.ts

type DBEnv = { DB: D1Database };

function normalizeParams(args: unknown[]): unknown[] {
  // Support both:
  //   run(env, sql, [a,b,c])
  // and
  //   run(env, sql, a,b,c)
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0] as unknown[];
  return args;
}

export async function run(env: DBEnv, sql: string, ...args: unknown[]) {
  const params = normalizeParams(args);
  return env.DB.prepare(sql).bind(...params).run();
}

export async function first<T = any>(env: DBEnv, sql: string, ...args: unknown[]): Promise<T | null> {
  const params = normalizeParams(args);
  const row = await env.DB.prepare(sql).bind(...params).first<T>();
  return row ?? null;
}

export async function all<T = any>(env: DBEnv, sql: string, ...args: unknown[]): Promise<T[]> {
  const params = normalizeParams(args);
  const res = await env.DB.prepare(sql).bind(...params).all<T>();
  return (res.results ?? []) as T[];
}
