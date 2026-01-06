# Required Environment Variables

## MANDATORY Variables for Production

### Supabase (Backend and Authentication)

```env
# Your Supabase project URL
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Anon/Public Key (can be in client)
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ SERVICE ROLE KEY (CRITICAL - Server only, NEVER in client)
# This is the variable that is probably missing and causing the issue
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### TMDB API (Movie and series data)

```env
# TMDB API Key
NUXT_TMDB_API_KEY=your_tmdb_api_key

# TMDB Base URL (optional, has default value)
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
```

### Resend (Email service)

```env
# Resend API Key (Server only, NEVER in client)
# Used for sending transactional emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Base URL (Optional but recommended)

```env
# Your application URL - used for SEO, sitemap, robots.txt, canonical URLs, and hreflang tags
# If not defined, it's automatically detected based on environment:
# - Local: http://localhost:3000
# - Preview (Vercel): https://up-next-dev.vercel.app
# - Production (Vercel): https://getupnext.io
# 
# IMPORTANT: This URL is used for:
# - Generating canonical URLs with language prefixes (e.g., https://getupnext.io/es/movie/123)
# - Generating hreflang tags for multi-language SEO
# - Sitemap generation (multi-language URLs)
NUXT_PUBLIC_BASE_URL=https://getupnext.io
```

**Note**: This variable is optional. The system automatically detects the environment using:
1. `NUXT_PUBLIC_BASE_URL` (if defined - **recommended**)
2. `VERCEL_URL` (in Vercel deployments)
3. `VERCEL_ENV` (production/preview)
4. `http://localhost:3000` (default in local)

## Summary

### ✅ Variables you MUST have in production:

1. `NUXT_PUBLIC_SUPABASE_URL` ✅
2. `NUXT_PUBLIC_SUPABASE_ANON_KEY` ✅
3. `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **THIS IS THE ONE THAT'S PROBABLY MISSING**
4. `NUXT_TMDB_API_KEY` ✅
5. `NUXT_TMDB_BASE_URL` (optional, has default) ✅
6. `RESEND_API_KEY` (optional, only if using email features) ✅
7. `NUXT_PUBLIC_BASE_URL` (optional, has default) ✅

### ❌ Variables you DON'T need:

- No additional variables are needed

## How to get SUPABASE_SERVICE_ROLE_KEY

1. Go to your project in [Supabase Dashboard](https://app.supabase.com)
2. Go to **Settings** → **API**
3. Find the **Project API keys** section
4. Copy the **`service_role` key** (⚠️ NOT the `anon` key)
5. Add it as an environment variable in your production platform

## ⚠️ IMPORTANT

- **`SUPABASE_SERVICE_ROLE_KEY`**:
  - ✅ Use it ONLY on the server (server/api/*)
  - ❌ NEVER expose it in the client
  - ✅ Bypasses RLS policies, so it's necessary for recommendations and history to work

- **`NUXT_PUBLIC_SUPABASE_ANON_KEY`**:
  - ✅ Can be in the client (that's why it has `PUBLIC_`)
  - ✅ Has RLS restrictions, that's why it doesn't work well for server queries

- **`RESEND_API_KEY`**:
  - ✅ Use it ONLY on the server (server/api/*, server/utils/*)
  - ❌ NEVER expose it in the client
  - ✅ Required for sending transactional emails via Resend

## Verification

After adding `SUPABASE_SERVICE_ROLE_KEY`, check production logs. You should see:

- ✅ `[Recommendations] User from cookies: ...` or `[Recommendations] User from Authorization header: ...`
- ✅ `[Recommendations] User likes count: X`
- ❌ You should NOT see: `[Recommendations] WARNING: Using anon key instead of service role key`

