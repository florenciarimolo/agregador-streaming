# Supabase Edge Functions

This document explains how Edge Functions work in this project, how to develop them, and how to deploy them.

## Overview

Supabase Edge Functions are serverless functions that run on Deno runtime. They are used in this project to handle heavy, asynchronous operations that should not block user requests.

## Architecture

### Why Edge Functions?

Edge Functions are used to separate **user-facing operations** from **background processing**:

- **User-facing operations** (endpoints): Must respond quickly (<200ms)
- **Background processing** (Edge Functions): Can take seconds without affecting UX

### Current Edge Functions

#### `process-title-status`

**Purpose**: Handles all heavy recommendation logic asynchronously when a user updates a title status.

**Triggered by**: `POST /api/users/title-status`

**What it does**:
- Updates `preference_score` in recommendation pool
- Propagates influence to similar titles (based on shared genres)
- Removes titles from pool when marked as `not_interested`
- Detects extreme behavior and performs soft reset if needed

**Payload**:
```typescript
{
  userId: string;
  tmdb_id: number;
  type: 'movie' | 'tv';
  status: 'seen' | 'not_interested' | 'watchlist';
  liked?: boolean;
  previousStatus?: {
    status: string;
    liked?: boolean;
  };
}
```

**Performance**: Runs asynchronously (fire-and-forget), does not block user request.

## Development

### Local Development

1. **Start local Supabase** (includes Edge Functions runtime):
   ```bash
   npm run supabase:start
   ```

2. **Serve Edge Functions locally**:
   ```bash
   npx supabase functions serve process-title-status
   ```

3. **Test locally**:
   - Edge Function will be available at: `http://127.0.0.1:54321/functions/v1/process-title-status`
   - Use the local Supabase URL and service role key for testing

### Project Structure

```
supabase/
└── functions/
    └── process-title-status/
        └── index.ts          # Edge Function code
```

### Writing Edge Functions

Edge Functions use **Deno runtime**, not Node.js. Key differences:

1. **Imports**: Use ESM URLs, not npm packages
   ```typescript
   // ✅ Correct (Deno)
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   // ❌ Wrong (Node.js)
   import { createClient } from '@supabase/supabase-js';
   ```

2. **Environment Variables**: Access via `Deno.env.get()`
   ```typescript
   const supabaseUrl = Deno.env.get('SUPABASE_URL');
   const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
   ```

3. **Entry Point**: Use `Deno.serve()` to handle requests
   ```typescript
   Deno.serve(async (req) => {
     // Handle request
     return new Response(JSON.stringify({ success: true }), {
       status: 200,
       headers: { 'Content-Type': 'application/json' }
     });
   });
   ```

### Environment Variables

Edge Functions automatically have access to some variables, but you need to set others manually:

**Automatically Available** (set by Supabase):
- `SUPABASE_URL`: Your Supabase project URL (✅ already available)
- `SUPABASE_ANON_KEY`: Anon/public key (✅ already available)

**Must Set Manually** (required for this function):
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for full database access (⚠️ **MUST SET THIS**)

**What to do**:
1. Go to **Project Settings** → **Edge Functions** → **Secrets** in Supabase Dashboard
2. You'll see `SUPABASE_URL` and `SUPABASE_ANON_KEY` already set (these are fine, leave them)
3. **Add** `SUPABASE_SERVICE_ROLE_KEY` with your service role key value
   - Get it from **Settings** → **API** → **Project API keys** → **`service_role` key**

**Setting secrets in Supabase Dashboard**:
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. For `SUPABASE_SERVICE_ROLE_KEY`: Click **Add new secret**
3. Name: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: Your service role key (from Settings → API)
5. Click **Save**

**Setting secrets via CLI** (for local development):
```bash
npx supabase secrets set SUPABASE_URL=your_url
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

## Deployment

### Deploy Single Function

```bash
npm run supabase:functions:deploy:process-title-status
```

Or using npx directly:
```bash
npx supabase functions deploy process-title-status
```

### Deploy All Functions

```bash
npm run supabase:functions:deploy
```

Or:
```bash
npx supabase functions deploy
```

### Deployment Requirements

1. **Linked Project**: Must be linked to remote Supabase project
   ```bash
   npm run supabase:link
   ```

2. **Authentication**: Must be logged in to Supabase CLI
   ```bash
   npx supabase login
   ```

3. **Environment Variables**: Must be set in Supabase Dashboard (see above)

### Verify Deployment

After deployment, you can:
- Check deployment status in [Supabase Dashboard](https://supabase.com/dashboard)
- View function logs in Dashboard → **Edge Functions** → **Logs**
- Test the function using the Supabase API URL

## Calling Edge Functions

### From Server Endpoints

Edge Functions are called asynchronously (fire-and-forget) to avoid blocking:

```typescript
// Don't await - let it run in background
fetch(`${supabaseUrl}/functions/v1/process-title-status`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
}).catch((error) => {
  // Log error but don't fail the request
  console.error('Error calling Edge Function:', error);
});
```

**Important**: 
- Never `await` the fetch call
- Always handle errors with `.catch()`
- Edge Function failures should not affect user experience

### Authentication

Edge Functions are called with `SUPABASE_SERVICE_ROLE_KEY` in the Authorization header. This gives the function full database access, bypassing Row Level Security (RLS).

## Monitoring & Debugging

### View Logs

**Supabase Dashboard**:
1. Go to **Edge Functions** → Select function → **Logs**
2. View real-time logs and errors

**CLI**:
```bash
npx supabase functions logs process-title-status
```

### Common Issues

1. **Function not found**: Verify deployment and function name
2. **Authentication errors**: Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. **Timeout errors**: Edge Functions have a default timeout (check Supabase limits)
4. **Import errors**: Ensure using Deno-compatible imports (ESM URLs)

## Best Practices

1. **Error Handling**: Always catch and log errors internally
   - Edge Functions run asynchronously, so errors don't affect UX
   - Log errors for debugging but don't expose them to callers

2. **Idempotency**: Design functions to be safe if called multiple times
   - Use database constraints and checks to prevent duplicate operations

3. **Performance**: 
   - Keep functions focused on a single responsibility
   - Use database indexes for queries
   - Batch operations when possible

4. **Security**:
   - Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
   - Validate all input data
   - Use service role key only in Edge Functions, not in client code

## References

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [Supabase CLI Functions](https://supabase.com/docs/reference/cli/supabase-functions)

