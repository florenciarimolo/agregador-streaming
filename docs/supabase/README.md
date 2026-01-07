# Supabase Documentation

This directory contains all documentation related to Supabase setup, migrations, and development workflows.

## Documentation Structure

- **[setup.md](./setup.md)** - Initial project setup, environment variables, and authentication configuration
- **[migrations.md](./migrations.md)** - Complete guide to working with database migrations
- **[local-vs-remote.md](./local-vs-remote.md)** - Working with local vs remote Supabase instances
- **[edge-functions.md](./edge-functions.md)** - Development, deployment, and usage of Supabase Edge Functions

## Quick Start

1. **Initial Setup**: Follow [setup.md](./setup.md) to configure your Supabase project
2. **Apply Migrations**: See [migrations.md](./migrations.md) for migration workflows
3. **Development**: Choose between local or remote development in [local-vs-remote.md](./local-vs-remote.md)

## Common Tasks

### Link Project
```bash
npm run supabase:link
```

### Apply Migrations
```bash
npm run supabase:db:push
```

### Create New Migration
```bash
npm run supabase:migration:new descriptive_name
```

### Start Local Supabase
```bash
npm run supabase:start
```

## References

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

