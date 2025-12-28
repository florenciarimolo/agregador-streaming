<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-600 dark:text-gray-400"
        >Completando inicio de sesión...</p
      >
      <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  ssr: false, // Client-side only to handle query params
});

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const error = ref<string | null>(null);

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
      setTimeout(() => {
        router.push('/');
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
        setTimeout(() => {
          router.push('/');
        }, 3000);
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth(data.session.user);
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
        setTimeout(() => {
          router.push('/');
        }, 3000);
        return;
      }

      if (data.session) {
        await handleSuccessfulAuth(data.session.user);
        return;
      }
    }

    // If no code or tokens, try to get existing session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error('[Callback] Get session error:', sessionError);
      error.value = 'Error al obtener la sesión. Por favor, intenta de nuevo.';
      setTimeout(() => {
        router.push('/');
      }, 3000);
      return;
    }

    if (sessionData.session) {
      await handleSuccessfulAuth(sessionData.session.user);
    } else {
      // No session found, redirect to login
      error.value = 'No se pudo establecer la sesión. Redirigiendo...';
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  } catch (err: unknown) {
    console.error('[Callback] Unexpected error:', err);
    error.value = 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
    setTimeout(() => {
      router.push('/');
    }, 3000);
  }
});

const handleSuccessfulAuth = async (user: unknown) => {
  try {
    userStore.setUser(user);
    await userStore.fetchProfile();

    // Check if user has completed onboarding
    if (!userStore.hasCompletedOnboarding) {
      await router.push('/onboarding');
    } else {
      await router.push('/');
    }
  } catch (err: unknown) {
    console.error('[Callback] Error handling successful auth:', err);
    error.value = 'Error al cargar el perfil. Redirigiendo...';
    setTimeout(() => {
      router.push('/');
    }, 2000);
  }
};
</script>
