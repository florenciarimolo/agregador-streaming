# Supabase Setup Guide for UpNext

## Phase 1: Foundation Setup

This guide will help you set up Supabase for the UpNext application.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - **Name**: UpNext (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Create a `.env` file in the project root (if it doesn't exist)
2. Add your Supabase credentials:

```env
NUXT_PUBLIC_SUPABASE_URL=your_project_url_here
NUXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Existing TMDB config
NUXT_TMDB_API_KEY=your_tmdb_key
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
```

## Step 4: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify tables were created:
   - Go to **Table Editor** → You should see:
     - `profiles`
     - `titles`
     - `user_likes`

## Step 5: Configure Authentication

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. For production, add your production URL

## Step 6: Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure email templates if needed (optional)

## Step 7: Test the Setup

1. Start your dev server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/login`
3. Try signing up with a test email
4. Check your email for the confirmation link (or magic link)
5. Complete the onboarding flow

## Database Schema Overview

### `profiles` table

- Extends Supabase's `auth.users`
- Stores user profile data
- Tracks onboarding completion

### `titles` table

- Stores movie/TV show data from TMDB
- References TMDB IDs for syncing
- Includes metadata (poster, overview, genres, etc.)

### `user_likes` table

- Links users to titles they like
- Enforces max 10 likes per user (application-level)
- Used for recommendations in Phase 2

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **profiles**: Users can only read/update their own profile
- **titles**: Public read access, authenticated insert
- **user_likes**: Users can only manage their own likes

## Troubleshooting

### "Invalid API key" error

- Double-check your `.env` file has the correct keys
- Ensure keys are prefixed with `NUXT_PUBLIC_` for client-side access
- Restart your dev server after changing `.env`

### "Table doesn't exist" error

- Make sure you ran the SQL schema in Step 4
- Check the Table Editor to verify tables exist

### Auth redirect not working

- Verify redirect URLs in Supabase dashboard
- Check that `NUXT_PUBLIC_SUPABASE_URL` matches your project URL

### Profile not created on signup

- Check the `handle_new_user` trigger was created
- Verify in SQL Editor: `SELECT * FROM auth.users;`
- Check Supabase logs for errors

## Next Steps

Once Phase 1 is complete and tested:

- ✅ Users can sign up/sign in
- ✅ Users complete onboarding (select 10 titles)
- ✅ Data is stored in Supabase

You're ready for **Phase 2: Basic Recommendations**!
