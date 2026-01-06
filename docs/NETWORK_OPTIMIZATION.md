# Análisis de Peticiones Duplicadas en Red

## Problemas Identificados

### 1. `/api/users/preferences` - Múltiples llamadas duplicadas

**Causas:**
- `components/ProviderList.vue` hace su propia llamada directa en `onMounted` (líneas 99-117) en lugar de usar el composable `useUserRegion`
- `pages/index.vue` usa `useAsyncData` con `watch: [user]` que puede dispararse múltiples veces durante la inicialización
- Múltiples componentes/páginas hacen la misma llamada sin compartir estado:
  - `pages/index.vue`
  - `pages/preferences.vue`
  - `pages/lists.vue`
  - `pages/onboarding.vue`
  - `components/ProviderList.vue`

**Impacto:**
- Se observan 8-9 llamadas duplicadas con el mismo timestamp en una sola carga de página
- Cada llamada consume recursos del servidor y aumenta el tiempo de carga

### 2. `/api/titles/spanish-title` - Llamadas repetidas en loop

**Causas:**
- `utils/providerLinks.ts` - `generateProviderSearchUrl` se llama dentro de un loop en `ProviderList.vue` (líneas 123-168)
- Si hay múltiples proveedores, se hace la misma llamada para cada proveedor
- No hay cache para esta petición

**Impacto:**
- Se observan 7-8 llamadas duplicadas para el mismo `tmdb_id` y `type`
- Si hay 7 proveedores, se hacen 7 llamadas idénticas

## Soluciones Propuestas

### Solución 1: Usar `useUserRegion` en `ProviderList.vue`

**Archivo:** `components/ProviderList.vue`

**Cambio:**
- Reemplazar la llamada directa a `/api/users/preferences` (líneas 99-117) por el uso del composable `useUserRegion`
- El composable ya tiene cache implementado con `useState`

**Beneficio:**
- Reduce las llamadas duplicadas de `/api/users/preferences`
- Reutiliza el cache existente

### Solución 2: Cache para `/api/titles/spanish-title`

**Archivo:** `utils/providerLinks.ts`

**Cambio:**
- Agregar un cache usando `useState` para almacenar los títulos en español por `tmdb_id` y `type`
- Hacer la llamada una sola vez antes del loop en `ProviderList.vue` y pasar el resultado a `generateProviderSearchUrl`

**Alternativa:**
- Modificar `generateProviderSearchUrl` para aceptar el título en español como parámetro opcional
- Hacer la llamada una sola vez en `ProviderList.vue` antes del loop

**Beneficio:**
- Reduce las llamadas duplicadas de `/api/titles/spanish-title` de N (número de proveedores) a 1

### Solución 3: Optimizar `useAsyncData` en `pages/index.vue`

**Archivo:** `pages/index.vue`

**Cambio:**
- Usar una clave compartida para `useAsyncData` que permita reutilizar el estado entre componentes
- O mejor aún, usar `useUserRegion` que ya tiene cache implementado

**Beneficio:**
- Evita llamadas duplicadas durante la inicialización
- Mejora la consistencia del estado entre componentes

### Solución 4: Crear un composable centralizado para preferencias

**Nuevo archivo:** `composables/useUserPreferences.ts`

**Funcionalidad:**
- Centralizar todas las llamadas a `/api/users/preferences`
- Usar `useState` para cache compartido
- Proporcionar métodos reactivos para acceder a las preferencias

**Beneficio:**
- Un solo punto de acceso para las preferencias del usuario
- Cache compartido entre todos los componentes
- Fácil de mantener y extender

## Priorización

1. **Alta prioridad:** Solución 2 (cache para spanish-title) - Impacto inmediato y fácil de implementar
2. **Alta prioridad:** Solución 1 (usar useUserRegion en ProviderList) - Reutiliza código existente
3. **Media prioridad:** Solución 4 (composable centralizado) - Mejora arquitectura a largo plazo
4. **Baja prioridad:** Solución 3 (optimizar useAsyncData) - Mejora menor pero importante

## Estimación de Reducción

- **`/api/users/preferences`:** De ~8-9 llamadas a 1-2 llamadas (reducción del 80-90%)
- **`/api/titles/spanish-title`:** De N llamadas (número de proveedores) a 1 llamada (reducción del 85-90% en casos típicos)

## Reglas Generales de Optimización de Red

### ❌ Prohibiciones

- **Ningún fetch duplicado en `onMounted`**: Los componentes no deben hacer llamadas directas a APIs en `onMounted` si existe un composable que ya lo hace.
- **Ninguna llamada idéntica dentro de loops**: Si una llamada a API no varía por iteración, debe hacerse una sola vez antes del loop y pasarse como parámetro.

### ✅ Buenas Prácticas

- **Fetch único → cache → consumo desde componentes**: Los composables deben hacer el fetch una vez, cachear el resultado, y los componentes consumen desde el cache.
- **Composables = fuente de verdad, componentes = consumidores**: Los composables son responsables de obtener y cachear datos. Los componentes solo consumen.

### Reglas Específicas

1. **`/api/users/preferences`**:
   - ❌ Ningún componente debe llamar directamente a `/api/users/preferences`
   - ✅ Usar exclusivamente el composable `useUserRegion` o un composable centralizado de preferencias
   - ✅ Si `useUserRegion` no cubre algún caso, ajustarlo, no duplicar lógica

2. **`/api/titles/spanish-title`**:
   - ❌ No se permiten llamadas en bucle para datos que no varían por proveedor
   - ✅ Resolver el título español una sola vez por `tmdb_id + type` antes de iterar proveedores
   - ✅ Usar cache en memoria (por ejemplo con `useState` o un map interno en el composable)

## Implementación Realizada

### ✅ Solución 1: `/api/users/preferences` - COMPLETADA

**Cambios en `components/ProviderList.vue`:**
- ❌ Eliminada la llamada directa a `/api/users/preferences` en `onMounted` (líneas 98-117)
- ✅ Ahora usa exclusivamente `useUserRegion()` que tiene cache implementado
- ✅ Cumple con la regla: ningún componente llama directamente a `/api/users/preferences`

### ✅ Solución 2: `/api/titles/spanish-title` - COMPLETADA

**Cambios en `components/ProviderList.vue`:**
- ✅ La llamada a `/api/titles/spanish-title` se hace UNA SOLA VEZ antes del loop
- ✅ Se usa cache con `useState` para evitar llamadas duplicadas entre diferentes instancias del componente
- ✅ El título en español se pasa como parámetro a `generateProviderSearchUrl` para evitar llamadas dentro de la función

**Cambios en `utils/providerLinks.ts`:**
- ✅ `generateProviderSearchUrl` ahora acepta `spanishTitle` como parámetro opcional
- ✅ Si se proporciona `spanishTitle`, no hace la llamada a la API
- ✅ Esto evita llamadas duplicadas cuando se genera la URL para múltiples proveedores

