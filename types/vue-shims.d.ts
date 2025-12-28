declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}

// Note: Nuxt auto-imports and Nitro plugins are handled by Nuxt itself
// No need to declare them here to avoid conflicts with actual Nuxt type definitions
