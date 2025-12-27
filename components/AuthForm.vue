<script setup lang="ts">
import {
  validatePassword,
  getPasswordHelperText,
} from '../utils/passwordValidation';

// Type for Supabase user that may have either 'id' or 'sub' as identifier
type SupabaseUserWithSub = {
  id?: string;
  sub?: string;
  [key: string]: unknown;
};

// Helper function to safely get user ID from Supabase user object
function getUserId(
  user: SupabaseUserWithSub | null | undefined
): string | undefined {
  return user?.id || user?.sub;
}

const emit = defineEmits<{
  success: [];
  signup: [];
}>();

// Auth composables
const { signIn, signUp, signInWithMagicLink } = useAuth();
const userStore = useUserStore();

// Form state
const email = ref('');
const password = ref('');
const authMethod = ref<'password' | 'magic'>('password');
const isSignUp = ref(false);
const loading = ref(false);
const error = ref('');
const magicLinkSent = ref(false);
const signUpSuccess = ref(false);
const showPassword = ref(false);

// Password validation
const passwordValidation = computed(() => {
  if (!isSignUp.value || !password.value) {
    return null;
  }
  return validatePassword(password.value);
});

const showPasswordValidation = computed(() => {
  return isSignUp.value && password.value.length > 0;
});

const handlePasswordAuth = async () => {
  loading.value = true;
  error.value = '';
  signUpSuccess.value = false;

  // Frontend password validation
  if (isSignUp.value) {
    const validationResult = validatePassword(password.value);
    if (!validationResult.isValid) {
      error.value = 'La contraseña no cumple con los requisitos.';
      loading.value = false;
      return;
    }
  }

  try {
    let result;
    if (isSignUp.value) {
      result = await signUp(email.value, password.value);
    } else {
      result = await signIn(email.value, password.value);
    }

    if (result.error) {
      error.value = result.error.message;
      return;
    }

    // Handle signup success
    if (isSignUp.value && result.data) {
      error.value = '';
      signUpSuccess.value = true;
      email.value = '';
      password.value = '';
      emit('signup');
      return;
    }

    // Handle signin success
    if (!isSignUp.value) {
      // Wait for Supabase to update the session
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Refresh user state
      const currentUser = useSupabaseUser();
      const userId = getUserId(currentUser.value);
      if (currentUser.value && userId) {
        userStore.setUser(currentUser.value);
        await userStore.fetchProfile();
        emit('success');
      } else {
        // Fallback: reload to trigger auth state update
        window.location.href = '/';
      }
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Ocurrió un error';
  } finally {
    loading.value = false;
  }
};

const handleMagicLink = async () => {
  loading.value = true;
  error.value = '';
  magicLinkSent.value = false;

  try {
    const result = await signInWithMagicLink(email.value);

    if (result.error) {
      error.value = result.error.message;
      return;
    }

    magicLinkSent.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Ocurrió un error';
  } finally {
    loading.value = false;
  }
};

const toggleSignUp = () => {
  const wasSignUp = isSignUp.value;
  isSignUp.value = !isSignUp.value;
  signUpSuccess.value = false;
  error.value = '';
  // Reset to password method when switching to sign up
  if (!wasSignUp && isSignUp.value) {
    authMethod.value = 'password';
  }
};
</script>

<template>
  <section
    id="auth-form"
    class="py-12 md:py-16 px-4"
  >
    <div class="container mx-auto max-w-md">
      <div
        class="dark:bg-gray-800/70 bg-gray-100/90 backdrop-blur-xs rounded-xl p-6 md:p-8 border border-primary/20 shadow-lg"
      >
        <div class="text-center mb-6">
          <h2
            class="text-2xl font-bold dark:text-white text-gray-900 mb-2 font-heading"
          >
            {{ isSignUp ? 'Crear cuenta' : 'Iniciar sesión' }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{
              isSignUp
                ? 'Comienza a recibir recomendaciones personalizadas'
                : 'Accede a tus recomendaciones'
            }}
          </p>
        </div>

        <!-- Tabs (only show magic link option when logging in, not signing up) -->
        <div v-if="!isSignUp" class="flex gap-2 mb-6">
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
              authMethod === 'password'
                ? 'bg-primary text-white'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-700',
            ]"
            @click="authMethod = 'password'"
          >
            Contraseña
          </button>
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm',
              authMethod === 'magic'
                ? 'bg-primary text-white'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-700',
            ]"
            @click="authMethod = 'magic'"
          >
            Enlace mágico
          </button>
        </div>

        <!-- Error message -->
        <AlertMessage v-if="error" :message="error" type="error" />

        <!-- Success message -->
        <AlertMessage
          v-if="signUpSuccess || magicLinkSent"
          :message="
            signUpSuccess
              ? '¡Revisa tu email para confirmar tu cuenta!'
              : '¡Revisa tu email para el enlace mágico!'
          "
          type="success"
        />

        <!-- Password form -->
        <form
          v-if="authMethod === 'password'"
          @submit.prevent="handlePasswordAuth"
        >
          <div class="mb-4">
            <label
              for="email"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="tu@email.com"
            />
          </div>

          <div class="mb-4">
            <label
              for="password"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Contraseña
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="isSignUp ? 'new-password' : 'current-password'"
                :required="isSignUp"
                :class="[
                  'w-full px-4 py-2 pr-10 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors',
                  isSignUp &&
                  passwordValidation &&
                  !passwordValidation.isValid &&
                  password.length > 0
                    ? 'border-red-500 dark:border-red-500'
                    : 'dark:border-gray-600 border-gray-300',
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
            <!-- Helper text (only show for signup) -->
            <p
              v-if="isSignUp"
              class="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
            >
              {{ getPasswordHelperText() }}
            </p>
            <!-- Real-time validation checklist (only show for signup when typing) -->
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

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2 px-4 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{
              loading
                ? 'Cargando...'
                : isSignUp
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'
            }}
          </button>
        </form>

        <!-- Magic link form -->
        <form v-else @submit.prevent="handleMagicLink">
          <div class="mb-4">
            <label
              for="magic-email"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="magic-email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="tu@email.com"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || magicLinkSent"
            class="w-full py-2 px-4 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{
              magicLinkSent
                ? '¡Enviado!'
                : loading
                  ? 'Enviando...'
                  : 'Enviar enlace mágico'
            }}
          </button>
        </form>

        <!-- Toggle sign up/sign in -->
        <div class="mt-4 text-center">
          <button
            v-if="authMethod === 'password'"
            type="button"
            class="text-sm text-primary hover:text-secondary transition-colors"
            @click="toggleSignUp"
          >
            {{
              isSignUp
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿No tienes cuenta? Regístrate'
            }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
