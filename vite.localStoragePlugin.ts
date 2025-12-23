// Vite plugin to inject localStorage polyfill before any modules load
// This is critical for SSR in development where vite-node processes modules
import type { Plugin } from 'vite';

const POLYFILL_CODE = `
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const storage = {};
  globalThis.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = value; },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    get length() { return Object.keys(storage).length; },
    key: (index) => Object.keys(storage)[index] || null,
  };
}
`;

function setupLocalStoragePolyfill() {
  // Check if localStorage is undefined OR if it exists but doesn't have getItem (Node.js 25+ issue)
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
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index: number) => Object.keys(storage)[index] || null,
    } as Storage;
  }
}

export function localStoragePolyfillPlugin(): Plugin {
  // Set up polyfill immediately when plugin is loaded
  setupLocalStoragePolyfill();

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 localStorage polyfill plugin initialized');
  }

  return {
    name: 'localStorage-polyfill',
    enforce: 'pre', // Run before other plugins
    buildStart() {
      setupLocalStoragePolyfill();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 localStorage polyfill: buildStart');
      }
    },
    configureServer() {
      setupLocalStoragePolyfill();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 localStorage polyfill: configureServer');
      }
    },
    // Critical: Inject polyfill code into SSR modules that use localStorage
    transform(code, id, options) {
      if (options?.ssr) {
        setupLocalStoragePolyfill();

        // Inject polyfill at the top of modules that might use localStorage
        // Specifically target devtools-kit modules
        if (id.includes('@vue/devtools-kit') || id.includes('devtools')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔧 Injecting localStorage polyfill into:', id);
          }
          return {
            code: POLYFILL_CODE + '\n' + code,
            map: null,
          };
        }
      }
      return null;
    },
    // Also ensure polyfill exists when resolving modules
    resolveId() {
      if (typeof globalThis.localStorage === 'undefined') {
        setupLocalStoragePolyfill();
      }
      return null;
    },
    // Inject polyfill when loading SSR modules
    load(id) {
      if (
        id.includes('@vue/devtools-kit') &&
        typeof globalThis.localStorage === 'undefined'
      ) {
        setupLocalStoragePolyfill();
      }
      return null;
    },
  };
}
