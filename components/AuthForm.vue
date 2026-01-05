<script setup lang="ts">
import { STORAGE_KEYS } from '@/constants/storage/keys';
import {
  validatePassword,
  getPasswordHelperText,
} from '@/utils/passwordValidation';
import Input from '@/components/ui/Input.vue';
import TabButton from '@/components/ui/TabButton.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Alert from '@/components/ui/Alert.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeSlash from '@/components/icons/IconEyeSlash.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconX from '@/components/icons/IconX.vue';
import { useUserStore } from '@/stores/user';

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

withDefaults(
  defineProps<{
    inModal?: boolean;
  }>(),
  {
    inModal: false,
  }
);

const emit = defineEmits<{
  success: [];
  signup: [];
}>();

const { t } = useI18n();

// Auth composables
const { signIn, signUp, signInWithMagicLink, resetPassword } = useAuth();

// Safely get userStore - it may not be available immediately after Pinia initialization
// Use a computed to lazy-load the store, but only on client side
const userStore = computed(() => {
  // Only try to get store on client side
  if (import.meta.server) {
    return {
      setUser: () => {},
      fetchProfile: async () => {},
      profile: null,
      hasCompletedOnboarding: false,
    };
  }

  try {
    return useUserStore();
  } catch (error) {
    // If store is not available, return a fallback object
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthForm] useUserStore not available:', error);
    }
    return {
      setUser: () => {},
      fetchProfile: async () => {},
      profile: null,
      hasCompletedOnboarding: false,
    };
  }
});

// Form state
const email = ref('');
const password = ref('');
const displayName = ref('');
const authMethod = ref<'password' | 'magic' | 'forgot'>('password');
const isSignUp = ref(false);
const loading = ref(false);
const error = ref('');
const magicLinkSent = ref(false);
const signUpSuccess = ref(false);
const showPassword = ref(false);
const forgotPasswordSent = ref(false);

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
      error.value = t('auth.passwordNotValid');
      loading.value = false;
      return;
    }
  }

  try {
    let result;
    if (isSignUp.value) {
      result = await signUp(
        email.value,
        password.value,
        displayName.value.trim() || null
      );
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
      displayName.value = '';
      emit('signup');
      return;
    }

    // Handle signin success
    if (!isSignUp.value) {
      console.log(
        '[AuthForm] Signin success, loading profile and navigating...'
      );

      // Wait for Supabase to update the session and useSupabaseUser to be available
      let attempts = 0;
      let currentUser = useSupabaseUser();

      // Wait up to 3 seconds for user to be available
      while (!currentUser.value && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        currentUser = useSupabaseUser();
        attempts++;
      }

      const userId = getUserId(currentUser.value);
      console.log('[AuthForm] User check:', {
        hasUser: !!currentUser.value,
        userId,
        attempts,
      });

      if (currentUser.value && userId) {
        console.log(
          '[AuthForm] User available, setting in store and fetching profile...'
        );
        userStore.value.setUser(currentUser.value);

        // CRITICAL: Fetch profile to ensure it's loaded before navigation
        await userStore.value.fetchProfile();

        console.log('[AuthForm] Profile fetched:', {
          hasProfile: !!userStore.value.profile,
          onboarding_completed: userStore.value.profile?.onboarding_completed,
        });

        // Step: Eliminar el flag auth:recovery si existe (después de recuperar contraseña)
        // Esto se hace cuando el usuario inicia sesión manualmente después de recuperar la contraseña
        if (typeof window !== 'undefined') {
          const recoveryFlag = localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY);
          if (recoveryFlag) {
            // Check both new format (JSON) and legacy format (string '1')
            let hasRecoveryFlag = false;
            try {
              const parsed = JSON.parse(recoveryFlag);
              hasRecoveryFlag = parsed.value === 1;
            } catch {
              hasRecoveryFlag = recoveryFlag === '1';
            }

            if (hasRecoveryFlag) {
              console.log(
                '[AuthForm] Removing auth:recovery flag after successful login'
              );
              localStorage.removeItem(STORAGE_KEYS.AUTH_RECOVERY);
            }
          }
        }

        // Wait a bit to ensure all state updates are processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Emit success event to close modal
        emit('success');

        // Navigate based on onboarding status
        // This ensures the middleware sees the correct state
        const { routeWithLang } = useRouteWithLang();
        const hasCompletedOnboarding = userStore.value.hasCompletedOnboarding;
        if (hasCompletedOnboarding) {
          console.log(
            '[AuthForm] User completed onboarding, navigating to home'
          );
          await navigateTo(routeWithLang('/'), { replace: true });
        } else {
          console.log(
            '[AuthForm] User not completed onboarding, navigating to /onboarding'
          );
          await navigateTo(routeWithLang('/onboarding'), { replace: true });
        }
      } else {
        // Fallback: navigate to home using Nuxt navigation
        // This prevents full page reload and ensures Pinia is initialized before middleware runs
        const { routeWithLang } = useRouteWithLang();
        console.log(
          '[AuthForm] User not available after waiting, navigating to home'
        );
        await navigateTo(routeWithLang('/'), { replace: true });
      }
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('auth.genericError');
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
    error.value = err instanceof Error ? err.message : t('auth.genericError');
  } finally {
    loading.value = false;
  }
};

const toggleSignUp = () => {
  const wasSignUp = isSignUp.value;
  isSignUp.value = !isSignUp.value;
  signUpSuccess.value = false;
  error.value = '';
  forgotPasswordSent.value = false;
  displayName.value = '';
  // Reset to password method when switching to sign up
  if (!wasSignUp && isSignUp.value) {
    authMethod.value = 'password';
  }
};

const handleForgotPassword = async () => {
  console.log('[AUTH TRACE] authform.vue handleForgotPassword called', {
    email: email.value,
  });
  loading.value = true;
  error.value = '';
  forgotPasswordSent.value = false;

  try {
    const result = await resetPassword(email.value);
    console.log('[AUTH TRACE] authform.vue resetPassword result', {
      hasError: !!result.error,
      error: result.error?.message,
    });

    if (result.error) {
      // Translate common error messages to Spanish
      const errorMessage = result.error.message || '';
      const errorCode = (result.error as { code?: string }).code || '';

      // Check for specific error code and message
      if (
        errorCode === 'unexpected_failure' &&
        errorMessage.includes('Error sending recovery email')
      ) {
        error.value = t('auth.recoveryEmailError');
      } else if (errorMessage.includes('email')) {
        error.value = t('auth.invalidEmail');
      } else if (
        errorMessage.includes('rate limit') ||
        errorMessage.includes('too many')
      ) {
        error.value = t('auth.tooManyAttempts');
      } else if (
        errorMessage.includes('not found') ||
        errorMessage.includes('no user')
      ) {
        error.value = t('auth.accountNotFound');
      } else {
        error.value = t('auth.recoveryLinkError');
      }
      return;
    }

    forgotPasswordSent.value = true;
    console.log(
      '[AUTH TRACE] authform.vue forgot password email sent successfully'
    );
  } catch (err: unknown) {
    console.error('[AUTH TRACE] authform.vue forgot password error', err);
    error.value = t('auth.requestError');
  } finally {
    loading.value = false;
  }
};

const showForgotPassword = () => {
  authMethod.value = 'forgot';
  error.value = '';
  forgotPasswordSent.value = false;
};

const backToLogin = () => {
  authMethod.value = 'password';
  error.value = '';
  forgotPasswordSent.value = false;
};
</script>

<template>
  <section id="auth-form" :class="[inModal ? '' : 'py-16 md:pb-0 md:px-4']">
    <div :class="[inModal ? 'w-full' : 'container mx-auto max-w-md']">
      <div
        :class="[
          inModal
            ? 'p-6'
            : 'p-6 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-gray-300/50 dark:border-white/10',
        ]"
      >
        <div class="mb-6 text-center">
          <h2
            class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-300 font-heading"
          >
            {{ isSignUp ? t('auth.createAccount') : t('auth.signIn') }}
          </h2>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            {{
              isSignUp
                ? t('auth.signUpDescription')
                : t('auth.signInDescription')
            }}
          </p>
        </div>

        <!-- Tabs (only show magic link option when logging in, not signing up) -->
        <div
          v-if="!isSignUp && authMethod !== 'forgot'"
          class="flex gap-2 mb-6"
        >
          <TabButton
            :is-active="authMethod === 'password'"
            full-width
            @click="authMethod = 'password'"
          >
            {{ t('auth.passwordTab') }}
          </TabButton>
          <TabButton
            :is-active="authMethod === 'magic'"
            full-width
            @click="authMethod = 'magic'"
          >
            {{ t('auth.magicLinkTab') }}
          </TabButton>
        </div>

        <!-- Error message -->
        <Alert
          v-if="error"
          :message="error"
          variant="error"
          :with-transition="true"
          custom-class="mb-4"
          :show-icon="false"
        />

        <!-- Success message -->
        <Alert
          v-if="signUpSuccess || magicLinkSent || forgotPasswordSent"
          :message="
            signUpSuccess
              ? t('auth.checkEmailConfirm')
              : forgotPasswordSent
                ? t('auth.checkEmailRecovery')
                : t('auth.checkEmailMagicLink')
          "
          variant="success"
          :with-transition="true"
          custom-class="mb-4"
          :show-icon="false"
        />

        <!-- Password form -->
        <form
          v-if="authMethod === 'password'"
          @submit.prevent="handlePasswordAuth"
        >
          <div class="mb-4">
            <Input
              id="email"
              v-model="email"
              type="email"
              :label="t('auth.emailLabel')"
              :placeholder="t('auth.emailPlaceholderAuth')"
              :required="isSignUp"
              input-style="
                background-color: transparent !important;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
              "
            />
          </div>

          <div v-if="isSignUp" class="mb-4">
            <Input
              id="display-name"
              v-model="displayName"
              type="text"
              :label="t('auth.displayNameLabel')"
              :placeholder="t('auth.displayNamePlaceholder')"
              :maxlength="50"
              required
              input-style="
                background-color: transparent !important;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
              "
            />
          </div>

          <div class="mb-4">
            <Input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :autocomplete="isSignUp ? 'new-password' : 'current-password'"
              :label="t('auth.passwordLabel')"
              :required="isSignUp"
              placeholder="••••••••"
              :error="
                isSignUp &&
                passwordValidation &&
                !passwordValidation.isValid &&
                password.length > 0
                  ? t('auth.passwordNotValid')
                  : ''
              "
              input-style="
                  background-color: transparent !important;
                  -webkit-background-color: transparent !important;
                  -moz-background-color: transparent !important;
                  -o-background-color: transparent !important;
                  -ms-background-color: transparent !important;
                "
              custom-class="pr-10"
            >
              <template #icon>
                <IconButton
                  :icon="showPassword ? IconEye : IconEyeSlash"
                  :aria-label="
                    showPassword
                      ? t('auth.hidePassword')
                      : t('auth.showPassword')
                  "
                  size="medium"
                  variant="default"
                  custom-class="pointer-events-auto"
                  @click="showPassword = !showPassword"
                />
              </template>
            </Input>
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
                    label: t('auth.passwordMinChars'),
                  },
                  {
                    key: 'hasUppercase',
                    label: t('auth.passwordUppercase'),
                  },
                  {
                    key: 'hasLowercase',
                    label: t('auth.passwordLowercase'),
                  },
                  {
                    key: 'hasNumber',
                    label: t('auth.passwordNumber'),
                  },
                  {
                    key: 'hasSpecialChar',
                    label: t('auth.passwordSymbol'),
                  },
                ]"
                :key="check.key"
                class="flex gap-2 items-center text-xs"
              >
                <IconCheck
                  v-if="
                    passwordValidation.checks[
                      check.key as keyof typeof passwordValidation.checks
                    ]
                  "
                  icon-class="flex-shrink-0 w-4 h-4 text-green-500"
                />
                <IconX
                  v-else
                  icon-class="flex-shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500"
                />
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
            class="px-6 py-3 w-full text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed border-primary-600/50"
          >
            {{
              loading
                ? t('auth.loadingButton')
                : isSignUp
                  ? t('auth.createAccountButton')
                  : t('auth.signInButton')
            }}
          </button>
        </form>

        <!-- Forgot password form -->
        <form
          v-else-if="authMethod === 'forgot'"
          @submit.prevent="handleForgotPassword"
        >
          <div class="mb-4">
            <Input
              id="forgot-email"
              v-model="email"
              type="email"
              :label="t('auth.emailField')"
              placeholder="tu@email.com"
              required
              input-style="
                background-color: transparent !important;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
              "
            />
          </div>

          <button
            type="submit"
            :disabled="loading || forgotPasswordSent"
            class="px-6 py-3 w-full text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed border-primary-600/50"
          >
            {{
              forgotPasswordSent
                ? t('auth.emailSent')
                : loading
                  ? t('auth.sending')
                  : t('auth.sendRecoveryLink')
            }}
          </button>

          <!-- Back to login -->
          <div class="mt-4 text-center">
            <a
              href="#"
              class="inline-block text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
              @click.prevent="backToLogin"
            >
              {{ t('auth.backToSignIn') }}
            </a>
          </div>
        </form>

        <!-- Magic link form -->
        <form v-else @submit.prevent="handleMagicLink">
          <div class="mb-4">
            <Input
              id="magic-email"
              v-model="email"
              type="email"
              :label="t('auth.emailLabel')"
              :placeholder="t('auth.emailPlaceholderAuth')"
              required
              input-style="
                background-color: transparent !important;
                -webkit-appearance: none;
                -moz-appearance: none;
                appearance: none;
              "
            />
          </div>

          <button
            type="submit"
            :disabled="loading || magicLinkSent"
            class="px-6 py-3 w-full text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed border-primary-600/50"
          >
            {{
              magicLinkSent
                ? t('auth.emailSent')
                : loading
                  ? t('auth.sendingMagicLink')
                  : t('auth.sendMagicLink')
            }}
          </button>
        </form>

        <!-- Toggle sign up/sign in -->
        <div class="mt-4 text-center">
          <a
            v-if="authMethod === 'password'"
            href="#"
            class="inline-block text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            @click.prevent="toggleSignUp"
          >
            {{ isSignUp ? t('auth.alreadyHaveAccount') : t('auth.noAccount') }}
          </a>
        </div>

        <!-- Forgot password link (only show when signing in, not signing up) -->
        <div
          v-if="authMethod === 'password' && !isSignUp"
          class="mt-3 text-center"
        >
          <a
            href="#"
            class="text-sm text-gray-800 no-underline transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
            @click.prevent="showForgotPassword"
          >
            {{ t('auth.forgotPasswordLink') }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
