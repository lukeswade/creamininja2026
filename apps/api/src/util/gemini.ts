// apps/api/src/util/gemini.ts
export type GeminiGenerateArgs = {
  apiKey: string;
  model?: string;
  fallbacks?: string[];
  system?: string;
  user: string;
  // Optional image bytes as base64 (no data: prefix)
  image?: { mimeType: string; base64: string };
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
};

function stripJsonFence(s: string) {
  // Handles ```json ... ``` or ``` ... ```
  return s
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJsonBlock(s: string) {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

async function runGeminiRequest<T>(args: GeminiGenerateArgs, model: string): Promise<T> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;

  const parts: any[] = [{ text: args.user }];

  if (args.image) {
    parts.unshift({
      inline_data: {
        mime_type: args.image.mimeType,
        data: args.image.base64,
      },
    });
  }

  const body: any = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: args.temperature ?? 0.7,
      topP: args.topP ?? 0.9,
      maxOutputTokens: args.maxOutputTokens ?? 700,
      responseMimeType: "application/json"
    },
  };

  if (args.system?.trim()) {
    body.systemInstruction = { parts: [{ text: args.system.trim() }] };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json<any>();
  if (!resp.ok) {
    const msg = data?.error?.message || `Gemini error (${resp.status})`;
    throw new Error(msg);
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("") ?? "";

  const cleaned = stripJsonFence(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const extracted = extractJsonBlock(cleaned);
    if (extracted) {
      try {
        return JSON.parse(extracted) as T;
      } catch {}
    }
    throw new Error(`Invalid JSON from AI: ${cleaned.slice(0, 200)}...`);
  }
}

function shouldFallback(err: Error) {
  const message = err.message.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("not supported") ||
    message.includes("quota exceeded") ||
    message.includes("limit: 0") ||
    message.includes("429")
  );
}

export async function geminiGenerateJSON<T>(args: GeminiGenerateArgs): Promise<T> {
  if (!args.apiKey || args.apiKey === "undefined") {
    throw new Error("GEMINI_API_KEY is missing. Check your .dev.vars or Cloudflare secrets.");
  }
  const models = [args.model ?? "gemini-3.1-flash-lite", ...(args.fallbacks ?? [])];
  let lastErr: Error | null = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await runGeminiRequest<T>(args, model);
    } catch (err: any) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (i === models.length - 1 || !shouldFallback(lastErr)) break;
      console.warn("gemini_model_fallback", { from: model, to: models[i + 1], reason: lastErr.message });
      continue;
    }
  }

  throw lastErr ?? new Error("Gemini generation failed");
}
