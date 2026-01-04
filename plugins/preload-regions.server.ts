/**
 * Server-side plugin to preload regions during SSR
 * This ensures regions are cached and available for all server-rendered components
 * Uses default language for initial load
 */
export default defineNuxtPlugin(async () => {
  const { loadRegions } = useRegions();
  const { DEFAULT_LANGUAGE } = await import('@/constants/languages');
  
  // Preload regions during SSR with default language
  // This will fetch from API if not cached, or use cache if available
  // Components will load regions for the correct app language when they mount
  await loadRegions(DEFAULT_LANGUAGE);
});

