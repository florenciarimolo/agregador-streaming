<template>
  <div
    class="min-h-screen flex items-center justify-center dark:bg-[#011627] bg-white px-4"
  >
    <div class="text-center max-w-md w-full">
      <div
        v-if="loading"
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p v-if="loading" class="text-gray-800 dark:text-gray-300">
        Completando inicio de sesión...
      </p>
      <AlertMessage v-if="error" :message="error" type="error" />
      <div v-if="error" class="mt-4">
        <nuxt-link
          to="/"
          class="inline-block px-6 py-3 dark:bg-gray-900/90 bg-gray-800/90 hover:dark:bg-gray-800/80 hover:bg-gray-900/90 text-white rounded-lg font-medium transition-all duration-300 shadow-lg border border-gray-700/50 dark:border-gray-600/50"
        >
          Volver al inicio
        </nuxt-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Callback page - MINIMAL RESPONSIBILITY
// Only exchanges code for session and redirects
// Does NOT detect recovery, login, registration, etc.
// Recovery detection happens in middleware using session.user.recovery_sent_at

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

// Helper function to redirect based on onboarding status
const redirectAfterAuth = async () => {
  // Wait a bit for the session to be fully established
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get the current session and user
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData?.session?.user) {
    const user = sessionData.session.user;

    // Set user in store
    const userId = user.id || (user as { sub?: string })?.sub;
    const currentUserId =
      userStore.user?.id || (userStore.user as { sub?: string })?.sub;

    if (!userStore.user || currentUserId !== userId) {
      userStore.setUser(user);
      // Ensure profile is loaded
      await userStore.ensureProfile();
    }

    // Check if user has completed onboarding
    const hasCompletedOnboarding = userStore.hasCompletedOnboarding;

    // Redirect to onboarding if not completed, otherwise to home
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    } else {
      router.replace('/');
    }
  } else {
    // No user, redirect to home
    router.replace('/');
  }
};

onMounted(async () => {
  try {
    // Get hash params (Supabase sometimes puts params in hash)
    const hashParams = parseHashParams();

    // Merge query params and hash params (query params take precedence)
    const allParams = { ...hashParams, ...route.query };

    // Handle errors first
    const supabaseError = allParams.error as string;
    const errorCode = allParams.error_code as string;
    const errorDescription = allParams.error_description as string;
    const errorMessage = allParams.error_message as string;

    if (supabaseError || errorCode || errorDescription || errorMessage) {
      let errorText = '';

      if (errorDescription) {
        errorText = decodeURIComponent(errorDescription);
      } else if (errorCode) {
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
      } else if (errorMessage) {
        errorText = decodeURIComponent(errorMessage);
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
      }, 5000);
      return;
    }

    // Get code from query parameters
    const code = allParams.code as string;
    const accessToken = allParams.access_token as string;
    const refreshToken = allParams.refresh_token as string;

    // If we have access_token and refresh_token, set session directly
    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
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

      // Session set successfully, check onboarding and redirect
      await redirectAfterAuth();
      return;
    }

    // If we have a code, exchange it for a session
    if (code) {
      const { error: codeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (codeError) {
        // Check if it's a PKCE code verifier missing error
        const isPKCEError =
          codeError.message?.includes('PKCE') ||
          codeError.message?.includes('code verifier') ||
          codeError.name === 'AuthPKCECodeVerifierMissingError';

        if (isPKCEError) {
          // For PKCE errors, wait and check if session was established
          let attempts = 0;
          const maxAttempts = 6; // Check for up to 3 seconds (6 * 500ms)
          let sessionFound = false;

          while (attempts < maxAttempts && !sessionFound) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              sessionFound = true;
              // Session was established, check onboarding and redirect
              await redirectAfterAuth();
              return;
            }
            attempts++;
          }

          // If still no session after waiting, it's a real error
          if (!sessionFound) {
            if (process.env.NODE_ENV === 'development') {
              console.error(
                '[Callback] PKCE error - no session after waiting:',
                codeError
              );
            }
            error.value =
              'El enlace de inicio de sesión ha expirado o no es válido. Por favor, solicita uno nuevo.';
            loading.value = false;
            setTimeout(() => {
              router.replace('/');
            }, 3000);
            return;
          }
        } else {
          // For other errors, wait a bit and check once
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const { data: sessionData } = await supabase.auth.getSession();

          if (sessionData?.session) {
            // Session was established, check onboarding and redirect
            await redirectAfterAuth();
            return;
          }

          // Only show error if we're sure there's no session
          if (process.env.NODE_ENV === 'development') {
            console.error('[Callback] Code exchange error:', codeError);
          }
          error.value =
            'El enlace de inicio de sesión ha expirado o no es válido. Por favor, solicita uno nuevo.';
          loading.value = false;
          setTimeout(() => {
            router.replace('/');
          }, 3000);
          return;
        }
      } else {
        // Code exchanged successfully, check onboarding and redirect
        await redirectAfterAuth();
        return;
      }
    }

    // If no code or tokens, try to get existing session
    if (!code) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Callback] Get session error:', sessionError);
        }
        error.value =
          'Error al obtener la sesión. Por favor, intenta de nuevo.';
        loading.value = false;
        setTimeout(() => {
          router.replace('/');
        }, 3000);
        return;
      }

      if (sessionData.session) {
        // Session exists, check onboarding and redirect
        await redirectAfterAuth();
        return;
      }
    }

    // No code, no tokens, no session
    error.value = 'No se pudo establecer la sesión. Redirigiendo...';
    loading.value = false;
    setTimeout(() => {
      router.replace('/');
    }, 2000);
  } catch (err: unknown) {
    console.error('[Callback] Unexpected error:', err);
    error.value = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    loading.value = false;
    setTimeout(() => {
      router.replace('/');
    }, 3000);
  }
});
</script>
