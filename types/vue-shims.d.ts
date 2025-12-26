declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Nitro plugin type declaration (auto-imported by Nuxt)
declare function defineNitroPlugin(
  plugin: (nitroApp: any) => void | Promise<void>
): any;

// Nuxt auto-imports (these are provided by Nuxt at runtime)
declare global {
  // Vue Composition API
  const ref: (typeof import('vue'))['ref'];
  const computed: (typeof import('vue'))['computed'];
  const watch: (typeof import('vue'))['watch'];
  const nextTick: (typeof import('vue'))['nextTick'];
  const readonly: (typeof import('vue'))['readonly'];

  // Nuxt composables
  const definePageMeta: (typeof import('#app'))['definePageMeta'];
  const useHead: (typeof import('#app'))['useHead'];
  const useSeoMeta: (typeof import('#app'))['useSeoMeta'];
  const useRouter: (typeof import('vue-router'))['useRouter'];
  const navigateTo: (typeof import('#app'))['navigateTo'];

  // Supabase composables (from @nuxtjs/supabase)
  const useSupabaseClient: () => any;
  const useSupabaseUser: () => import('vue').Ref<any>;

  // Pinia store
  const useUserStore: () => any;

  // Custom composables
  const useAuth: () => any;
  const useTheme: () => any;
}

export {};
