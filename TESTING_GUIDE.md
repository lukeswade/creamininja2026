# Manual Testing Guide for Photo Uploads and AI Generation

This guide provides step-by-step instructions to manually test the photo upload and AI generation features.

## Prerequisites

1. **Local Development Setup**
   ```bash
   # Install dependencies
   pnpm install
   
   # Setup local D1 database
   cd apps/api
   pnpm db:local:setup
   
   # Seed with demo data (optional)
   pnpm db:seed:local
   ```

2. **Environment Configuration**

   For API (`apps/api`):
   - Set up `.dev.vars` file with:
     ```
     SESSION_SIGNING_SECRET=your-secret-here
     GEMINI_API_KEY=your-gemini-api-key
     R2_ACCESS_KEY_ID=your-r2-access-key
     R2_SECRET_ACCESS_KEY=your-r2-secret-key
     TURNSTILE_BYPASS=true
     ```

   For Web (`apps/web`):
   - Copy `.env.example` to `.env` (if exists) or create with:
     ```
     VITE_API_BASE=http://localhost:8787
     ```

3. **Start Development Servers**
   ```bash
   # Terminal 1: Start API
   cd apps/api
   pnpm dev
   
   # Terminal 2: Start Web
   cd apps/web
   pnpm dev
   ```

## Test Cases

### Test 1: Photo Upload for Recipe

**Steps:**
1. Open http://localhost:5173 in your browser
2. Register a new account or login
3. Navigate to "Create Recipe" page
4. Fill in required fields:
   - Title: "Test Recipe"
   - Category: Select "Ice Cream"
5. Click the "Photo" file input
6. Select a JPEG/PNG/WebP image (< 2.5MB)
7. Verify the image preview appears below the file input
8. Click "Save recipe"

**Expected Results:**
- Photo uploads successfully
- Preview displays correctly
- Recipe saves with the photo
- No console errors

**Potential Issues:**
- "Missing R2 S3 credentials" → R2 secrets not configured
- "Upload failed" → Check file size (< 2.5MB) and format (JPEG/PNG/WebP)
- CORS errors → Check API CORS configuration

---

### Test 2: AI Generation from Ingredients

**Steps:**
1. Navigate to "Create Recipe" page
2. Scroll to "AI assist" section
3. In the ingredients textarea, enter:
   ```
   heavy cream
   sugar
   vanilla extract
   ```
4. Ensure a category is selected (e.g., "Ice Cream")
5. Click "Generate from ingredients"
6. Wait for AI response (may take 5-10 seconds)

**Expected Results:**
- Loading state shows "Generating..."
- Recipe fields auto-fill with AI-generated content:
  - Title
  - Description
  - Ingredients list (formatted)
  - Steps list
- Category matches or is appropriate

**Potential Issues:**
- "AI generation failed" → Check GEMINI_API_KEY is set
- Rate limit error → Wait 60 seconds and retry
- Invalid schema error → AI response doesn't match expected format (retry)

---

### Test 3: AI Generation from Photo

**Steps:**
1. Navigate to "Create Recipe" page
2. Scroll to "AI assist" section
3. Under "Or generate from a photo"
4. Click the file input
5. Select a photo of ingredients (clear, well-lit photo works best)
6. Verify "Uploaded for AI: [key]" message appears
7. Ensure category is selected
8. Click "Generate from photo"
9. Wait for AI response

**Expected Results:**
- Photo uploads successfully
- AI analyzes the image and generates a recipe
- Recipe fields auto-fill with generated content
- Ingredients are inferred from the photo

**Potential Issues:**
- "Image not found" → Upload completed but key not saved correctly
- Poor results → Photo quality matters; use clear, well-lit images
- "Image too large" → Compress image to < 2.5MB

---

### Test 4: Surprise Me Feature

**Steps:**
1. Navigate to "Create Recipe" page
2. At the top, locate the purple "Surprise Me" card
3. Click "🎲 Surprise Me!"
4. Wait for AI response

**Expected Results:**
- Loading shows "✨ Summoning..."
- Recipe fields auto-fill with creative, random recipe
- Title is fun and creative
- Recipe is complete with ingredients and steps
- Category is set automatically

**Potential Issues:**
- Same as Test 2 (AI generation)
- Results are random, so content varies

---

### Test 5: Photo Upload for Avatar

**Steps:**
1. Navigate to Profile page
2. Click "Edit Profile" or avatar upload (if implemented)
3. Select an image
4. Save changes

**Expected Results:**
- Avatar uploads successfully
- New avatar displays immediately
- Avatar persists after page refresh

**Note:** Avatar upload UI may not be fully implemented yet.

---

### Test 6: Recipe Photo Access Control

**Steps:**
1. Create a recipe with a photo (visibility: Private)
2. Note the recipe ID
3. Copy the photo URL from developer tools
4. Open an incognito window
5. Try to access the photo URL directly

**Expected Results:**
- Photo access is denied (403 Forbidden)
- Only authenticated users with proper permissions can view

---

## API Endpoint Testing (with curl)

### Test Presign Endpoint

```bash
# 1. Get session cookie (login first)
curl -c cookies.txt -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Get CSRF token
curl -b cookies.txt http://localhost:8787/auth/me

# 3. Request presigned URL
curl -b cookies.txt -X POST http://localhost:8787/uploads/presign \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -d '{"kind":"recipe","contentType":"image/jpeg","bytes":50000}'
```

### Test AI from Ingredients

```bash
curl -b cookies.txt -X POST http://localhost:8787/ai/from-ingredients \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -d '{
    "ingredients": ["heavy cream", "sugar", "vanilla"],
    "category": "Ice Cream",
    "creativity": "balanced"
  }'
```

### Test Surprise Me

```bash
curl -b cookies.txt -X POST http://localhost:8787/ai/surprise \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: YOUR_CSRF_TOKEN" \
  -d '{}'
```

---

## Performance Benchmarks

- Photo upload (presign request): < 100ms
- Photo upload (to R2): 500ms - 2s (depends on file size and network)
- AI generation from ingredients: 2-8 seconds
- AI generation from photo: 3-10 seconds
- Surprise Me: 2-8 seconds

---

## Common Issues & Solutions

### 1. CORS Errors
**Solution:** Ensure `APP_ORIGIN` in `wrangler.toml` matches your frontend URL.

### 2. R2 Credentials Missing
**Solution:** Set secrets in `.dev.vars` for local dev or use `wrangler secret put` for production.

### 3. AI Generation Slow/Timeout
**Solution:** Gemini API can be slow sometimes. Consider adding loading indicators and timeouts.

### 4. Image Quality Issues
**Solution:** Implement client-side compression using libraries like `browser-image-compression`.

### 5. Rate Limiting
**Solution:** Current rate limit is 20 requests/min per user. Wait or adjust limits in `rateLimit.ts`.

---

## Next Steps

After testing, consider implementing:
1. Client-side image compression
2. Progress indicators for uploads
3. Image cropping/editing tools
4. Retry logic for failed AI requests
5. Caching AI responses
6. Better error messages for users
7. Unit and integration tests

---

## Checklist

Use this checklist during testing:

- [ ] Photo upload works for recipes
- [ ] Photo preview displays correctly
- [ ] AI generates recipe from ingredients
- [ ] AI generates recipe from photo
- [ ] Surprise Me generates creative recipes
- [ ] Access control prevents unauthorized photo access
- [ ] Error messages are clear and helpful
- [ ] Loading states provide good UX
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Mobile experience is good (if applicable)
