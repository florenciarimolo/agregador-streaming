/**
 * Composable to generate canonical URL for SEO
 * Each page has canonical pointing to itself (with its language)
 *
 * Rules:
 * - Canonical must point to the page itself
 * - Must include language prefix /:lang
 * - Must NOT include query params (?utm, ?ref, etc.)
 * - Must NOT include hashes (#)
 * - Must be deterministic (no cookies, no user-dependent)
 */

/**
 * Get canonical URL for current page
 * @returns Full canonical URL (e.g., 'https://example.com/es/movie/123')
 */
export const useCanonical = () => {
  const route = useRoute();
  const config = useRuntimeConfig();

  // Get base URL (remove trailing slash if present)
  // CRITICAL: baseUrl must NOT end with / to prevent // when concatenating
  const baseUrl = (config.public.baseUrl || '').replace(/\/$/, '');

  // Get path from route (includes language prefix, but NOT query params or hashes)
  // route.path is the pathname without query or hash
  // CRITICAL: Ensure path starts with / to prevent missing slash
  // route.path should already start with /, but we normalize it for safety
  const path = route.path.startsWith('/') ? route.path : `/${route.path}`;

  // Construct canonical URL (clean, no query params, no hashes)
  // Result: baseUrl (no trailing /) + path (starts with /) = clean URL
  // Example: "https://example.com" + "/es/movie/123" = "https://example.com/es/movie/123" ✅
  const canonicalUrl = `${baseUrl}${path}`;

  return {
    canonicalUrl,
  };
};
