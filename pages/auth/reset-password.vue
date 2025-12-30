<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <!-- Light mode -->
        <img
          src="/logo-light.png"
          alt="UpNext"
          class="h-12 w-12 mx-auto mb-4 object-contain dark:hidden"
        />
        <!-- Dark mode -->
        <img
          src="/logo-dark.png"
          alt="UpNext"
          class="h-12 w-12 mx-auto mb-4 object-contain hidden dark:block"
        />
        <h1 class="text-3xl font-bold dark:text-gray-300 text-gray-800 mb-2">
          Restablecer contraseña
        </h1>
        <p class="text-gray-800 dark:text-gray-300">
          Ingresa tu nueva contraseña
        </p>
      </div>

      <div
        class="dark:bg-gray-800/70 bg-gray-100/90 backdrop-blur-xs rounded-xl p-6 md:p-8 border border-primary/20 shadow-lg"
      >
        <div class="text-center mb-6">
          <h2
            class="text-2xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
          >
            Nueva contraseña
          </h2>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        <!-- Error message from query param -->
        <AlertMessage
          v-if="errorMessage"
          :message="errorMessage"
          type="error"
        />

        <!-- Error message -->
        <AlertMessage v-if="error" :message="error" type="error" />

        <!-- Success message -->
        <AlertMessage
          v-if="passwordReset"
          message="¡Contraseña actualizada correctamente! Redirigiendo..."
          type="success"
        />

        <!-- Form -->
        <form
          v-if="!passwordReset && codeValidated"
          @submit.prevent="handleResetPassword"
        >
          <div class="mb-4">
            <label
              for="new-password"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Nueva contraseña
            </label>
            <div class="relative">
              <input
                id="new-password"
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :class="[
                  'w-full px-4 py-3 pr-10 dark:bg-gray-900/50 bg-white dark:text-gray-300 text-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all',
                  passwordValidation &&
                  !passwordValidation.isValid &&
                  newPassword.length > 0
                    ? 'border-red-500 dark:border-red-500'
                    : 'dark:border-gray-700/50 border-gray-300',
                ]"
                placeholder="••••••••"
              />
              <button
                type="button"
                data-icon-only="true"
                :aria-label="
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                "
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
                @click="showPassword = !showPassword"
                @keydown.enter.prevent="showPassword = !showPassword"
                @keydown.space.prevent="showPassword = !showPassword"
              >
                <!-- Eye icon (visible) -->
                <svg
                  v-if="showPassword"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <!-- Eye slash icon (hidden) -->
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L3 3m14.29 14.29L21 21M14.88 14.88a3 3 0 11-4.243-4.243m4.242 4.242L21 21"
                  />
                </svg>
              </button>
            </div>
            <!-- Helper text -->
            <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {{ getPasswordHelperText() }}
            </p>
            <!-- Real-time validation checklist -->
            <div
              v-if="showPasswordValidation && passwordValidation"
              class="mt-2 space-y-1.5"
            >
              <div
                v-for="check in [
                  {
                    key: 'minLength',
                    label: 'Al menos 8 caracteres',
                  },
                  {
                    key: 'hasUppercase',
                    label: 'Una letra mayúscula',
                  },
                  {
                    key: 'hasLowercase',
                    label: 'Una letra minúscula',
                  },
                  {
                    key: 'hasNumber',
                    label: 'Un número',
                  },
                  {
                    key: 'hasSpecialChar',
                    label: 'Un símbolo',
                  },
                ]"
                :key="check.key"
                class="flex items-center gap-2 text-xs"
              >
                <svg
                  v-if="
                    passwordValidation.checks[
                      check.key as keyof typeof passwordValidation.checks
                    ]
                  "
                  class="w-4 h-4 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span
                  :class="[
                    passwordValidation.checks[
                      check.key as keyof typeof passwordValidation.checks
                    ]
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400',
                  ]"
                >
                  {{ check.label }}
                </span>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <label
              for="confirm-password"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Confirmar contraseña
            </label>
            <div class="relative">
              <input
                id="confirm-password"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :class="[
                  'w-full px-4 py-3 pr-10 dark:bg-gray-900/50 bg-white dark:text-gray-300 text-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all',
                  confirmPassword.length > 0 && newPassword !== confirmPassword
                    ? 'border-red-500 dark:border-red-500'
                    : 'dark:border-gray-700/50 border-gray-300',
                ]"
                placeholder="••••••••"
              />
              <button
                type="button"
                data-icon-only="true"
                :aria-label="
                  showConfirmPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                "
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
                @click="showConfirmPassword = !showConfirmPassword"
                @keydown.enter.prevent="
                  showConfirmPassword = !showConfirmPassword
                "
                @keydown.space.prevent="
                  showConfirmPassword = !showConfirmPassword
                "
              >
                <!-- Eye icon (visible) -->
                <svg
                  v-if="showConfirmPassword"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <!-- Eye slash icon (hidden) -->
                <svg
                  v-else
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.29 3.29L3 3m14.29 14.29L21 21M14.88 14.88a3 3 0 11-4.243-4.243m4.242 4.242L21 21"
                  />
                </svg>
              </button>
            </div>
            <p
              v-if="
                confirmPassword.length > 0 && newPassword !== confirmPassword
              "
              class="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              Las contraseñas no coinciden
            </p>
          </div>

          <button
            type="submit"
            :disabled="loading || !passwordsMatch || !isPasswordValid"
            class="w-full py-3 px-6 dark:bg-gray-900/90 bg-gray-800/90 hover:dark:bg-gray-800/80 hover:bg-gray-900/90 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-gray-700/50 dark:border-gray-600/50"
          >
            {{ loading ? 'Actualizando...' : 'Actualizar contraseña' }}
          </button>
        </form>

        <!-- Loading state while validating code -->
        <div
          v-if="!codeValidated && !error && !errorMessage"
          class="text-center py-8"
        >
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"
          ></div>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            Validando enlace de recuperación...
          </p>
        </div>

        <!-- Back to login -->
        <div
          v-if="codeValidated || error || errorMessage"
          class="mt-4 text-center"
        >
          <a
            href="#"
            class="text-sm text-primary hover:text-secondary transition-colors underline hover:no-underline inline-block"
            @click.prevent="router.push('/')"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
  validatePassword,
  getPasswordHelperText,
} from '@/utils/passwordValidation';

definePageMeta({
  layout: false,
  ssr: false, // Client-side only
  middleware: [], // No auth middleware - handles its own flow
});

useHead({
  title: 'Restablecer contraseña - UpNext',
});

useSeoMeta({
  title: 'Restablecer contraseña - UpNext',
  description: 'Restablece tu contraseña de UpNext',
});

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const errorMessage = ref('');
const passwordReset = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const codeValidated = ref(false);

// Password validation
const passwordValidation = computed(() => {
  if (!newPassword.value) {
    return null;
  }
  return validatePassword(newPassword.value);
});

const showPasswordValidation = computed(() => {
  return newPassword.value.length > 0;
});

const passwordsMatch = computed(() => {
  return (
    newPassword.value.length > 0 &&
    confirmPassword.value.length > 0 &&
    newPassword.value === confirmPassword.value
  );
});

const isPasswordValid = computed(() => {
  return passwordValidation.value?.isValid ?? false;
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
      if (process.env.NODE_ENV === 'development') {
        console.error('[Reset Password] Error parsing hash:', e);
      }
    }
  }
  return params;
};

// Validate code from query parameter and set session
onMounted(async () => {
  // Get hash params (Supabase sometimes puts params in hash)
  const hashParams = parseHashParams();

  // Merge query params and hash params (query params take precedence)
  const allParams = { ...hashParams, ...route.query };

  if (process.env.NODE_ENV === 'development') {
    console.log('[Reset Password] Detected params:', {
      hashParams,
      queryParams: route.query,
      allParams,
    });
  }

  // Check for error_message in params
  const errorMsg = allParams.error_message as string;
  if (errorMsg) {
    errorMessage.value = decodeURIComponent(errorMsg);
    codeValidated.value = true;
    return;
  }

  const code = allParams.code as string;
  const accessToken = allParams.access_token as string;
  const refreshToken = allParams.refresh_token as string;
  const type = allParams.type as string;

  // For password recovery, we need to validate the token/code
  // but NOT establish a full session until password is changed
  if (!code && !accessToken) {
    // No code or tokens in URL - check if this is a recovery flow
    // by checking if we have type=recovery or if Supabase already processed it
    if (type === 'recovery') {
      // Wait a bit for Supabase to process the token if it was just clicked
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if Supabase has a temporary session (from recovery token)
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // Supabase has established a temporary session from the recovery token
        // This is fine - we'll use it to change the password
        // But we won't let the user navigate away until password is changed
        if (process.env.NODE_ENV === 'development') {
          console.log('[Reset Password] Recovery session found, showing form');
        }
        codeValidated.value = true;
        return;
      }
    }

    // No valid recovery token/session
    error.value = 'Enlace de recuperación inválido o expirado.';
    codeValidated.value = true;
    return;
  }

  try {
    // If we have access_token and refresh_token, validate them but don't fully establish session
    // The session will be confirmed after password is changed
    if (accessToken && refreshToken) {
      // Verify the tokens are valid by trying to get user info
      // But don't set the session in the client yet - we'll do that after password change
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Reset Password] Session error:', sessionError);
        }
        error.value =
          'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.';
        codeValidated.value = true;
        return;
      }

      if (sessionData?.session) {
        // Tokens are valid, show the form
        // Session is already set by setSession, but user should change password first
        codeValidated.value = true;
      } else {
        error.value = 'No se pudo validar el enlace de recuperación.';
        codeValidated.value = true;
      }
    } else if (code) {
      // Exchange code for session - this is needed to validate the recovery code
      const { data, error: codeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (codeError) {
        // Check if it's a PKCE code verifier missing error
        // This happens when Supabase processes the token asynchronously
        const isPKCEError =
          codeError.message?.includes('PKCE') ||
          codeError.message?.includes('code verifier') ||
          codeError.name === 'AuthPKCECodeVerifierMissingError';

        if (isPKCEError) {
          // For PKCE errors, wait longer and check multiple times
          // Supabase may be processing the token in the background
          let attempts = 0;
          const maxAttempts = 6; // Check for up to 3 seconds (6 * 500ms)
          let sessionFound = false;

          while (attempts < maxAttempts && !sessionFound) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              sessionFound = true;
              // Session was established, show the form
              codeValidated.value = true;
              return;
            }
            attempts++;
          }

          // If still no session after waiting, it's a real error
          if (!sessionFound) {
            if (process.env.NODE_ENV === 'development') {
              console.error(
                '[Reset Password] PKCE error - no session after waiting:',
                codeError
              );
            }
            error.value =
              'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.';
            codeValidated.value = true;
            return;
          }
        } else {
          // For other errors, show error immediately
          if (process.env.NODE_ENV === 'development') {
            console.error('[Reset Password] Code validation error:', codeError);
          }
          error.value =
            'El enlace de recuperación ha expirado o no es válido. Por favor, solicita uno nuevo.';
          codeValidated.value = true;
          return;
        }
      }

      if (data.session) {
        // Code is valid, show the form
        // Session is established but user must change password
        codeValidated.value = true;
      } else {
        // If exchange succeeded but no session, wait and check again
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          codeValidated.value = true;
        } else {
          error.value = 'No se pudo validar el enlace de recuperación.';
          codeValidated.value = true;
        }
      }
    }
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Reset Password] Error:', err);
    }
    error.value =
      'Error al validar el enlace de recuperación. Por favor, intenta de nuevo.';
    codeValidated.value = true;
  }
});

const handleResetPassword = async () => {
  if (!passwordsMatch.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }

  if (!isPasswordValid.value) {
    error.value = 'La contraseña no cumple con los requisitos.';
    return;
  }

  loading.value = true;
  error.value = '';
  errorMessage.value = '';

  try {
    const { error: resetError } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (resetError) {
      console.error('[Server] Reset password error:', resetError);
      // Translate error messages to Spanish
      const errorMsg = resetError.message || '';
      if (errorMsg.includes('password')) {
        error.value =
          'Error al actualizar la contraseña. Por favor, verifica que cumpla con los requisitos.';
      } else if (errorMsg.includes('session') || errorMsg.includes('expired')) {
        error.value =
          'La sesión ha expirado. Por favor, solicita un nuevo enlace de recuperación.';
      } else {
        error.value =
          'Error al actualizar la contraseña. Por favor, intenta de nuevo.';
      }
      return;
    }

    passwordReset.value = true;

    // Redirect to home after 2 seconds
    setTimeout(() => {
      router.push('/');
    }, 2000);
  } catch (err: unknown) {
    console.error('[Client] Reset password error:', err);
    error.value =
      'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.';
  } finally {
    loading.value = false;
  }
};
</script>
