# Variables de Entorno Requeridas

## Variables OBLIGATORIAS para Producción

### Supabase (Backend y Autenticación)

```env
# URL de tu proyecto Supabase
NUXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Anon/Public Key (puede estar en el cliente)
NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ SERVICE ROLE KEY (CRÍTICO - Solo en servidor, NUNCA en cliente)
# Esta es la variable que probablemente falta y causa el problema
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### TMDB API (Datos de películas y series)

```env
# API Key de TMDB
NUXT_TMDB_API_KEY=tu_api_key_de_tmdb

# Base URL de TMDB (opcional, tiene valor por defecto)
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
```

### Base URL (Opcional pero recomendado)

```env
# URL de tu aplicación - se usa para SEO, sitemap y robots.txt
# Si no se define, se detecta automáticamente según el entorno:
# - Local: http://localhost:3000
# - Preview (Vercel): https://up-next-dev.vercel.app
# - Producción (Vercel): https://getupnext.io
NUXT_PUBLIC_BASE_URL=https://getupnext.io
```

**Nota**: Esta variable es opcional. El sistema detecta automáticamente el entorno usando:
1. `NUXT_PUBLIC_BASE_URL` (si está definida - **recomendado**)
2. `VERCEL_URL` (en deployments de Vercel)
3. `VERCEL_ENV` (production/preview)
4. `http://localhost:3000` (por defecto en local)

## Resumen

### ✅ Variables que DEBES tener en producción:

1. `NUXT_PUBLIC_SUPABASE_URL` ✅
2. `NUXT_PUBLIC_SUPABASE_ANON_KEY` ✅
3. `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **ESTA ES LA QUE PROBABLEMENTE FALTA**
4. `NUXT_TMDB_API_KEY` ✅
5. `NUXT_TMDB_BASE_URL` (opcional, tiene default) ✅
6. `NUXT_PUBLIC_BASE_URL` (opcional, tiene default) ✅

### ❌ Variables que NO necesitas:

- Ninguna variable adicional es necesaria

## Cómo obtener el SUPABASE_SERVICE_ROLE_KEY

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API**
3. Busca la sección **Project API keys**
4. Copia el **`service_role` key** (⚠️ NO el `anon` key)
5. Añádelo como variable de entorno en tu plataforma de producción

## ⚠️ IMPORTANTE

- **`SUPABASE_SERVICE_ROLE_KEY`**:
  - ✅ Úsala SOLO en el servidor (server/api/\*)
  - ❌ NUNCA la expongas en el cliente
  - ✅ Bypassa las políticas RLS, por lo que es necesaria para que funcionen las recomendaciones e historial

- **`NUXT_PUBLIC_SUPABASE_ANON_KEY`**:
  - ✅ Puede estar en el cliente (por eso tiene `PUBLIC_`)
  - ✅ Tiene restricciones RLS, por eso no funciona bien para las consultas del servidor

## Verificación

Después de añadir `SUPABASE_SERVICE_ROLE_KEY`, revisa los logs de producción. Deberías ver:

- ✅ `[Recommendations] User from cookies: ...` o `[Recommendations] User from Authorization header: ...`
- ✅ `[Recommendations] User likes count: X`
- ❌ NO deberías ver: `[Recommendations] WARNING: Using anon key instead of service role key`
