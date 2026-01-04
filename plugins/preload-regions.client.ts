/**
 * Client-side plugin to preload regions on app initialization
 * This ensures regions are always available before components need them
 * Loads regions for app language (i18n locale) or default language
 */
export default defineNuxtPlugin(async () => {
  const { loadRegions } = useRegions();
  const { DEFAULT_LANGUAGE } = await import('@/constants/languages');
  
  // Preload regions immediately when the app starts
  // Use default language since i18n might not be ready yet in plugin context
  // Components will reload with correct language when they mount
  // This will use the server-side cache if available
  await loadRegions(DEFAULT_LANGUAGE);
});

