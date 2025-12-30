# Solución de Problemas en Producción

## Problema: Sesión iniciada pero no se ven recomendaciones ni historial

### Posibles Causas y Soluciones

#### 1. **Falta `SUPABASE_SERVICE_ROLE_KEY` en producción**

**Problema**: Si no está configurado, se usa la `anonKey` que tiene restricciones RLS (Row Level Security) que pueden bloquear las consultas.

**Solución**:

1. Ve a tu proyecto de Supabase → Settings → API
2. Copia el **Service Role Key** (⚠️ NUNCA lo expongas en el cliente)
3. Añádelo como variable de entorno en tu plataforma de producción:
   ```
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

**Importante**: El Service Role Key bypassa las políticas RLS, por lo que es seguro usarlo en el servidor pero NUNCA debe estar en el código del cliente.

#### 2. **Las cookies de Supabase no se envían en producción**

**Problema**: En producción, las cookies pueden no funcionar debido a:

- Configuración de dominio/cross-origin
- HTTPS vs HTTP
- Configuración de SameSite en cookies

**Solución**: El código ya tiene un fallback que usa el header `Authorization` con el token. Verifica que:

- El token se esté enviando correctamente desde el cliente
- Revisa los logs del servidor para ver si aparece "User from Authorization header"

#### 3. **Verificar logs en producción**

He añadido logging detallado. Revisa los logs del servidor para ver:

- `[Recommendations] User from cookies: ...` o `[Recommendations] User from Authorization header: ...`
- `[Recommendations] User likes count: X`
- `[Recommendations] WARNING: Using anon key instead of service role key`

#### 4. **Verificar variables de entorno en producción**

Asegúrate de que estas variables estén configuradas:

```env
NUXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NUXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # ⚠️ CRÍTICO para producción
NUXT_TMDB_API_KEY=tu_tmdb_key
NUXT_TMDB_BASE_URL=https://api.themoviedb.org/3
NUXT_PUBLIC_BASE_URL=https://tu-dominio.com
```

#### 5. **Verificar políticas RLS en Supabase**

Si no puedes usar el Service Role Key, verifica que las políticas RLS permitan:

- Lectura de `user_likes` para el usuario autenticado
- Lectura de `user_title_status` para el usuario autenticado
- Lectura de `titles` (puede ser pública)

Ejemplo de política RLS:

```sql
-- Permitir que usuarios lean sus propios likes
CREATE POLICY "Users can read own likes"
ON user_likes FOR SELECT
USING (auth.uid() = user_id);

-- Permitir que usuarios lean su propio historial
CREATE POLICY "Users can read own history"
ON user_title_status FOR SELECT
USING (auth.uid() = user_id);
```

#### 6. **Verificar que el usuario tenga datos**

En los logs deberías ver:

- `[Recommendations] User likes count: X` - Si es 0, el usuario no tiene likes
- `[User History] Statuses count: X` - Si es 0, el usuario no tiene historial

Si los counts son 0, el problema no es técnico sino que el usuario simplemente no tiene datos.

### Pasos de Debugging

1. **Revisa los logs del servidor en producción** para ver qué está pasando
2. **Verifica las variables de entorno** - especialmente `SUPABASE_SERVICE_ROLE_KEY`
3. **Abre la consola del navegador** y verifica que las peticiones a `/api/recommendations` y `/api/user-history` se estén haciendo
4. **Revisa la respuesta de las peticiones** en la pestaña Network del navegador
5. **Verifica que el token se esté enviando** en el header `Authorization`

### Comandos útiles para debugging

En producción, puedes añadir temporalmente más logging o verificar:

- Que el usuario esté autenticado correctamente
- Que las peticiones lleguen al servidor
- Que las consultas a Supabase no fallen por RLS
