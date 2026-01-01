<template>
  <div class="container mx-auto max-w-4xl px-4 py-12">
    <div class="mb-8">
      <h1
        class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 mb-2 font-heading"
      >
        {{ $t('settings.title') }}
      </h1>
      <p class="text-gray-800 dark:text-gray-300">
        {{ $t('settings.description') }}
      </p>
    </div>

    <!-- Alert Messages -->
    <AlertMessage v-if="errorMessage" :message="errorMessage" type="error" />
    <AlertMessage
      v-if="successMessage"
      :message="successMessage"
      type="success"
    />

    <!-- Settings Form -->
    <div class="space-y-8">
      <!-- Theme -->
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 p-6"
      >
        <h2 class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('settings.theme.title') }}
        </h2>
        <div class="space-y-2">
          <label
            v-for="option in themeOptions"
            :key="option.value"
            class="flex items-center gap-3 cursor-pointer"
          >
            <input
              v-model="settings.theme"
              type="radio"
              :value="option.value"
              class="w-4 h-4 text-primary focus:ring-primary"
              @change="saveSettings"
            />
            <span class="text-gray-800 dark:text-gray-300">{{
              option.label
            }}</span>
          </label>
        </div>
      </div>

      <!-- Language -->
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 p-6"
      >
        <h2 class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('settings.language.title') }}
        </h2>
        <select
          v-model="settings.language"
          class="w-full px-4 py-2 dark:bg-gray-800 bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          @change="saveSettings"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <!-- Region -->
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 p-6"
      >
        <h2 class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('settings.region.title') }}
        </h2>
        <select
          v-model="settings.region"
          class="w-full px-4 py-2 dark:bg-gray-800 bg-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-gray-300 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          @change="saveSettings"
        >
          <option value="ES">España</option>
          <option value="US">United States</option>
          <option value="MX">México</option>
          <option value="AR">Argentina</option>
          <option value="CO">Colombia</option>
        </select>
      </div>

      <!-- Autoplay Trailers -->
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2
              class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-1"
            >
              {{ $t('settings.autoplayTrailers.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('settings.autoplayTrailers.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="settings.autoplayTrailers"
              type="checkbox"
              class="sr-only peer"
              @change="saveSettings"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
            ></div>
          </label>
        </div>
      </div>

      <!-- Hide Spoilers -->
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <h2
              class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-1"
            >
              {{ $t('settings.hideSpoilers.title') }}
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t('settings.hideSpoilers.description') }}
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              v-model="settings.hideSpoilers"
              type="checkbox"
              class="sr-only peer"
              @change="saveSettings"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
            ></div>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getSettings } from '@/composables/database/profiles';
import { getSession } from '@/composables/database/auth';
import { useTheme } from '@/composables/useTheme';
import AlertMessage from '@/components/AlertMessage.vue';

const { t } = useI18n();
const { theme, setTheme } = useTheme();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Auto-imported
const user = useSupabaseUser();

const settings = ref({
  theme: 'system' as 'light' | 'dark' | 'system',
  language: 'es',
  region: 'ES',
  autoplayTrailers: false,
  hideSpoilers: false,
});

const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const themeOptions = [
  { value: 'light', label: t('settings.theme.light') },
  { value: 'dark', label: t('settings.theme.dark') },
  { value: 'system', label: t('settings.theme.system') },
];

const showError = (message: string) => {
  errorMessage.value = message;
  successMessage.value = null;
  setTimeout(() => {
    errorMessage.value = null;
  }, 5000);
};

const showSuccess = (message: string) => {
  successMessage.value = message;
  errorMessage.value = null;
  setTimeout(() => {
    successMessage.value = null;
  }, 5000);
};

const loadSettings = async () => {
  const userId = user.value?.id || (user.value as { sub?: string })?.sub;
  if (!userId) return;

  try {
    const { data, error } = await getSettings(userId);
    if (error) throw error;

    if (data) {
      settings.value = {
        theme: (data.theme as 'light' | 'dark' | 'system') || 'system',
        language: data.language || 'es',
        region: data.region || 'ES',
        autoplayTrailers: data.autoplayTrailers ?? false,
        hideSpoilers: data.hideSpoilers ?? false,
      };

      // Apply theme
      if (settings.value.theme === 'system') {
        const prefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        setTheme(prefersDark ? 'dark' : 'light', false);
      } else {
        setTheme(settings.value.theme, false);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

const saveSettings = async () => {
  const userId = user.value?.id || (user.value as { sub?: string })?.sub;
  if (!userId) return;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    const response = await $fetch('/api/users/settings', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: settings.value,
    });

    if (response.success) {
      // Apply theme immediately
      if (settings.value.theme === 'system') {
        const prefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        setTheme(prefersDark ? 'dark' : 'light', false);
      } else {
        setTheme(settings.value.theme, true);
      }

      // Save to localStorage for immediate effect
      if (import.meta.client) {
        localStorage.setItem(
          'theme',
          settings.value.theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : settings.value.theme
        );
        localStorage.setItem('theme-manual', 'true');
      }

      showSuccess(t('settings.saved'));
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showError(t('settings.errorSaving'));
  }
};

onMounted(() => {
  loadSettings();
});

definePageMeta({
  middleware: 'auth',
});

useHead({
  title: t('settings.title') + ' - UpNext',
});
</script>
