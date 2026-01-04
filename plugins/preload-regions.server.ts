/**
 * Server-side plugin to preload regions during SSR
 * This ensures regions are cached and available for all server-rendered components
 * Uses default language for initial load
 */
export default defineNuxtPlugin(async () => {
  const { loadRegions } = useRegions();
  
  // Preload regions during SSR with default language
  // This will fetch from API if not cached, or use cache if available
  // User's preferred language will be loaded when components mount
  await loadRegions();
});

