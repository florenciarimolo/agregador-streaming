# Required Environment Variables

## Overview

This document explains all environment variables needed for the UpNext application, organized by scope and purpose.

## Variable Naming Conventions

Nuxt uses prefixes to control variable visibility:

- **`NUXT_PUBLIC_*`**: Exposed to both client and server via `useRuntimeConfig().public.*`
  - ✅ Safe for client-side code
  - ⚠️ Visible in browser, don't use for secrets
  
- **`NUXT_*`**: Server-only, accessible via `useRuntimeConfig().*`
  - ✅ Secrets and API keys
  - ❌ Never exposed to client

- **No prefix**: Only available in `process.env` during build/SSR
  - ✅ For modules that read directly from `process.env`
  - ❌ Not automatically available in `useRuntimeConfig()`

## Required Variables

### 1. Application Configuration

```env
# Application version (auto-populated from package.json)
NUXT_APP_VERSION=$npm_package_version

# Base URL for the application (optional, auto-detected if not set)
# Used for SEO, sitemap, robots.txt, canonical URLs, and hreflang tags
NUXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Note**: `NUXT_PUBLIC_BASE_URL` is optional. The system automatically detects the environment:
1. `NUXT_PUBLIC_BASE_URL` (if defined - **recommended**)
2. `VERCEL_URL` (in Vercel deployments)
3. `VERCEL_ENV` (production/preview)
4. `http://localhost:3000` (default in local)

---

### 2. Supabase - Public Variables

These variables are exposed to the client and used by `runtimeConfig`:

```env
# Supabase project URL (public, can be in client)
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase anon/public key (public, can be in client)
# Has RLS restrictions, safe to expose
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Used by**: `runtimeConfig.public.supabaseUrl` and `runtimeConfig.public.supabaseAnonKey`

---

### 3. Supabase - Module Variables

These variables are required by the `@nuxtjs/supabase` module, which reads them directly from `process.env`:

```env
# Required by @nuxtjs/supabase module
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Anon key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Service role key
```

**Note**: These are duplicates of the `NUXT_PUBLIC_*` and `SUPABASE_SERVICE_ROLE_KEY` variables, but they're required because the module reads them directly from `process.env` during initialization.

---

### 4. Supabase - Server Variables

These variables are used by server-side code for operations that need to bypass Row Level Security (RLS):

```env
# Service role key (CRITICAL - Server only, NEVER in client)
# Bypasses RLS policies, necessary for recommendations and history to work
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Used by**: `server/api/*` and `server/utils/*` for operations requiring elevated permissions.

**How to get it**:
1. Go to your project in [Supabase Dashboard](https://app.supabase.com)
2. Go to **Settings** → **API**
3. Find the **Project API keys** section
4. Copy the **`service_role` key** (⚠️ NOT the `anon` key)

---

### 5. TMDB API (Server-only)

```env
# TMDB API Key (Server only, NEVER in client)
NUXT_TMDB_API_KEY=your_tmdb_api_key

# TMDB Base URL (optional, has default value)
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
```

**Used by**: Server-side API routes for fetching movie and series data.

---

### 6. Resend (Email service - Server-only)

```env
# Resend API Key (Server only, NEVER in client)
# Used for sending transactional emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Used by**: `server/utils/resend.ts` for sending emails.

**Note**: Optional, only needed if using email features.

---

## Complete Example

Here's a complete `.env` file example organized by scope:

```env
# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
NUXT_APP_VERSION=$npm_package_version
NUXT_PUBLIC_BASE_URL=http://localhost:3000

# ============================================================================
# SUPABASE - PUBLIC (Available in client and server via runtimeConfig)
# ============================================================================
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# SUPABASE - MODULE (@nuxtjs/supabase module requirements)
# ============================================================================
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# SUPABASE - SERVER (Server-side operations, bypasses RLS)
# ============================================================================
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# TMDB API (Server-only, movie and series data)
# ============================================================================
NUXT_TMDB_API_KEY=your_tmdb_api_key
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3

# ============================================================================
# RESEND (Email service - Server-only)
# ============================================================================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Summary

### ✅ Variables you MUST have in production:

1. **Application**:
   - `NUXT_PUBLIC_BASE_URL` (optional, auto-detected)

2. **Supabase - Public**:
   - `NUXT_PUBLIC_SUPABASE_URL` ✅
   - `NUXT_PUBLIC_SUPABASE_ANON_KEY` ✅

3. **Supabase - Module**:
   - `SUPABASE_URL` ✅ (duplicate of `NUXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_KEY` ✅ (duplicate of `NUXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `SUPABASE_SERVICE_KEY` ✅ (duplicate of `SUPABASE_SERVICE_ROLE_KEY`)

4. **Supabase - Server**:
   - `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRITICAL**

5. **TMDB**:
   - `NUXT_TMDB_API_KEY` ✅
   - `NUXT_TMDB_BASE_URL` (optional, has default) ✅

6. **Resend**:
   - `RESEND_API_KEY` (optional, only if using email features) ✅

---

## ⚠️ IMPORTANT Security Notes

### Variables that MUST stay server-only:

- **`SUPABASE_SERVICE_ROLE_KEY`**:
  - ✅ Use it ONLY on the server (`server/api/*`, `server/utils/*`)
  - ❌ NEVER expose it in the client
  - ✅ Bypasses RLS policies, so it's necessary for recommendations and history to work

- **`SUPABASE_SERVICE_KEY`**:
  - ✅ Used by `@nuxtjs/supabase` module for server-side operations
  - ❌ NEVER expose it in the client
  - ⚠️ Same value as `SUPABASE_SERVICE_ROLE_KEY`, but required by the module

- **`NUXT_TMDB_API_KEY`**:
  - ✅ Server-only (has `NUXT_` prefix, not `NUXT_PUBLIC_`)
  - ❌ NEVER expose it in the client

- **`RESEND_API_KEY`**:
  - ✅ Use it ONLY on the server (`server/api/*`, `server/utils/*`)
  - ❌ NEVER expose it in the client

### Variables that are safe for client:

- **`NUXT_PUBLIC_SUPABASE_URL`**:
  - ✅ Can be in the client (that's why it has `PUBLIC_`)
  - ✅ Used for client-side Supabase operations

- **`NUXT_PUBLIC_SUPABASE_ANON_KEY`**:
  - ✅ Can be in the client (that's why it has `PUBLIC_`)
  - ✅ Has RLS restrictions, so it's safe to expose
  - ⚠️ Has RLS restrictions, that's why it doesn't work well for server queries

---

## Why Duplicates?

You might notice that some variables appear to be duplicates:

- `NUXT_PUBLIC_SUPABASE_URL` vs `SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY` vs `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SERVICE_KEY`

**This is intentional**:

1. **`NUXT_PUBLIC_*` variables**: Used by `runtimeConfig` and accessible via `useRuntimeConfig().public.*` in your code
2. **`SUPABASE_*` variables**: Required by the `@nuxtjs/supabase` module, which reads them directly from `process.env` during initialization
3. **`SUPABASE_SERVICE_ROLE_KEY`**: Used by your server code (`server/api/*`, `server/utils/*`)
4. **`SUPABASE_SERVICE_KEY`**: Required by the `@nuxtjs/supabase` module for server-side operations

All duplicates should have the **same value** - they're just accessed by different parts of the system.

---

## Verification

After setting up your environment variables, verify they're working:

### Supabase
- ✅ Check that authentication works
- ✅ Check that server-side queries work (should use `SUPABASE_SERVICE_ROLE_KEY`)
- ❌ You should NOT see: `[Recommendations] WARNING: Using anon key instead of service role key`

### TMDB
- ✅ Check that movie/series data loads correctly

### Resend (if configured)
- ✅ Check that emails are sent successfully

---

## Troubleshooting

### Module can't find Supabase variables

If you see: `Your project's URL and Key are required to create a Supabase client!`

**Solution**: Make sure you have both:
- `SUPABASE_URL` (for the module)
- `SUPABASE_KEY` (for the module)

These are required even if you have `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY`.

### Server operations failing

If server-side operations (recommendations, history) are failing:

**Solution**: Make sure you have:
- `SUPABASE_SERVICE_ROLE_KEY` (for your server code)
- `SUPABASE_SERVICE_KEY` (for the module)

Both should have the same value (your service role key from Supabase dashboard).
