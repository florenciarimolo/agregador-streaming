// Nitro plugin to initialize localStorage polyfill at server startup
// This MUST run before any modules are imported, including Vue devtools

// Import polyfill utility to ensure it runs when this module loads
import '../utils/localStorage-polyfill';

// Also ensure it's set up when the plugin runs (defensive)
// defineNitroPlugin is auto-imported by Nuxt at runtime
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - defineNitroPlugin is auto-imported by Nuxt
export default defineNitroPlugin(() => {
  // This plugin runs early to ensure localStorage is polyfilled
  // We check for getItem to ensure localStorage is fully functional
  const needsPolyfill =
    typeof globalThis.localStorage === 'undefined' ||
    typeof globalThis.localStorage.getItem !== 'function';

  if (needsPolyfill) {
    const storage: Record<string, string> = {};

    globalThis.localStorage = {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index: number) => {
        const keys = Object.keys(storage);
        return keys[index] || null;
      },
    } as Storage;
  }
});
