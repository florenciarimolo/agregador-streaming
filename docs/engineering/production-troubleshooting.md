# Production Troubleshooting

## Problem: Session started but recommendations and history are not visible

### Possible Causes and Solutions

#### 1. **Missing `SUPABASE_SERVICE_ROLE_KEY` in production**

**Problem**: If not configured, the `anonKey` is used which has RLS (Row Level Security) restrictions that can block queries.

**Solution**:

1. Go to your Supabase project → Settings → API
2. Copy the **Service Role Key** (⚠️ NEVER expose it in the client)
3. Add it as an environment variable in your production platform:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

**Important**: The Service Role Key bypasses RLS policies, so it's safe to use on the server but should NEVER be in client code.

#### 2. **Supabase cookies are not sent in production**

**Problem**: In production, cookies may not work due to:

- Domain/cross-origin configuration
- HTTPS vs HTTP
- SameSite cookie configuration

**Solution**: The code already has a fallback that uses the `Authorization` header with the token. Verify that:

- The token is being sent correctly from the client
- Check server logs to see if "User from Authorization header" appears

#### 3. **Check production logs**

I've added detailed logging. Check server logs to see:

- `[Recommendations] User from cookies: ...` or `[Recommendations] User from Authorization header: ...`
- `[Recommendations] User likes count: X`
- `[Recommendations] WARNING: Using anon key instead of service role key`

#### 4. **Verify environment variables in production**

Make sure these variables are configured:

```env
NUXT_PUBLIC_SUPABASE_URL=your_supabase_url
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ⚠️ CRITICAL for production
NUXT_TMDB_API_KEY=your_tmdb_key
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
NUXT_PUBLIC_BASE_URL=https://your-domain.com
```

#### 5. **Verify RLS policies in Supabase**

If you can't use the Service Role Key, verify that RLS policies allow:

- Reading `user_likes` for the authenticated user
- Reading `user_title_status` for the authenticated user
- Reading `titles` (can be public)

Example RLS policy:

```sql
-- Allow users to read their own likes
CREATE POLICY "Users can read own likes"
ON user_likes FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to read their own history
CREATE POLICY "Users can read own history"
ON user_title_status FOR SELECT
USING (auth.uid() = user_id);
```

#### 6. **Verify user has data**

In logs you should see:

- `[Recommendations] User likes count: X` - If it's 0, the user has no likes
- `[User History] Statuses count: X` - If it's 0, the user has no history

If counts are 0, the problem is not technical but the user simply has no data.

### Debugging Steps

1. **Check server logs in production** to see what's happening
2. **Verify environment variables** - especially `SUPABASE_SERVICE_ROLE_KEY`
3. **Open browser console** and verify that requests to `/api/recommendations` are being made
4. **Check request responses** in the browser Network tab
5. **Verify token is being sent** in the `Authorization` header

### Useful debugging commands

In production, you can temporarily add more logging or verify:

- That the user is correctly authenticated
- That requests reach the server
- That Supabase queries don't fail due to RLS
