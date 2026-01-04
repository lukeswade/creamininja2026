export type Env = {
  ENV: string;
  APP_ORIGIN: string;
  COOKIE_DOMAIN: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_BYPASS: string;
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSION_SIGNING_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
  OPENAI_API_KEY: string;
};

export const isProd = (env: Env) => env.ENV === "prod";
