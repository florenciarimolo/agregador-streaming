# Supabase Local vs Remote Development

This project supports two ways to work with Supabase:

## 🏠 Local Supabase (Docker Containers)

### What it is:
- Runs Supabase **completely on your machine** using Docker containers
- Creates a local PostgreSQL database, API server, Auth server, etc.
- **No internet connection required** (once images are downloaded)
- **Free** - no usage limits
- **Fast** - no network latency

### When to use:
- **Development and testing** - Test migrations, functions, and schema changes locally
- **Offline development** - Work without internet
- **Cost savings** - Avoid using remote project quota
- **Rapid iteration** - Reset database instantly without affecting production

### Commands:

```bash
# Start local Supabase (starts Docker containers)
npm run supabase:start

# Check status of local Supabase
npm run supabase:status

# Stop local Supabase (stops Docker containers)
npm run supabase:stop

# Reset local database (applies all migrations from scratch)
npm run supabase:db:reset
```

### Local URLs (when running):
- **API URL**: `http://127.0.0.1:54321`
- **Studio (Dashboard)**: `http://127.0.0.1:54323`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

### Requirements:
- Docker Desktop installed and running
- ~2GB of disk space for Docker images

---

## ☁️ Remote Supabase (Cloud Project)

### What it is:
- Works with your **Supabase project in the cloud**
- Uses the actual production/staging database
- Requires internet connection
- Subject to Supabase plan limits (free tier has quotas)

### When to use:
- **Production deployments** - Apply migrations to production
- **Staging/testing** - Test with real cloud infrastructure
- **Team collaboration** - Share the same database with team
- **Production data** - Work with actual user data

### Commands:

```bash
# Link project to remote Supabase
npm run supabase:link

# Apply migrations to remote database
npm run supabase:db:push

# List migrations (shows local vs remote status)
npx supabase migration list --linked

# Generate migration from remote database differences
npm run supabase:db:diff --file migration_name
```

### Remote URLs:
- **API URL**: `https://xxxxx.supabase.co` (from your project)
- **Dashboard**: `https://app.supabase.com/project/xxxxx`

---

## 🔄 Workflow Recommendations

### Development Workflow (Recommended):

1. **Start with local Supabase** for rapid development:
   ```bash
   npm run supabase:start
   ```

2. **Test migrations locally**:
   ```bash
   npm run supabase:db:reset  # Apply all migrations
   ```

3. **When ready, apply to remote**:
   ```bash
   npm run supabase:db:push
   ```

### Production Workflow:

1. **Always test migrations locally first**
2. **Link to staging/remote project**
3. **Apply migrations to remote**
4. **Verify in production dashboard**

---

## ⚙️ Configuration

### Local Development:
When using `supabase:start`, update your `.env` to use local URLs:
```env
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NUXT_PUBLIC_SUPABASE_ANON_KEY=<local_anon_key>
```

The local anon key is shown when you run `supabase:start` or `supabase:status`.

### Remote Development:
Use your remote project credentials:
```env
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<your_remote_anon_key>
```

---

## 🎯 Summary

| Feature | Local (`start/stop`) | Remote (`link`) |
|---------|---------------------|-----------------|
| **Location** | Your machine (Docker) | Supabase cloud |
| **Internet** | Not required | Required |
| **Cost** | Free | Plan limits |
| **Speed** | Very fast | Network dependent |
| **Use case** | Development/Testing | Production/Staging |
| **Data persistence** | Resets easily | Permanent |
| **Team sharing** | No | Yes |

---

## 📚 References

- [Supabase Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

