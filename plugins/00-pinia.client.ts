/**
 * Pinia client-side plugin
 * Registers Pinia only on the client side to prevent SSR serialization errors
 * This ensures Pinia stores are not serialized during SSR, preventing errors on error pages (404/500)
 * 
 * IMPORTANT: This plugin must run BEFORE any other plugins that use Pinia stores
 */
import { createPinia } from 'pinia';

export default defineNuxtPlugin({
  name: 'pinia-client',
  enforce: 'pre', // Run before other plugins
  setup(nuxtApp) {
    // Only register Pinia on client side
    const pinia = createPinia();
    nuxtApp.vueApp.use(pinia);
  },
});

