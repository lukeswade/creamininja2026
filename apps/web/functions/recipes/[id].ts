interface Env {
  API_BASE?: string;
}

interface RecipeMeta {
  title: string;
  description?: string | null;
  category: string;
  ingredients: string[];
  imageKey?: string | null;
  visibility: "private" | "restricted" | "public";
}

interface RecipeResponse {
  recipe?: RecipeMeta;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params, next } = context;

  // Let the Pages router resolve the normal static file (dist/index.html)
  const res = await next();

  // We only want to transform HTML responses
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;

  const html = await res.text();
  const id = params.id as string;

  try {
    // API_BASE fallback or custom env var
    let apiBase = "https://api.creamininja.workers.dev"; // default CF worker fallback
    if (env.API_BASE) {
       apiBase = env.API_BASE;
    } else {
       // if we are running in production on creamininja.com, use the live api
       const url = new URL(request.url);
       if (url.hostname === "creamininja.com" || url.hostname === "www.creamininja.com") {
          apiBase = "https://api.creamininja.com";
       }
    }

    const apiRes = await fetch(`${apiBase}/recipes/${id}`);
    if (apiRes.ok) {
      const data = await apiRes.json() as RecipeResponse;
      const r = data.recipe;

      if (r && r.visibility === "public") {
        const title = `${r.title} | CreamiNinja`;
        const desc = r.description || `A Ninja CREAMi recipe for ${r.category} featuring ${r.ingredients.slice(0, 3).join(", ")}.`;
        const img = r.imageKey ? `${apiBase}/uploads/file/${encodeURIComponent(r.imageKey)}` : "https://creamininja.com/icons/icon-512.png";

        let injected = html;
        
        // Replace Tags dynamically via Regex to ensure clean interception
        injected = injected.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
        
        injected = injected.replace(
          /name="description"\s+content="[^"]*"/i,
          `name="description" content="${desc.replace(/"/g, '&quot;')}"`
        );
        
        injected = injected.replace(
          /property="og:title"\s+content="[^"]*"/i,
          `property="og:title" content="${title.replace(/"/g, '&quot;')}"`
        );
        
        injected = injected.replace(
          /property="og:description"\s+content="[^"]*"/i,
          `property="og:description" content="${desc.replace(/"/g, '&quot;')}"`
        );
        
        injected = injected.replace(
          /property="og:image"\s+content="[^"]*"/i,
          `property="og:image" content="${img}"`
        );
        
        // Inject Twitter Cards as well
        injected = injected.replace('</head>', `
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
          <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />
          <meta name="twitter:image" content="${img}" />
        </head>`);

        // Always ensure proper Content-Type
        const modifiedHeaders = new Headers(res.headers);
        modifiedHeaders.set("Content-Type", "text/html; charset=utf-8");

        return new Response(injected, {
          status: 200,
          headers: modifiedHeaders,
        });
      }
    }
  } catch (err) {
    console.error("SEO Edge Injection Error:", err);
  }

  // Fallback to exactly what the SPA usually serves
  return new Response(html, { headers: res.headers });
};
