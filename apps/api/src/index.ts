import { Hono } from "hono";
import type { Env } from "./env";
import authRoutes from "./routes/auth";
import friendsRoutes from "./routes/friends";
import recipesRoutes from "./routes/recipes";
import feedRoutes from "./routes/feed";
import uploadsRoutes from "./routes/uploads";
import aiRoutes from "./routes/ai";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

const app = new Hono<{ Bindings: Env }>();

app.use("*", secureHeaders());

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      // Allow local dev and your Pages origin
      const allowed = new Set([c.env.APP_ORIGIN, "http://localhost:5173"]);
      return allowed.has(origin) ? origin : c.env.APP_ORIGIN;
    },
    credentials: true,
    allowHeaders: ["content-type", "x-csrf-token"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  })
);

app.get("/", (c) => c.json({ ok: true, name: "creamininja-api" }));

app.route("/auth", authRoutes);
app.route("/friends", friendsRoutes);
app.route("/recipes", recipesRoutes);
app.route("/feed", feedRoutes);
app.route("/uploads", uploadsRoutes);
app.route("/ai", aiRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: { message: "Internal error" } }, 500);
});

export default app;
