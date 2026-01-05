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
        <h2 class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300">
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
        <h2 class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300">
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
        <h2 class="mb-1 text-xl font-semibold text-gray-800 dark:text-gray-300">
          {{ $t('myAccount.password.title') }}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('myAccount.password.description') }}
        </p>
      </div>
      <div class="space-y-4">
        <Input
          id="current-password"
          v-model="currentPassword"
          type="password"
          :label="$t('myAccount.password.currentPassword')"
          :placeholder="$t('auth.passwordPlaceholder')"
          autocomplete="current-password"
        />
        <Input
          id="new-password"
          v-model="newPassword"
          type="password"
          :label="$t('myAccount.password.newPassword')"
          :placeholder="$t('auth.passwordPlaceholder')"
          autocomplete="new-password"
          :error="passwordError"
        />
        <Input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          :label="$t('myAccount.password.confirmPassword')"
          :placeholder="$t('auth.passwordPlaceholder')"
          autocomplete="new-password"
        />
        <div class="flex justify-end">
          <Button
            variant="primary"
            size="small"
            :disabled="loadingPassword || !canUpdatePassword"
            @click="handleUpdatePassword"
          >
            {{ $t('myAccount.password.title') }}
          </Button>
        </div>
      </div>
    </section>

    <!-- Delete Account Section -->
    <section
      class="p-6 rounded-3xl border shadow-lg backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 md:p-8 border-red-300/50 dark:border-red-900/20"
    >
      <div class="mb-4">
        <h2 class="mb-1 text-xl font-semibold text-red-600 dark:text-red-400">
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
      <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-300">
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AvatarUpload from '@/components/AvatarUpload.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import { validatePassword } from '@/utils/passwordValidation';
import { getSession } from '@/services/auth';
import { useUndoToast } from '@/composables/useUndoToast';

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
    if (process.env.NODE_ENV === 'development') {
      console.warn('[pages/my-account.vue] useUserStore not available:', error);
    }
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

// Delete Account
const showDeleteAccountModal = ref(false);
const loadingDeleteAccount = ref(false);

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
    console.error('Error updating avatar:', error);
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
    console.error('Error updating display name:', error);
    displayNameError.value = t('myAccount.displayName.error');
    showToast(t('myAccount.displayName.error'), null);
  } finally {
    loadingDisplayName.value = false;
  }
};

const handleUpdatePassword = async () => {
  if (!canUpdatePassword.value) return;

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
      throw updateError;
    }

    // Clear form
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';

    showToast(t('myAccount.password.updated'), null);
  } catch (error) {
    console.error('Error updating password:', error);
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
    console.error('Error deleting account:', error);
    showToast(t('myAccount.deleteAccount.error'), null);
  } finally {
    loadingDeleteAccount.value = false;
    showDeleteAccountModal.value = false;
  }
};
</script>
