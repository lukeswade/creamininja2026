export type Env = {
  // Environment configuration
  ENV: string;
  APP_ORIGIN: string;
  COOKIE_DOMAIN: string;
  
  // Cloudflare bindings
  DB: D1Database;
  UPLOADS: R2Bucket;
  
  // Authentication & security secrets
  SESSION_SIGNING_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_BYPASS: string;
  TURNSTILE_SECRET_KEY: string;
  
  // AI provider API key
  GEMINI_API_KEY: string;
  
  // OAuth credentials
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // R2 S3-compatible API credentials for presigned URLs
  R2_ENDPOINT: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME?: string;
};

export const isProd = (env: Env) => env.ENV === "prod";
