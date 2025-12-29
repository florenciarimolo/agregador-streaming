<template>
  <div
    class="min-h-screen flex items-center justify-center dark:bg-[#011627] bg-white"
  >
    <div class="text-center">
      <div
        v-if="loading"
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p v-if="loading" class="text-gray-600 dark:text-gray-400">
        Completando inicio de sesión...
      </p>
      <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Nuxt auto-imports: definePageMeta, useSupabaseClient, useRouter, useRoute, useUserStore, useSupabaseUser
// These are available globally via Nuxt's auto-import system
// TypeScript types are generated in .nuxt/types/imports.d.ts

definePageMeta({
  ssr: false, // Client-side only to handle query params
});

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const user = useSupabaseUser();

const error = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    // Get code from query parameters (magic link or OAuth)
    const code = route.query.code as string;
    const accessToken = route.query.access_token as string;
    const refreshToken = route.query.refresh_token as string;
    const errorMessage = route.query.error_message as string;

    // Check for error message first
    if (errorMessage) {
      error.value = decodeURIComponent(errorMessage);
      loading.value = false;
      setTimeout(() => {
        router.replace('/');
      }, 3000);
      return;
    }

    // If we have access_token and refresh_token, set session directly
    if (accessToken && refreshToken) {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('[Callback] Session error:', sessionError);
        error.value =
          'Error al establecer la sesión. Por favor, intenta de nuevo.';
        loading.value = false;
        setTimeout(() => {
          router.replace('/');
        }, 3000);
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth();
        return;
      }
    }

    // If we have a code, exchange it for a session
    if (code) {
      const { data, error: codeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (codeError) {
        console.error('[Callback] Code exchange error:', codeError);
        error.value =
          'El enlace de inicio de sesión ha expirado o no es válido. Por favor, solicita uno nuevo.';
        loading.value = false;
        setTimeout(() => {
          router.replace('/');
        }, 3000);
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth();
        return;
      }
    }

    // If no code or tokens, try to get existing session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Callback] Get session error:', sessionError);
      error.value = 'Error al obtener la sesión. Por favor, intenta de nuevo.';
      loading.value = false;
      setTimeout(() => {
        router.replace('/');
      }, 3000);
      return;
    }

    if (sessionData.session) {
      await handleSuccessfulAuth();
    } else {
      // No session found, redirect to login
      error.value = 'No se pudo establecer la sesión. Redirigiendo...';
      loading.value = false;
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    }
  } catch (err: unknown) {
    console.error('[Callback] Unexpected error:', err);
    error.value = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    loading.value = false;
    setTimeout(() => {
      router.replace('/');
    }, 3000);
  }
});

const handleSuccessfulAuth = async () => {
  try {
    // Wait for user to be available from Supabase
    // The onAuthStateChange in the plugin will handle updating the store
    // But we need to wait a bit for it to propagate
    let attempts = 0;
    const maxAttempts = 20; // Increase attempts for slower connections
    while (!user.value && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      attempts++;
    }

    // Ensure user is set in store
    if (user.value) {
      // Set user in store explicitly
      userStore.setUser(user.value);

      // Fetch profile and wait for it to complete
      await userStore.fetchProfile();

      // Wait a bit more to ensure state is fully updated and reactive
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check if user has completed onboarding
      if (!userStore.hasCompletedOnboarding) {
        await router.replace('/onboarding');
      } else {
        // Use replace to avoid adding to history and ensure clean navigation
        // Clear query params to avoid re-processing
        await router.replace({ path: '/', query: {} });
      }
    } else {
      error.value = 'No se pudo obtener la información del usuario.';
      loading.value = false;
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    }
  } catch (err: unknown) {
    console.error('[Callback] Error handling successful auth:', err);
    error.value = 'Error al cargar el perfil. Redirigiendo...';
    loading.value = false;
    setTimeout(() => {
      router.replace('/');
    }, 2000);
  }
};
</script>
