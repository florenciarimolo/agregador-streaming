<template>
  <div class="flex justify-center items-center px-4 min-h-screen">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <!-- Light mode -->
        <nuxt-link to="/" class="inline-block">
          <img
            src="/logo-light.png"
            :alt="$t('common.appName')"
            class="object-contain mx-auto mb-4 w-16 h-16 transition-opacity dark:hidden hover:opacity-80"
          />
        </nuxt-link>
        <!-- Dark mode -->
        <nuxt-link to="/" class="inline-block">
          <img
            src="/logo-dark.png"
            :alt="$t('common.appName')"
            class="hidden object-contain mx-auto mb-4 w-16 h-16 transition-opacity dark:block hover:opacity-80"
          />
        </nuxt-link>
        <h1 class="mb-2 text-3xl font-bold text-gray-800 dark:text-gray-300">
          {{ $t('auth.newPasswordTitle') }}
        </h1>
        <p class="text-gray-800 dark:text-gray-300">
          {{ $t('auth.newPasswordDescription') }}
        </p>
      </div>

      <div
        class="p-6 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-gray-300/50 dark:border-white/10"
      >
        <div class="mb-6 text-center">
          <h2
            class="mb-2 text-2xl font-bold text-gray-800 dark:text-gray-300 font-heading"
          >
            {{ $t('auth.newPasswordSubtitle') }}
          </h2>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            {{ $t('auth.newPasswordSubtitleDescription') }}
          </p>
        </div>

        <!-- Error message from query param -->
        <Alert
          v-if="errorMessage"
          :message="errorMessage"
          variant="error"
          :with-transition="true"
          custom-class="mb-4"
          :show-icon="false"
        />

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
          v-if="passwordReset"
          :message="$t('auth.passwordUpdatedSuccess')"
          variant="success"
          :with-transition="true"
          custom-class="mb-4"
          :show-icon="false"
        />

        <!-- Form -->
        <form
          v-if="!passwordReset && codeValidated"
          @submit.prevent="handleResetPassword"
        >
          <div class="mb-4">
            <label
              for="new-password"
              class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {{ $t('auth.newPassword') }}
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
              <IconButton
                :icon="showPassword ? IconEye : IconEyeSlash"
                :aria-label="
                  showPassword
                    ? $t('auth.hidePassword')
                    : $t('auth.showPassword')
                "
                size="medium"
                variant="default"
                custom-class="absolute right-3 top-1/2 -translate-y-1/2"
                @click="showPassword = !showPassword"
              />
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
                    label: $t('auth.passwordMinChars'),
                  },
                  {
                    key: 'hasUppercase',
                    label: $t('auth.passwordUppercase'),
                  },
                  {
                    key: 'hasLowercase',
                    label: $t('auth.passwordLowercase'),
                  },
                  {
                    key: 'hasNumber',
                    label: $t('auth.passwordNumber'),
                  },
                  {
                    key: 'hasSpecialChar',
                    label: $t('auth.passwordSymbol'),
                  },
                ]"
                :key="check.key"
                class="flex gap-2 items-center text-xs"
              >
                <svg
                  v-if="
                    passwordValidation.checks[
                      check.key as keyof typeof passwordValidation.checks
                    ]
                  "
                  class="flex-shrink-0 w-4 h-4 text-green-500"
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
                  class="flex-shrink-0 w-4 h-4 text-gray-400 dark:text-gray-500"
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
              class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {{ $t('auth.confirmPassword') }}
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
              <IconButton
                :icon="showConfirmPassword ? IconEye : IconEyeSlash"
                aria-label="
                  showConfirmPassword
                    ? $t('auth.hidePassword')
                    : $t('auth.showPassword')
                "
                size="medium"
                variant="default"
                custom-class="absolute right-3 top-1/2 -translate-y-1/2"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </div>
            <p
              v-if="
                confirmPassword.length > 0 && newPassword !== confirmPassword
              "
              class="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              {{ $t('auth.passwordMismatch') }}
            </p>
          </div>

          <div class="flex justify-center">
            <Button
              type="submit"
              variant="primary"
              size="medium"
              :disabled="loading || !passwordsMatch || !isPasswordValid"
            >
              {{
                loading
                  ? $t('media.updatingPassword')
                  : $t('media.updatePassword')
              }}
            </Button>
          </div>
        </form>

        <!-- Loading state while validating code -->
        <div
          v-if="!codeValidated && !error && !errorMessage"
          class="py-8 text-center"
        >
          <div
            class="mx-auto mb-4 w-8 h-8 rounded-full border-b-2 animate-spin border-primary"
          ></div>
          <p class="text-sm text-gray-800 dark:text-gray-300">
            {{ $t('media.validatingRecovery') }}
          </p>
        </div>

        <!-- Back to login -->
        <div
          v-if="codeValidated || error || errorMessage"
          class="flex justify-center items-center mt-4"
        >
          <Button variant="outline" size="medium" @click="router.push('/')">
            {{ $t('media.backToHome') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { STORAGE_KEYS } from '@/constants/storage/keys';
import {
  validatePassword,
  getPasswordHelperText,
} from '@/utils/passwordValidation';
import Button from '@/components/ui/Button.vue';
import IconButton from '@/components/ui/IconButton.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeSlash from '@/components/icons/IconEyeSlash.vue';
import Alert from '@/components/ui/Alert.vue';

definePageMeta({
  layout: false,
  ssr: false, // Client-side only
  middleware: [], // Recovery handled in this page, not in middleware
});

const { t } = useI18n();

useHead({
  title: t('auth.newPasswordTitle'),
});

useSeoMeta({
  title: t('auth.newPasswordTitle'),
  description: t('auth.newPasswordDescription'),
});

const supabase = useSupabaseClient();
const router = useRouter();

const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const errorMessage = ref('');
const passwordReset = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const codeValidated = ref(false);

// Allow navigation away from this page at any time
onBeforeRouteLeave((_to, _from, next) => {
  next();
});

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

// Validate recovery session
// NO intercambia codes - el callback ya lo hizo
// Solo verifica que hay una sesión de recovery usando recovery_sent_at
onMounted(async () => {
  try {
    // Protección: Verificar que estamos en el flujo de recovery correcto
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

      if (!isRecoveryFlow) {
        // No estamos en el flujo de recovery - redirigir a login
        if (process.env.NODE_ENV === 'development') {
          console.log(
            '[Reset Password] No recovery flag found, redirecting to login'
          );
        }
        router.replace('/?auth=login');
        return;
      }
    }

    // Get the current session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Reset Password] Session error:', sessionError);
      }
      error.value = t('media.sessionError');
      codeValidated.value = true;
      return;
    }

    if (!sessionData?.session) {
      error.value = t('media.noRecoverySession');
      codeValidated.value = true;
      return;
    }

    const session = sessionData.session;

    // Verify this is a recovery session using recovery_sent_at
    // This is the ONLY reliable way to detect recovery
    if (!session.user?.recovery_sent_at) {
      // Not a recovery session - redirect to home
      if (process.env.NODE_ENV === 'development') {
        console.log(
          '[Reset Password] Session is not a recovery session, redirecting to home'
        );
      }
      router.replace('/');
      return;
    }

    // Valid recovery session - show the form
    if (process.env.NODE_ENV === 'development') {
      console.log(
        '[Reset Password] Valid recovery session found, showing form'
      );
    }
    codeValidated.value = true;
  } catch (err: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Reset Password] Error:', err);
    }
    error.value = t('media.recoverySessionError');
    codeValidated.value = true;
  }
});

const handleResetPassword = async () => {
  if (!passwordsMatch.value) {
    error.value = t('auth.passwordMismatch');
    return;
  }

  if (!isPasswordValid.value) {
    error.value = t('auth.passwordNotValid');
    return;
  }

  loading.value = true;
  error.value = '';
  errorMessage.value = '';

  try {
    // Step 1: Update the password
    const { error: resetError } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (resetError) {
      console.error('[Server] Reset password error:', resetError);
      // Translate error messages to Spanish
      const errorMsg = resetError.message || '';
      if (errorMsg.includes('password')) {
        error.value = t('media.passwordUpdateError');
      } else if (errorMsg.includes('session') || errorMsg.includes('expired')) {
        error.value = t('media.sessionExpired');
      } else {
        error.value = t('media.passwordUpdateGenericError');
      }
      return;
    }

    // Step 2: Sign out from the recovery session
    // When the user clicks the recovery link, Supabase creates a temporary recovery session
    // After updating the password, this recovery session becomes a regular session
    // We need to sign out to close this session and force the user to log in with their new password
    // Note: The user didn't have a session before requesting password recovery, but Supabase
    // creates this temporary recovery session when processing the recovery link
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      // Log the error but don't fail the password reset
      // The password was already changed successfully
      console.warn(
        '[Reset Password] Error signing out from all sessions:',
        signOutError
      );
      // Continue with the flow even if signOut fails
    }

    // Step 3: Reset user store to ensure clean state
    // This ensures the store is properly cleared before redirect
    // Safely get userStore - it may not be available immediately after Pinia initialization
    try {
      const userStore = useUserStore();
      userStore.reset();
    } catch (error) {
      // If store is not available, continue anyway
      if (process.env.NODE_ENV === 'development') {
        console.warn('[reset-password] useUserStore not available:', error);
      }
    }

    passwordReset.value = true;

    // Step 4: NO eliminar el flag auth:recovery aquí
    // Se eliminará cuando el usuario inicie sesión manualmente después de recuperar la contraseña
    // Esto evita problemas de estado donde el usuario aparece logueado pero el middleware no lo detecta

    // Step 5: Wait a bit to ensure signOut is fully processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 6: Redirect to login page
    // User needs to log in again with the new password
    // Using ?auth=login to show the login form on homepage
    // Use replace to avoid adding to history
    router.replace('/?auth=login');
  } catch (err: unknown) {
    console.error('[Client] Reset password error:', err);
    error.value = t('auth.requestError');
  } finally {
    loading.value = false;
  }
};
</script>
