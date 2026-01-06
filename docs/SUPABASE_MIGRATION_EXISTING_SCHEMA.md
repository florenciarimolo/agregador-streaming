# Initial Migration with Existing Schema

If your Supabase database already has the schema applied (for example, you applied it manually from `schema.sql`), you have two safe options:

## Option 1: Mark the migration as applied (RECOMMENDED)

This is the fastest and safest option. It marks the migration as applied without executing it:

```bash
# First, link your project (if you haven't already)
npm run supabase:link

# Then, mark the migration as applied (use only the timestamp number, not the full filename)
npx supabase migration repair 20260106131439 --status applied
```

This tells Supabase that the migration is already applied in your remote database, without executing it.

## Option 2: Apply the migration (also safe)

The initial migration has been adjusted to be idempotent (safe to run multiple times). You can try applying it:

```bash
# First, link your project
npm run supabase:link

# Then, apply the migrations
npm run supabase:db:push
```

If something fails because it already exists, you'll see specific errors that you can ignore or handle. Most commands use `IF NOT EXISTS` or `CREATE OR REPLACE`, so it should be safe.

## Verify the status

After using either option, you can verify which migrations are applied:

```bash
npx supabase migration list --linked
```

You should see your initial migration marked as applied.

## Which option to choose?

- **Option 1 (migration repair)**: Faster, doesn't execute anything, just marks as applied. Ideal if you're 100% sure the schema matches.
- **Option 2 (db push)**: Executes the migration, but it's designed to be safe. Useful if you want to make sure everything is synchronized.

Both options are safe and **will NOT delete your data**.
