<template>
  <div class="flex items-center justify-center px-4 py-8 min-h-[60vh]">
    <div class="max-w-2xl mx-auto text-center">
      <!-- Error Code -->
      <div class="mb-8">
        <h1
          class="text-9xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4"
        >
          {{ error.statusCode || 404 }}
        </h1>
        <h2
          class="text-3xl md:text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ errorTitle }}
        </h2>
        <p class="text-lg dark:text-gray-300 text-gray-800 mb-8">
          {{ errorDescription }}
        </p>
      </div>

      <!-- Illustration or Icon -->
      <div class="mb-8 flex justify-center" role="img" :aria-label="errorIconLabel">
        <svg
          class="w-24 h-24 dark:text-gray-300 text-gray-800"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <!-- 404: Sad face icon -->
          <path
            v-if="error.statusCode === 404"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <!-- 500: Server error icon -->
          <g v-else-if="error.statusCode === 500">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M9 8h.01M9 16h.01"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7l2 2m0-2l-2 2M15 15l2 2m0-2l-2 2"
            />
          </g>
          <!-- Other errors: Warning triangle icon -->
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <nuxt-link
          to="/"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-300 shadow-lg"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          {{ $t('error.goHome') }}
        </nuxt-link>
        <button
          v-if="error.statusCode !== 404"
          class="inline-flex items-center gap-2 px-6 py-3 bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 hover:border-primary/50 dark:hover:border-purple-500/30 text-gray-800 dark:text-gray-300 rounded-lg font-medium transition-all duration-300"
          @click="handleError"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ $t('error.tryAgain') }}
        </button>
      </div>

      <!-- Helpful Links -->
      <div class="mt-12 pt-8 border-t border-gray-300/50 dark:border-white/10">
        <p class="text-sm dark:text-gray-400 text-gray-600 mb-4">
          {{ $t('error.alsoCan') }}
        </p>
        <div class="flex flex-wrap justify-center gap-4">
          <nuxt-link
            to="/how-it-works"
            class="text-sm text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            {{ $t('error.viewHowItWorks') }}
          </nuxt-link>
          <span class="text-gray-400">•</span>
          <nuxt-link
            to="/faq"
            class="text-sm text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            {{ $t('error.viewFaq') }}
          </nuxt-link>
          <span class="text-gray-400">•</span>
          <a
            href="mailto:hello@getupnext.io"
            class="text-sm text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            {{ $t('error.contactSupport') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ErrorProps {
  error: {
    statusCode?: number;
    statusMessage?: string;
    message?: string;
  };
}

const props = defineProps<ErrorProps>();

// Use default layout to show navbar
definePageMeta({
  layout: 'default',
});

const handleError = async () => {
  await clearError({ redirect: '/' });
};

const { t } = useI18n();

// Computed properties for error title and description
const errorTitle = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return t('error.notFoundTitle');
    case 500:
      return t('error.serverErrorTitle');
    default:
      return t('error.title');
  }
});

const errorDescription = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return t('error.notFoundDescription');
    case 500:
      return t('error.serverErrorDescription');
    default:
      return t('error.genericErrorDescription');
  }
});

// Accessibility label for the error icon
const errorIconLabel = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return t('error.iconLabel404');
    case 500:
      return t('error.iconLabel500');
    default:
      return t('error.iconLabelGeneric');
  }
});

// Computed properties for page title and description
const pageTitle = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return t('error.pageTitle404');
    case 500:
      return t('error.pageTitle500');
    default:
      return t('error.pageTitleError');
  }
});

const pageDescription = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return t('error.pageDescription404');
    case 500:
      return t('error.pageDescription500');
    default:
      return t('error.pageDescriptionError');
  }
});

// Set page title based on error
useHead({
  title: pageTitle,
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  robots: 'noindex, nofollow',
});
</script>

<style scoped>
/* Additional styles if needed */
</style>
