declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Nitro plugin type declaration (auto-imported by Nuxt)
declare function defineNitroPlugin(
  plugin: (nitroApp: any) => void | Promise<void>
): any;
