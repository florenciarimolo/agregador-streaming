<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pt-6 pb-6">
        <div class="mb-8">
          <h1 class="mb-2 text-3xl font-bold text-gray-800 dark:text-gray-300">
            {{ $t('myAccount.title') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400">
            {{ $t('myAccount.description') }}
          </p>
        </div>

        <!-- Avatar Section -->
        <section
          class="p-6 mb-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-gray-300/50 dark:border-white/10"
        >
          <div class="mb-4">
            <h2
              class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('myAccount.avatar.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('myAccount.avatar.description') }}
            </p>
          </div>
          <div class="flex justify-center">
            <AvatarUpload
              :avatar-url="userProfile?.avatar_url"
              :display-name="userProfile?.display_name"
              :email="currentUser?.email"
              :user-id="userId"
              size="xl"
              @uploaded="handleAvatarUploaded"
              @error="handleAvatarError"
            />
          </div>
        </section>

        <!-- Display Name Section -->
        <section
          class="p-6 mb-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-gray-300/50 dark:border-white/10"
        >
          <div class="mb-4">
            <h2
              class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('myAccount.displayName.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('myAccount.displayName.description') }}
            </p>
          </div>
          <div class="space-y-4">
            <Input
              id="display-name"
              v-model="displayName"
              type="text"
              :label="$t('myAccount.displayName.title')"
              :placeholder="$t('myAccount.displayName.placeholder')"
              :maxlength="50"
              :error="displayNameError"
            />
            <div class="flex justify-end">
              <Button
                variant="primary"
                size="small"
                :disabled="
                  loadingDisplayName ||
                  displayName === (userProfile?.display_name || '')
                "
                @click="handleUpdateDisplayName"
              >
                {{ $t('common.save') }}
              </Button>
            </div>
          </div>
        </section>

        <!-- Change Password Section -->
        <section
          class="p-6 mb-8 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-gray-300/50 dark:border-white/10"
        >
          <div class="mb-4">
            <h2
              class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('myAccount.password.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('myAccount.password.description') }}
            </p>
          </div>
          <form class="space-y-4" @submit.prevent="handleUpdatePassword">
            <Input
              id="current-password"
              v-model="currentPassword"
              :type="showCurrentPassword ? 'text' : 'password'"
              :label="$t('myAccount.password.currentPassword')"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="current-password"
              custom-class="pr-10"
            >
              <template #icon>
                <IconButton
                  :icon="showCurrentPassword ? IconEye : IconEyeSlash"
                  :aria-label="
                    showCurrentPassword
                      ? $t('auth.hidePassword')
                      : $t('auth.showPassword')
                  "
                  size="medium"
                  variant="default"
                  custom-class="pointer-events-auto"
                  @click="showCurrentPassword = !showCurrentPassword"
                />
              </template>
            </Input>
            <Input
              id="new-password"
              v-model="newPassword"
              :type="showNewPassword ? 'text' : 'password'"
              :label="$t('myAccount.password.newPassword')"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="new-password"
              :error="
                passwordValidation &&
                !passwordValidation.isValid &&
                newPassword.length > 0
                  ? $t('auth.passwordNotValid')
                  : passwordError
              "
              custom-class="pr-10"
            >
              <template #icon>
                <IconButton
                  :icon="showNewPassword ? IconEye : IconEyeSlash"
                  :aria-label="
                    showNewPassword
                      ? $t('auth.hidePassword')
                      : $t('auth.showPassword')
                  "
                  size="medium"
                  variant="default"
                  custom-class="pointer-events-auto"
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </Input>
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
            <Input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :label="$t('myAccount.password.confirmPassword')"
              :placeholder="$t('auth.passwordPlaceholder')"
              autocomplete="new-password"
              :error="showPasswordMismatch ? $t('auth.passwordMismatch') : ''"
              custom-class="pr-10"
            >
              <template #icon>
                <IconButton
                  :icon="showConfirmPassword ? IconEye : IconEyeSlash"
                  :aria-label="
                    showConfirmPassword
                      ? $t('auth.hidePassword')
                      : $t('auth.showPassword')
                  "
                  size="medium"
                  variant="default"
                  custom-class="pointer-events-auto"
                  @click="showConfirmPassword = !showConfirmPassword"
                />
              </template>
            </Input>
            <div class="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="small"
                :disabled="loadingPassword || !canUpdatePassword"
              >
                {{ $t('myAccount.password.title') }}
              </Button>
            </div>
          </form>
        </section>

        <!-- Delete Account Section -->
        <section
          class="p-6 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-red-300/50 dark:border-red-900/20"
        >
          <div class="mb-4">
            <h2
              class="mb-1 text-xl font-semibold text-red-600 dark:text-red-400"
            >
              {{ $t('myAccount.deleteAccount.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('myAccount.deleteAccount.description') }}
            </p>
          </div>
          <Button
            variant="danger"
            size="small"
            :disabled="loadingDeleteAccount"
            @click="showDeleteAccountModal = true"
          >
            {{ $t('myAccount.deleteAccount.button') }}
          </Button>
        </section>

        <!-- Delete Account Confirmation Modal -->
        <Modal
          :is-open="showDeleteAccountModal"
          @close="showDeleteAccountModal = false"
        >
          <h3
            class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-300"
          >
            {{ $t('myAccount.deleteAccount.confirmTitle') }}
          </h3>
          <p class="mb-4 text-gray-800 dark:text-gray-300">
            {{ $t('myAccount.deleteAccount.confirmMessage') }}
          </p>
          <div class="flex gap-3 justify-end">
            <Button
              size="small"
              variant="outline"
              @click="showDeleteAccountModal = false"
            >
              {{ $t('common.cancel') }}
            </Button>
            <Button
              size="small"
              variant="danger"
              :disabled="loadingDeleteAccount"
              @click="handleDeleteAccount"
            >
              {{
                loadingDeleteAccount
                  ? $t('myAccount.deleteAccount.deleting')
                  : $t('myAccount.deleteAccount.confirmButton')
              }}
            </Button>
          </div>
        </Modal>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import AvatarUpload from '@/components/AvatarUpload.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import IconButton from '@/components/ui/IconButton.vue';
import IconEye from '@/components/icons/IconEye.vue';
import IconEyeSlash from '@/components/icons/IconEyeSlash.vue';
import IconCheck from '@/components/icons/IconCheck.vue';
import IconX from '@/components/icons/IconX.vue';
import {
  validatePassword,
  getPasswordHelperText,
} from '@/utils/passwordValidation';
import { getSession } from '@/services/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import { useUserStore } from '@/stores/user';
import { useLogger } from '@/composables/useLogger';

definePageMeta({
  middleware: 'auth',
});

const { t } = useI18n();

// SEO: Private page - noindex, nofollow
useHead({
  title: t('navbar.myAccount'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  robots: 'noindex, nofollow',
});
const router = useRouter();
const currentUser = useSupabaseUser();

// Safely get userStore - it may not be available immediately after Pinia initialization
// Use a computed to lazy-load the store, but only on client side
const userStore = computed(() => {
  // Only try to get store on client side
  if (import.meta.server) {
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      fetchProfile: async () => {},
    };
  }

  try {
    return useUserStore();
  } catch (error) {
    const { logWarn } = useLogger();
    logWarn('[MyAccount] useUserStore not available', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      profile: null,
      authInitialized: false,
      hasCompletedOnboarding: false,
      fetchProfile: async () => {},
    };
  }
});
const { showToast } = useUndoToast();

const userId = computed(() => {
  const user = currentUser.value;
  return user?.id || (user as { sub?: string })?.sub || null;
});

const userProfile = computed(() => userStore.value?.profile);

// Display Name
const displayName = ref('');
const loadingDisplayName = ref(false);
const displayNameError = ref('');

// Password
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loadingPassword = ref(false);
const passwordError = ref('');
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// Delete Account
const showDeleteAccountModal = ref(false);
const loadingDeleteAccount = ref(false);

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

const showPasswordMismatch = computed(() => {
  return (
    confirmPassword.value.length > 0 &&
    newPassword.value !== confirmPassword.value
  );
});

const canUpdatePassword = computed(() => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    return false;
  }
  if (newPassword.value !== confirmPassword.value) {
    return false;
  }
  const validation = validatePassword(newPassword.value);
  return validation.isValid;
});

onMounted(() => {
  if (userProfile.value) {
    displayName.value = userProfile.value.display_name || '';
  }
});

const handleAvatarUploaded = async (avatarUrl: string) => {
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    await $fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        avatar_url: avatarUrl,
      },
    });

    await userStore.value.fetchProfile();
    showToast(t('profile.avatarUpdated'), null);
  } catch (error) {
    const { logError } = useLogger();
    logError('[MyAccount] Error updating avatar', error as Error);
    showToast(t('profile.errorUpdating'), null);
  }
};

const handleAvatarError = (message: string) => {
  showToast(message, null);
};

const handleUpdateDisplayName = async () => {
  if (!userId.value) return;

  loadingDisplayName.value = true;
  displayNameError.value = '';

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    const response = await $fetch<{
      success: boolean;
      profile: {
        display_name?: string | null;
      };
    }>('/api/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        display_name: displayName.value.trim() || null,
      },
    });

    if (response.success) {
      await userStore.value.fetchProfile();
      showToast(t('myAccount.displayName.updated'), null);
    } else {
      throw new Error('Failed to update display name');
    }
  } catch (error) {
    const { logError } = useLogger();
    logError('[MyAccount] Error updating display name', error as Error);
    displayNameError.value = t('myAccount.displayName.error');
    showToast(t('myAccount.displayName.error'), null);
  } finally {
    loadingDisplayName.value = false;
  }
};

const handleUpdatePassword = async () => {
  // Development-only logging removed

  if (!canUpdatePassword.value) {
    return;
  }

  loadingPassword.value = true;
  passwordError.value = '';

  // Validate password
  const validation = validatePassword(newPassword.value);
  if (!validation.isValid) {
    passwordError.value = t('auth.passwordNotValid');
    loadingPassword.value = false;
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = t('myAccount.password.passwordsMismatch');
    loadingPassword.value = false;
    return;
  }

  try {
    const supabase = useSupabaseClient();

    // First, verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.value?.email || '',
      password: currentPassword.value,
    });

    if (signInError) {
      passwordError.value = t('auth.passwordNotValid');
      loadingPassword.value = false;
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (updateError) {
      const { logError } = useLogger();
      logError('[MyAccount] Password update error', updateError as Error);
      throw updateError;
    }

    // Clear form
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';

    // Show success toast
    // Use nextTick to ensure the toast is shown after all state updates
    await nextTick();
    const successMessage = t('myAccount.password.updated');
    showToast(successMessage, null);
  } catch (error) {
    const { logError } = useLogger();
    logError('[MyAccount] Error updating password', error as Error);
    passwordError.value = t('myAccount.password.error');
    showToast(t('myAccount.password.error'), null);
  } finally {
    loadingPassword.value = false;
  }
};

const handleDeleteAccount = async () => {
  if (!userId.value) return;

  loadingDeleteAccount.value = true;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    await $fetch('/api/users/account', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    showToast(t('myAccount.deleteAccount.deleted'), null);

    // Sign out and redirect to home
    const { signOut } = useAuth();
    await signOut();
    const { routeWithLang } = useRouteWithLang();
    await router.push(routeWithLang('/'));
  } catch (error) {
    const { logError } = useLogger();
    logError('[MyAccount] Error deleting account', error as Error);
    showToast(t('myAccount.deleteAccount.error'), null);
  } finally {
    loadingDeleteAccount.value = false;
    showDeleteAccountModal.value = false;
  }
};
</script>
