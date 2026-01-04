# CreamiNinja — PWA for Ninja CREAMi recipe sharing

This repo is a **Cloudflare-native** full-stack PWA:
- **Frontend:** Cloudflare Pages (Vite + React + Tailwind + PWA)
- **API:** Cloudflare Workers (Hono)
- **SQL:** Cloudflare D1 (SQLite semantics)
- **File storage:** Cloudflare R2 (user avatars + recipe photos; uploads via presigned URLs)
- **Auth:** email+password + server-side sessions (httpOnly cookie) + CSRF
- **Social:** friend requests (“Ninjagos”), friends list, private/restricted/public recipes, explicit sharing
- **Feed:** network + popular (day/week/month/all)
- **AI:** recipe generation from ingredient list or photo (OpenAI Responses API; provider abstraction)

> Domain plan: `creamininja.com` (Pages) and `api.creamininja.com` (Worker).

---

## 1) Prereqs
- Node 20+
- pnpm 9+
- Cloudflare account + `wrangler` login

Install tooling:
```bash
npm i -g pnpm wrangler
```

---

## 2) Local dev (frontend + API)
### API
```bash
cd apps/api
pnpm i
# create a local D1 db and apply migrations
pnpm db:local:setup

# (Optional) add demo content (4 demo users + recipes)
pnpm db:seed:local
pnpm dev
```

### Web
```bash
cd apps/web
pnpm i
cp .env.example .env
pnpm dev
```

For local development, you can leave `VITE_TURNSTILE_SITE_KEY` empty and set `TURNSTILE_BYPASS=true` in the API.

Frontend defaults to `http://localhost:5173` and calls the API at `http://localhost:8787`.

---

## 3) Cloudflare setup (once)
### Create D1 + R2
```bash
cd apps/api
wrangler d1 create creamininja-db
wrangler r2 bucket create creamininja-uploads
```

### Apply migrations
```bash
pnpm db:remote:apply
```

### (Optional) Seed demo content
```bash
pnpm db:seed:remote
```

### Configure secrets
```bash
wrangler secret put SESSION_SIGNING_SECRET
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put OPENAI_API_KEY
```

> You can skip Turnstile at first by setting `TURNSTILE_BYPASS=true` in `wrangler.toml` (development only).

---

## 4) Deploy
### API (Worker)
```bash
cd apps/api
pnpm deploy
```

### Web (Pages)
1. Push this repo to GitHub.
2. In Cloudflare Dashboard → Pages → Create project → connect repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `pnpm -C apps/web build`
   - **Build output directory:** `apps/web/dist`
4. Environment variables (Pages):
   - `VITE_API_BASE=https://api.creamininja.com`
   - `VITE_TURNSTILE_SITE_KEY=<your Turnstile sitekey>`

Then add your domain:
- Pages: `creamininja.com`, `www.creamininja.com`
- Worker route: `api.creamininja.com/*`

---

## 5) Notes
- Recipes/photos are stored privately; access is enforced by the API.
- “Popularity” is a simple `stars_count` ranking per time window. You can later upgrade to a time-decay score.
- AI endpoints are rate-limited and (optionally) Turnstile-protected.

---

## Repo layout
- `apps/api` — Workers API + D1 schema/migrations
- `apps/web` — PWA UI

