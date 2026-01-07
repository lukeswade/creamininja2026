// apps/api/src/util/gemini.ts
export type GeminiGenerateArgs = {
  apiKey: string;
  model?: string; // e.g. "gemini-2.5-flash"
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

export async function geminiGenerateJSON<T>(args: GeminiGenerateArgs): Promise<T> {
  const model = args.model ?? "gemini-2.5-flash";

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
      maxOutputTokens: args.maxOutputTokens ?? 800,
    },
  };

  // Gemini supports a system instruction field in v1beta
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
      } catch {
        // Fallthrough to error below
      }
    }
    throw new Error(`Invalid JSON from AI: ${cleaned.slice(0, 200)}...`);
  }
}
