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
  GEMINI_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // R2 S3-compatible API credentials for presigned URLs
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME?: string;
};

export const isProd = (env: Env) => env.ENV === "prod";
