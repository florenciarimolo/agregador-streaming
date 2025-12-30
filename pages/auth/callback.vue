<template>
  <div
    class="min-h-screen flex items-center justify-center dark:bg-[#011627] bg-white px-4"
  >
    <div class="text-center max-w-md w-full">
      <div
        v-if="loading"
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p v-if="loading" class="text-gray-600 dark:text-gray-400">
        Completando inicio de sesión...
      </p>
      <AlertMessage v-if="error" :message="error" type="error" />
      <div v-if="error" class="mt-4">
        <nuxt-link
          to="/"
          class="inline-block px-6 py-3 dark:bg-gray-900/90 bg-gray-800/90 hover:dark:bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg border border-gray-700/50 dark:border-gray-600/50"
        >
          Volver al inicio
        </nuxt-link>
      </div>
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

useHead({
  title: 'Autenticación - UpNext',
});

useSeoMeta({
  title: 'Autenticación - UpNext',
  description: 'Completando inicio de sesión',
});

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const user = useSupabaseUser();

const error = ref<string | null>(null);
const loading = ref(true);

// Helper function to parse hash params
const parseHashParams = (): Record<string, string> => {
  const params: Record<string, string> = {};
  if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash.substring(1); // Remove #
    try {
      const hashParams = new URLSearchParams(hash);
      hashParams.forEach((value, key) => {
        params[key] = decodeURIComponent(value);
      });
    } catch (e) {
      console.error('[Callback] Error parsing hash:', e);
    }
  }
  return params;
};

onMounted(async () => {
  try {
    // Get hash params (Supabase sometimes puts params in hash)
    const hashParams = parseHashParams();

    // Merge query params and hash params (query params take precedence)
    const allParams = { ...hashParams, ...route.query };

    // Debug logging (only in development)
    if (
      process.env.NODE_ENV === 'development' &&
      (hashParams.error || route.query.error)
    ) {
      console.log('[Callback] Detected error params:', {
        hashParams,
        queryParams: route.query,
        allParams,
      });
    }

    // Get code from query parameters (magic link or OAuth)
    const code = allParams.code as string;
    const accessToken = allParams.access_token as string;
    const refreshToken = allParams.refresh_token as string;
    const errorMessage = allParams.error_message as string;

    // Get Supabase error parameters (check both hash and query)
    const supabaseError = allParams.error as string;
    const errorCode = allParams.error_code as string;
    const errorDescription = allParams.error_description as string;

    // Check for Supabase error parameters first (error, error_code, error_description)
    if (supabaseError || errorCode || errorDescription) {
      let errorText = '';

      // Use error_description if available (most user-friendly)
      if (errorDescription) {
        errorText = decodeURIComponent(errorDescription);
      } else if (errorCode) {
        // Map common error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          otp_expired:
            'El enlace de inicio de sesión ha expirado. Por favor, solicita uno nuevo.',
          access_denied:
            'Acceso denegado. El enlace no es válido o ha expirado.',
          invalid_request: 'Solicitud inválida. Por favor, intenta de nuevo.',
          expired_token:
            'El token ha expirado. Por favor, solicita un nuevo enlace.',
        };
        errorText = errorMessages[errorCode] || `Error: ${errorCode}`;
      } else if (supabaseError) {
        errorText =
          supabaseError === 'access_denied'
            ? 'Acceso denegado. El enlace no es válido o ha expirado.'
            : `Error: ${supabaseError}`;
      } else {
        errorText =
          'Ocurrió un error al procesar el enlace. Por favor, intenta de nuevo.';
      }

      error.value = errorText;
      loading.value = false;
      setTimeout(() => {
        router.replace('/');
      }, 5000); // Give user more time to read the error
      return;
    }

    // Check for error message (legacy format)
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
    // Wait for user to be available from Supabase - optimized polling
    let attempts = 0;
    const maxAttempts = 10; // Reduced attempts
    const pollInterval = 100; // Faster polling

    while (!user.value && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    // Ensure user is set in store
    if (user.value) {
      // Set user in store explicitly
      userStore.setUser(user.value);

      // Fetch profile and wait for it to complete
      await userStore.fetchProfile();

      // Single nextTick is enough for Vue reactivity
      await nextTick();

      // Check if user has completed onboarding
      if (!userStore.hasCompletedOnboarding) {
        await router.replace('/onboarding');
      } else {
        // Use replace to avoid adding to history and ensure clean navigation
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
