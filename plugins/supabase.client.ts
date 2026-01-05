/**
 * Supabase client plugin
 *
 * This plugin is now empty - Supabase client is provided by @nuxtjs/supabase module.
 * Auth initialization is handled by useAuthInit() composable in components.
 *
 * Architecture rules:
 * - Plugins should not depend on Pinia stores
 * - Auth initialization happens in components via composables
 * - Pinia is client-only and should only be accessed from components
 *
 * This file can be deleted if not needed, but keeping it for documentation purposes.
 */
export default defineNuxtPlugin(() => {
  // Plugin is empty - Supabase is provided by @nuxtjs/supabase
  // Auth initialization happens in app.vue via useAuthInit()
});
