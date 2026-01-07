/**
 * i18n initialization plugin
 * With strategy: 'prefix', Nuxt i18n automatically derives language from URL
 * This plugin only handles legacy routes without language prefix (will be redirected)
 * 
 * CRITICAL: With prefix strategy, language comes from URL, not cookies
 */
/**
 * i18n initialization plugin (initial setup only)
 * 
 * NOTE: This plugin is now minimal - the sync-lang middleware handles all locale synchronization.
 * This plugin only exists for documentation and potential future initialization needs.
 * 
 * CRITICAL: With prefix strategy, language comes from URL, not cookies.
 * The sync-lang middleware ensures i18n.locale stays synchronized with route.params.lang.
 * 
 * IMPORTANT: We cannot use useI18n() in plugins with enforce: 'pre' because Vue context
 * is not fully initialized. The middleware/sync-lang.ts handles all locale synchronization.
 */
export default defineNuxtPlugin({
  name: 'i18n-init',
  enforce: 'pre', // Run before other plugins
  setup() {
    // Plugin is intentionally minimal - sync-lang middleware handles locale sync
    // Cannot use useI18n() here because Vue context is not ready in pre-enforce plugins
    // The middleware/sync-lang.ts runs on every route change and handles synchronization
  },
});
