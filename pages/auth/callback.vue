<template>
  <div
    class="min-h-screen flex items-center justify-center dark:bg-[#011627] bg-white px-4"
  >
    <div class="w-full max-w-md text-center">
      <div
        v-if="loading"
        class="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 animate-spin border-primary"
      ></div>
      <p v-if="loading" class="text-gray-800 dark:text-gray-300">
        {{ $t('auth.callbackCompleting') }}
      </p>
      <Alert
        v-if="error"
        :message="error"
        variant="error"
        :with-transition="true"
        custom-class="mb-4"
        :show-icon="false"
      />
      <div v-if="error" class="mt-4">
        <Button
          variant="primary"
          size="medium"
          custom-class="inline-block"
          @click="router.push(`/${getLangFromRoute()}/`)"
        >
          {{ $t('auth.callbackBackToHome') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { STORAGE_KEYS } from '@/constants/storage/keys';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { useUserStore } from '@/stores/user';
// Callback page - MINIMAL RESPONSIBILITY
// Only exchanges code for session and redirects
// Recovery detection happens in this page, not in middleware

definePageMeta({
  ssr: false, // Client-side only to handle query params
});

const { t } = useI18n();

useHead({
  title: t('auth.callbackTitle'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  title: t('auth.callbackTitle'),
  description: t('auth.callbackDescription'),
  robots: 'noindex, nofollow',
});

import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

/**
 * Get language from route params
 * @returns Language URL code (e.g., 'es', 'en') or DEFAULT_LANGUAGE_URL_CODE as default
 */
const getLangFromRoute = (): string => {
  const langParam = route.params?.lang as string | undefined;
  if (langParam) {
    return langParam.toLowerCase();
  }
  // Default to DEFAULT_LANGUAGE_URL_CODE if no lang param
  return DEFAULT_LANGUAGE_URL_CODE;
};

// Safely get userStore - it may not be available immediately after Pinia initialization
// Use a computed to lazy-load the store, but only on client side
const userStore = computed(() => {
  // Only try to get store on client side
  if (import.meta.server) {
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      setUser: () => {},
      fetchProfile: async () => {},
    };
  }

  try {
    return useUserStore();
  } catch (error) {
    // If store is not available, return a fallback object
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[pages/auth/callback.vue] useUserStore not available:',
        error
      );
    }
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      setUser: () => {},
      fetchProfile: async () => {},
    };
  }
});

const error = ref<string | null>(null);
const loading = ref(true);

// Store auth state change subscription for cleanup
let authStateSubscription: { unsubscribe: () => void } | null = null;

// Cleanup subscription on unmount
onUnmounted(() => {
  if (authStateSubscription) {
    authStateSubscription.unsubscribe();
  }
});

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

// Helper function to redirect based on onboarding status or next parameter
const redirectAfterAuth = async (next?: string) => {
  const lang = getLangFromRoute();
  console.log('[AUTH TRACE] callback.vue redirectAfterAuth called', {
    next,
    lang,
  });

  // Check if we have a next parameter for recovery flow
  if (
    next === '/auth/reset-password' ||
    next?.endsWith('/auth/reset-password')
  ) {
    // Recovery flow: redirect immediately to reset-password (with language)
    console.log(
      '[AUTH TRACE] callback.vue redirecting to /auth/reset-password (next param)'
    );
    router.replace(`/${lang}/auth/reset-password`);
    return;
  }

  // Wait a bit for the session to be fully established
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get the current session and user
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = useSupabaseUser();
  console.log('[AUTH TRACE] callback.vue redirectAfterAuth session check', {
    hasSession: !!sessionData?.session,
    hasUser: !!currentUser.value,
    userId: currentUser.value?.id || currentUser.value?.sub,
  });

  if (sessionData?.session?.user) {
    const user = sessionData.session.user;

    // Set user in store
    const userId = user.id || (user as { sub?: string })?.sub;
    const store = userStore.value;
    // Type guard: check if store has 'user' property (real store) vs fallback object
    const hasUserProperty = 'user' in store;
    const currentUserId =
      hasUserProperty && store.user
        ? store.user.id || (store.user as { sub?: string })?.sub
        : null;

    if (!hasUserProperty || !store.user || currentUserId !== userId) {
      store.setUser(user);
      // CRITICAL: Fetch profile to ensure it's loaded before navigation
      await store.fetchProfile();

      console.log('[Callback] Profile fetched:', {
        hasProfile:
          hasUserProperty && 'profile' in store ? !!store.profile : false,
        onboarding_completed:
          hasUserProperty && 'profile' in store
            ? store.profile?.onboarding_completed
            : undefined,
      });
    }

    // Check if user has completed onboarding
    const hasCompletedOnboarding = userStore.value.hasCompletedOnboarding;
    console.log(
      '[AUTH TRACE] callback.vue redirectAfterAuth onboarding check',
      {
        hasCompletedOnboarding,
      }
    );

    // Redirect to onboarding if not completed, otherwise to home (with language)
    const lang = getLangFromRoute();
    if (!hasCompletedOnboarding) {
      console.log('[AUTH TRACE] callback.vue redirecting to /onboarding');
      router.replace(`/${lang}/onboarding`);
    } else {
      console.log('[AUTH TRACE] callback.vue redirecting to /');
      router.replace(`/${lang}/`);
    }
  } else {
    // No user, redirect to home (with language)
    const lang = getLangFromRoute();
    console.log('[AUTH TRACE] callback.vue redirecting to / (no user)');
    router.replace(`/${lang}/`);
  }
};

onMounted(async () => {
  console.log('[AUTH TRACE] callback.vue mounted', {
    fullPath: route.fullPath,
    path: route.path,
    query: route.query,
    hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
  });

  // Check for recovery flow flag BEFORE any other logic
  // This must be the first thing we check, even before checking session
  if (typeof window !== 'undefined') {
    const recoveryFlag = localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY);
    let isRecoveryFlow = false;

    if (recoveryFlag) {
      try {
        // New format: { value: 1, ts: timestamp }
        const parsed = JSON.parse(recoveryFlag);
        // Check if flag is valid (not older than 24 hours)
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (parsed.value === 1 && Date.now() - parsed.ts < maxAge) {
          isRecoveryFlow = true;
        } else {
          // Flag expired, remove it
          localStorage.removeItem(STORAGE_KEYS.AUTH_RECOVERY);
        }
      } catch {
        // Legacy format: '1' (string)
        if (recoveryFlag === '1') {
          isRecoveryFlow = true;
        }
      }
    }

    console.log(
      '[AUTH TRACE] callback.vue checking localStorage auth:recovery',
      {
        isRecoveryFlow,
        localStorageValue: recoveryFlag,
      }
    );

    if (isRecoveryFlow) {
      const lang = getLangFromRoute();
      console.log(
        '[AUTH TRACE] callback.vue recovery flow detected via localStorage flag, redirecting to /auth/reset-password'
      );
      // NO eliminar el flag aquí - se eliminará en reset-password.vue después de cambiar la contraseña
      loading.value = false;
      router.replace(`/${lang}/auth/reset-password`);
      return;
    }
  }

  console.log(
    '[AUTH TRACE] callback.vue after recovery check, proceeding with normal flow'
  );

  // Listen for PASSWORD_RECOVERY event (Supabase emits this when recovery flow completes)
  // This is the ONLY reliable way to detect recovery since Supabase ignores redirectTo
  // and always uses Site URL from dashboard, so query params never arrive
  // Set this up BEFORE processing the code to catch recovery events
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[AUTH TRACE] callback.vue auth state change event', {
      event,
      hasSession: !!session,
      userId: session?.user?.id || (session?.user as { sub?: string })?.sub,
      timestamp: new Date().toISOString(),
    });

    if (event === 'PASSWORD_RECOVERY') {
      const lang = getLangFromRoute();
      console.log('[AUTH TRACE] PASSWORD_RECOVERY fired');
      console.log(
        '[AUTH TRACE] callback.vue PASSWORD_RECOVERY detected, redirecting to /auth/reset-password'
      );
      router.replace(`/${lang}/auth/reset-password`);
    }
  });

  // Store subscription for cleanup
  authStateSubscription = subscription;
  console.log('[AUTH TRACE] callback.vue auth state listener registered');

  try {
    // Get hash params (Supabase sometimes puts params in hash)
    const hashParams = parseHashParams();
    console.log('[AUTH TRACE] callback.vue parsed hash params', hashParams);

    // Merge query params and hash params (query params take precedence)
    const allParams = { ...hashParams, ...route.query };
    console.log('[AUTH TRACE] callback.vue all params (merged)', allParams);

    // Read next parameter for recovery flow
    const next =
      (allParams.next as string | undefined) ||
      (route.query.next as string | undefined);
    console.log('[AUTH TRACE] callback.vue next parameter', next);

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
          otp_expired: t('auth.callbackLinkExpired'),
          access_denied: t('auth.callbackAccessDenied'),
          invalid_request: t('auth.callbackInvalidRequest'),
          expired_token: t('auth.callbackTokenExpired'),
        };
        errorText = errorMessages[errorCode] || `Error: ${errorCode}`;
      } else if (errorMessage) {
        errorText = decodeURIComponent(errorMessage);
      } else if (supabaseError) {
        errorText =
          supabaseError === 'access_denied'
            ? t('auth.callbackAccessDenied')
            : `Error: ${supabaseError}`;
      } else {
        errorText = t('auth.callbackErrorProcessing');
      }

      error.value = errorText;
      loading.value = false;
      const lang = getLangFromRoute();
      setTimeout(() => {
        router.replace(`/${lang}/`);
      }, 5000);
      return;
    }

    // Get code from query parameters
    const code = allParams.code as string;
    const accessToken = allParams.access_token as string;
    const refreshToken = allParams.refresh_token as string;

    // If we have access_token and refresh_token, set session directly
    if (accessToken && refreshToken) {
      console.log('[AUTH TRACE] callback.vue setting session with tokens');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error('[AUTH TRACE] callback.vue session error', sessionError);
        error.value = t('auth.callbackSessionError');
        loading.value = false;
        const lang = getLangFromRoute();
        setTimeout(() => {
          console.log(
            '[AUTH TRACE] callback.vue redirecting to / (session error)'
          );
          router.replace(`/${lang}/`);
        }, 3000);
        return;
      }

      console.log('[AUTH TRACE] callback.vue session set successfully');
      // Session set successfully, check next parameter or onboarding and redirect
      await redirectAfterAuth(next);
      return;
    }

    // If we have a code, exchange it for a session
    if (code) {
      console.log('[AUTH TRACE] callback.vue exchanging code for session', {
        code: code.substring(0, 8) + '...',
      });

      // Check if Supabase already exchanged the code automatically during initialization
      // This can happen if Supabase detects the code in the URL before the callback page mounts
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession?.session) {
        console.log(
          '[AUTH TRACE] callback.vue session already exists, Supabase auto-exchanged code'
        );
        // Session already exists, proceed with redirect
        await redirectAfterAuth(next);
        return;
      }

      try {
        console.log(
          '[AUTH TRACE] callback.vue about to call exchangeCodeForSession'
        );
        const exchangePromise = supabase.auth.exchangeCodeForSession(code);
        console.log(
          '[AUTH TRACE] callback.vue exchangeCodeForSession promise created, awaiting...'
        );
        const { error: codeError, data } = await exchangePromise;
        console.log(
          '[AUTH TRACE] callback.vue exchangeCodeForSession promise resolved'
        );

        console.log(
          '[AUTH TRACE] callback.vue exchangeCodeForSession completed',
          {
            hasError: !!codeError,
            hasData: !!data,
            errorMessage: codeError?.message,
          }
        );

        if (codeError) {
          console.log(
            '[AUTH TRACE] callback.vue code exchange error',
            codeError
          );
          // Check if it's a PKCE code verifier missing error
          const isPKCEError =
            codeError.message?.includes('PKCE') ||
            codeError.message?.includes('code verifier') ||
            codeError.name === 'AuthPKCECodeVerifierMissingError';

          if (isPKCEError) {
            // For PKCE errors, wait and check if session was established
            // In recovery flow, Supabase may establish session even with PKCE error
            let attempts = 0;
            const maxAttempts = 6; // Check for up to 3 seconds (6 * 500ms)
            let sessionFound = false;

            while (attempts < maxAttempts && !sessionFound) {
              await new Promise((resolve) => setTimeout(resolve, 500));
              const { data: sessionData } = await supabase.auth.getSession();
              if (sessionData?.session) {
                sessionFound = true;
                console.log(
                  '[AUTH TRACE] callback.vue session found after PKCE error wait'
                );
                // Session was established, check next parameter or onboarding and redirect
                await redirectAfterAuth(next);
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
              error.value = t('auth.callbackLinkExpiredOrInvalid');
              loading.value = false;
              const lang = getLangFromRoute();
              setTimeout(() => {
                router.replace(`/${lang}/`);
              }, 3000);
              return;
            }
          } else {
            // For other errors, wait a bit and check once
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const { data: sessionData } = await supabase.auth.getSession();

            if (sessionData?.session) {
              console.log(
                '[AUTH TRACE] callback.vue session found after error wait'
              );
              // Session was established, check next parameter or onboarding and redirect
              await redirectAfterAuth(next);
              return;
            }

            // Only show error if we're sure there's no session
            if (process.env.NODE_ENV === 'development') {
              console.error('[Callback] Code exchange error:', codeError);
            }
            error.value = t('auth.callbackLinkExpiredOrInvalid');
            loading.value = false;
            const lang = getLangFromRoute();
            setTimeout(() => {
              router.replace(`/${lang}/`);
            }, 3000);
            return;
          }
        } else {
          console.log('[AUTH TRACE] callback.vue code exchanged successfully');
          // Code exchanged successfully, check next parameter or onboarding and redirect
          console.log('[AUTH TRACE] callback.vue calling redirectAfterAuth', {
            next,
          });
          await redirectAfterAuth(next);
          console.log('[AUTH TRACE] callback.vue redirectAfterAuth completed');
          return;
        }
      } catch (exchangeErr) {
        console.error(
          '[AUTH TRACE] callback.vue exchangeCodeForSession exception',
          exchangeErr
        );
        error.value = t('auth.callbackUnexpectedError');
        loading.value = false;
        const lang = getLangFromRoute();
        setTimeout(() => {
          router.replace(`/${lang}/`);
        }, 3000);
        return;
      }
    }

    // If no code or tokens, try to get existing session
    if (!code) {
      console.log(
        '[AUTH TRACE] callback.vue no code, checking existing session'
      );
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.log(
          '[AUTH TRACE] callback.vue get session error',
          sessionError
        );
        error.value = t('auth.callbackGetSessionError');
        loading.value = false;
        const lang = getLangFromRoute();
        setTimeout(() => {
          console.log(
            '[AUTH TRACE] callback.vue redirecting to / (get session error)'
          );
          router.replace(`/${lang}/`);
        }, 3000);
        return;
      }

      if (sessionData.session) {
        console.log('[AUTH TRACE] callback.vue existing session found');
        // Session exists, check next parameter or onboarding and redirect
        await redirectAfterAuth(next);
        return;
      }
    }

    // No code, no tokens, no session
    error.value = t('auth.callbackSessionNotEstablished');
    loading.value = false;
    const lang = getLangFromRoute();
    setTimeout(() => {
      router.replace(`/${lang}/`);
    }, 2000);
  } catch (err: unknown) {
    console.error('[Callback] Unexpected error:', err);
    error.value = t('auth.callbackUnexpectedError');
    loading.value = false;
    const lang = getLangFromRoute();
    setTimeout(() => {
      router.replace(`/${lang}/`);
    }, 3000);
  }
});
</script>
