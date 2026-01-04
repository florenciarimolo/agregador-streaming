/**
 * Client-side plugin to preload regions on app initialization
 * This ensures regions are always available before components need them
 * Loads regions for user's preferred language
 */
export default defineNuxtPlugin(async () => {
  const { getRegions } = useRegions();
  
  // Preload regions immediately when the app starts
  // This will use the user's preferred language
  // This will use the server-side cache if available
  await getRegions();
});

