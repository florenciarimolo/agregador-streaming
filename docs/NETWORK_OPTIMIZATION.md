# Network Optimization Analysis

## Critical Issues Identified

### Serialization Error (Blocks Network Request Visualization)

**File:** `composables/useUserRegion.ts` line 11

**Problem:**

```typescript
const loadingPromise = useState<Promise<string | null> | null>(
  'user-region-loading-promise',
  () => null
);
```

Promises are not POJOs (Plain Old JavaScript Objects) and cannot be serialized during SSR. This causes the error:

```
Cannot stringify arbitrary non-POJOs
path: .state["$user-region-loading-promise"]
value: [Promise<resolved>]
```

**Solution:**
✅ **FIXED** - Do not store Promises in `useState`. Instead, use a Map in client-side memory to track active promises. The Map is created at module level so it's shared across all composable instances.

**Status:** ✅ Completed

## Problems Identified

### 1. `/api/users/preferences` - Multiple duplicate calls

**Causes:**

- `components/ProviderList.vue` was making its own direct call in `onMounted` (lines 99-117) instead of using the `useUserRegion` composable
- `pages/index.vue` uses `useAsyncData` with `watch: [user]` which can trigger multiple times during initialization
- Multiple components/pages were making the same call without sharing state:
  - `pages/index.vue`
  - `pages/preferences.vue`
  - `pages/lists.vue`
  - `pages/onboarding.vue`
  - `components/ProviderList.vue`
  - `components/MediaBannerDetail.vue` (line 999)
  - `components/SeasonBannerDetail.vue` (line 392)
  - `components/MediaCarousel.vue` (line 251)

**Impact:**

- 8-9 duplicate calls with the same timestamp in a single page load
- Each call consumes server resources and increases load time

**Current Status:**

- ✅ Cache implemented with `useState`
- ✅ Serialization error fixed (Promise no longer stored in `useState`)
- ✅ Cache should work correctly after the fix

### 2. `/api/titles/spanish-title` - Repeated calls in loop

**Causes:**

- `utils/providerLinks.ts` - `generateProviderSearchUrl` was called inside a loop in `ProviderList.vue` (lines 123-168)
- If there are multiple providers, the same call was made for each provider
- No cache for this request

**Impact:**

- 7-8 duplicate calls for the same `tmdb_id` and `type`
- If there are 7 providers, 7 identical calls were made

**Status:**

- ✅ Already optimized
- ✅ Cache implemented with `useState`
- ✅ Call made ONCE before the loop
- ✅ Uses `spanishTitleLoadingPromises` to avoid concurrent calls

### 3. `/api/titles/${tmdbId}/videos` - Multiple calls for language fallback

**File:** `composables/useVideos.ts` lines 63-112

**Problem:**
The `getVideosForTitle()` function makes multiple requests in a language fallback loop:

```typescript
for (const langCode of fallbackLanguages) {
  const videos = await $fetch<Video[]>(`/api/titles/${tmdbId}/videos`, {
    query: { type, lang: langCode },
  });
  // ...
}
```

**Analysis:**

- This is intentional (language fallback)
- Makes up to 3 requests (current language → region language → English)
- Only stops when it finds videos with Trailer/Recap

**Is this a problem?**

- ⚠️ Could be optimized if the server already returns videos in multiple languages
- ⚠️ No cache between calls

**Suggested Solution:**

- Server could return videos in all available languages in a single call
- Or implement cache to avoid repeated calls with the same parameters

### 4. `/api/users/title-status` - Multiple calls after actions

**File:** `components/MediaBannerDetail.vue`

**Problem:**
`fetchTitleStatus()` is called multiple times after each action:

- After adding/removing like (line 1119)
- After changing status (line 1142)
- After undo (lines 1102, 1142, 1181, 1251, 1254, 1263, 1372, 1375, 1383)

**Analysis:**

- Some calls are necessary (after actions)
- Some could be redundant (multiple calls in the same flow)

**Suggested Solution:**

- Consolidate calls when multiple actions occur in sequence
- Use debounce if there are rapid updates

## Proposed Solutions

### Solution 1: Use `useUserRegion` in `ProviderList.vue`

**File:** `components/ProviderList.vue`

**Change:**

- Replace direct call to `/api/users/preferences` (lines 99-117) with the `useUserRegion` composable
- The composable already has cache implemented with `useState`

**Benefit:**

- Reduces duplicate calls to `/api/users/preferences`
- Reuses existing cache

### Solution 2: Cache for `/api/titles/spanish-title`

**File:** `utils/providerLinks.ts`

**Change:**

- Add cache using `useState` to store Spanish titles by `tmdb_id` and `type`
- Make the call once before the loop in `ProviderList.vue` and pass the result to `generateProviderSearchUrl`

**Alternative:**

- Modify `generateProviderSearchUrl` to accept Spanish title as optional parameter
- Make the call once in `ProviderList.vue` before the loop

**Benefit:**

- Reduces duplicate calls to `/api/titles/spanish-title` from N (number of providers) to 1

### Solution 3: Optimize `useAsyncData` in `pages/index.vue`

**File:** `pages/index.vue`

**Change:**

- Use a shared key for `useAsyncData` that allows reusing state between components
- Or better yet, use `useUserRegion` which already has cache implemented

**Benefit:**

- Avoids duplicate calls during initialization
- Improves state consistency between components

### Solution 4: Create centralized composable for preferences

**New file:** `composables/useUserPreferences.ts`

**Functionality:**

- Centralize all calls to `/api/users/preferences`
- Use `useState` for shared cache
- Provide reactive methods to access preferences

**Benefit:**

- Single point of access for user preferences
- Shared cache across all components
- Easy to maintain and extend

### Solution 5: Optimize `getVideosForTitle()`

**File:** `composables/useVideos.ts`

**Change:**

- Consider having the server return videos in multiple languages
- Or implement cache to avoid repeated calls with the same parameters

**Benefit:**

- Reduces multiple sequential calls for language fallback

### Solution 6: Optimize `fetchTitleStatus()` calls

**File:** `components/MediaBannerDetail.vue`

**Change:**

- Consolidate calls when multiple actions occur in sequence
- Consider debounce if there are rapid updates

**Benefit:**

- Reduces redundant calls after user actions

## Prioritization

1. **High priority:** Solution 2 (cache for spanish-title) - Immediate impact and easy to implement
2. **High priority:** Solution 1 (use useUserRegion in ProviderList) - Reuses existing code
3. **High priority:** Fix serialization error in `useUserRegion.ts` - Blocks proper functionality
4. **Medium priority:** Solution 5 (optimize getVideosForTitle) - Could improve performance
5. **Medium priority:** Solution 6 (optimize fetchTitleStatus) - Reduces redundant calls
6. **Medium priority:** Solution 4 (centralized composable) - Improves architecture long-term
7. **Low priority:** Solution 3 (optimize useAsyncData) - Minor but important improvement

## Estimated Reduction

- **`/api/users/preferences`:** From ~8-9 calls to 1-2 calls (80-90% reduction)
- **`/api/titles/spanish-title`:** From N calls (number of providers) to 1 call (85-90% reduction in typical cases)
- **`/api/titles/${tmdbId}/videos`:** Could reduce from up to 3 calls to 1 call if server returns multiple languages
- **`/api/users/title-status`:** Could reduce redundant calls by 30-50% with consolidation

## General Network Optimization Rules

### ❌ Prohibitions

- **No duplicate fetch in `onMounted`**: Components should not make direct API calls in `onMounted` if a composable already does it.
- **No identical calls inside loops**: If an API call doesn't vary by iteration, it should be made once before the loop and passed as a parameter.
- **No Promises in `useState`**: Promises cannot be serialized during SSR. Use Maps or WeakMaps in client-side memory instead.

### ✅ Best Practices

- **Single fetch → cache → consume from components**: Composables should fetch once, cache the result, and components consume from cache.
- **Composables = source of truth, components = consumers**: Composables are responsible for fetching and caching data. Components only consume.
- **Use module-level Maps for shared promises**: When tracking loading promises across composable instances, use Maps at module level, not in `useState`.

### Specific Rules

1. **`/api/users/preferences`**:
   - ❌ No component should call `/api/users/preferences` directly
   - ✅ Use exclusively the `useUserRegion` composable or a centralized preferences composable
   - ✅ If `useUserRegion` doesn't cover a case, adjust it, don't duplicate logic

2. **`/api/titles/spanish-title`**:
   - ❌ No calls in loops for data that doesn't vary by provider
   - ✅ Resolve Spanish title once per `tmdb_id + type` before iterating providers
   - ✅ Use in-memory cache (e.g., with `useState` or an internal map in the composable)

3. **`/api/titles/${tmdbId}/videos`**:
   - ⚠️ Current implementation makes multiple calls for language fallback (intentional)
   - 💡 Consider optimizing if server can return multiple languages in one call

4. **`/api/users/title-status`**:
   - ⚠️ Called multiple times after user actions (some may be redundant)
   - 💡 Consider consolidating calls when multiple actions occur in sequence

## Implementation Status

### ✅ Solution 1: `/api/users/preferences` - COMPLETED

**Changes in `components/ProviderList.vue`:**

- ❌ Removed direct call to `/api/users/preferences` in `onMounted` (lines 98-117)
- ✅ Now uses exclusively `useUserRegion()` which has cache implemented
- ✅ Follows the rule: no component calls `/api/users/preferences` directly

**Changes in `composables/useUserRegion.ts`:**

- ✅ Fixed serialization error by using module-level Map instead of `useState` for loading promises
- ✅ Cache now works correctly without SSR serialization issues

### ✅ Solution 2: `/api/titles/spanish-title` - COMPLETED

**Changes in `components/ProviderList.vue`:**

- ✅ Call to `/api/titles/spanish-title` is made ONCE before the loop
- ✅ Uses cache with `useState` to avoid duplicate calls between different component instances
- ✅ Spanish title is passed as parameter to `generateProviderSearchUrl` to avoid calls inside the function

**Changes in `utils/providerLinks.ts`:**

- ✅ `generateProviderSearchUrl` now accepts `spanishTitle` as optional parameter
- ✅ If `spanishTitle` is provided, it doesn't make the API call
- ✅ This avoids duplicate calls when generating URL for multiple providers

### ⚠️ Solution 5: `/api/titles/${tmdbId}/videos` - PENDING

**Status:** Identified for optimization

- Current implementation makes up to 3 calls for language fallback
- Could be optimized if server returns multiple languages in one call
- Or implement cache to avoid repeated calls

### ⚠️ Solution 6: `/api/users/title-status` - PENDING

**Status:** Identified for optimization

- Multiple calls after user actions
- Some calls may be redundant
- Could be optimized with consolidation or debounce

## Notes

- The serialization error was blocking proper visualization of network requests
- Many of the "duplications" identified are intentional (fallbacks, updates after actions)
- Cache is already implemented in several places, but needed the Promise fix to work correctly
- After fixing the serialization error, verify actual requests in the browser to confirm if there are real duplications or only theoretical ones
