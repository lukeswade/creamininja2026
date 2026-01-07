# Photo Upload and AI Generation Guide

This guide explains how photo uploads and AI recipe generation work in CreamiNinja.

## Photo Uploads

### How It Works

1. **Presigned URLs**: The app uses Cloudflare R2 with presigned URLs for secure, direct-to-storage uploads
2. **Client Flow**:
   - User selects a photo in the UI
   - Frontend requests a presigned URL from `/uploads/presign`
   - Frontend uploads directly to R2 using the presigned URL
   - Frontend saves the returned key with the recipe

### Configuration

To enable photo uploads, you need R2 API credentials:

1. Create R2 API tokens in Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Create a token with read/write permissions
3. Set the secrets:
   ```bash
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```
4. The `R2_ENDPOINT` is already configured in `wrangler.toml`

### API Endpoints

- `POST /uploads/presign` - Get a presigned URL for uploading
  - Body: `{ kind: "avatar" | "recipe", contentType: string, bytes: number }`
  - Returns: `{ key, url, headers }`
  - Max file size: 2.5MB
  - Supported formats: JPEG, PNG, WebP

- `GET /uploads/file/:key` - Retrieve an uploaded file
  - Enforces access control based on recipe visibility and friendships

- `POST /uploads/set-avatar` - Set user avatar
  - Body: `{ avatarKey: string | null }`

## AI Recipe Generation

### Provider: Gemini 2.5 Flash

The app uses Google's Gemini 2.5 Flash API for AI recipe generation.

### Configuration

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey) and set it:

```bash
wrangler secret put GEMINI_API_KEY
```

### API Endpoints

#### 1. Generate from Ingredients

`POST /ai/from-ingredients`

Generate a recipe from a list of ingredients.

**Request:**
```json
{
  "ingredients": ["heavy cream", "sugar", "vanilla extract"],
  "category": "Ice Cream",
  "dietary": ["gluten-free"],
  "creativity": "balanced"
}
```

**Response:**
```json
{
  "ok": true,
  "recipe": {
    "title": "Classic Vanilla Bean Ice Cream",
    "category": "Ice Cream",
    "description": "Smooth and creamy vanilla ice cream",
    "ingredients": ["2 cups heavy cream", "1 cup sugar", "2 tsp vanilla extract"],
    "steps": [
      "Mix all ingredients in a bowl",
      "Pour into Ninja CREAMi pint container",
      "Freeze for 24 hours",
      "Process on Ice Cream setting",
      "Enjoy!"
    ],
    "notes": ["For extra creaminess, add a respin"],
    "allergens": ["dairy"]
  }
}
```

#### 2. Generate from Photo

`POST /ai/from-image`

Generate a recipe by analyzing a photo of ingredients.

**Request:**
```json
{
  "imageKey": "recipe/user123/img_abc123.jpg",
  "category": "Gelato"
}
```

**Response:**
Same structure as from-ingredients endpoint.

**Note:** Upload the image first using `/uploads/presign`, then pass the returned key to this endpoint.

#### 3. Surprise Me

`POST /ai/surprise`

Generate a completely random creative recipe.

**Request:**
```json
{}
```

**Response:**
Same structure as other AI endpoints.

### Rate Limiting

AI endpoints are rate-limited to 20 requests per minute per user.

### Output Schema

All AI endpoints return recipes matching this schema:
- `title`: string (3-120 chars)
- `category`: string (2-40 chars)
- `description`: string (optional, max 280 chars)
- `ingredients`: array of strings (3-6 items)
- `steps`: array of strings (3-5 items)
- `notes`: array of strings (optional, max 5 items)
- `allergens`: array of strings (optional, max 5 items)

## Frontend Usage

### Photo Upload Example

```typescript
// In CreateRecipe.tsx
async function uploadPhoto(file: File) {
  // 1. Request presigned URL
  const presign = await api("/uploads/presign", {
    method: "POST",
    body: JSON.stringify({ 
      kind: "recipe", 
      contentType: file.type, 
      bytes: file.size 
    }),
    csrf: csrfToken
  });

  // 2. Upload to R2
  await fetch(presign.url, {
    method: "PUT",
    headers: presign.headers,
    body: file
  });

  // 3. Save the key
  setImageKey(presign.key);
}
```

### AI Generation Example

```typescript
// Generate from ingredients
const res = await api("/ai/from-ingredients", {
  method: "POST",
  csrf: csrfToken,
  body: JSON.stringify({ 
    ingredients: ["ingredient1", "ingredient2"],
    category: "Ice Cream",
    creativity: "balanced"
  })
});

// Apply to form
setTitle(res.recipe.title);
setIngredientsText(res.recipe.ingredients.join("\n"));
setStepsText(res.recipe.steps.join("\n"));
```

## Security

- All uploads require authentication and CSRF protection
- Access to uploaded files is controlled by recipe visibility and friendship status
- Presigned URLs expire after 10 minutes
- AI endpoints are rate-limited per user
- File size is limited to 2.5MB

## Troubleshooting

### Photo uploads fail with "Missing R2 S3 credentials"

Make sure you've set all required secrets:
```bash
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### AI generation fails

1. Check that GEMINI_API_KEY is set:
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```
2. Verify your API key is valid at Google AI Studio
3. Check rate limits (20 requests/min per user)

### "Image too large" error

The maximum file size is 2.5MB. Compress images before uploading. Consider using:
- Browser-side compression libraries
- Image optimization tools
- Lower quality settings for photos
