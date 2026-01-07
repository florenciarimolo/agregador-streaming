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
import { DEFAULT_LANGUAGE_URL_CODE } from '@/constants/urlLanguageCodes';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';

definePageMeta({
  ssr: false,
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

const supabase = useSupabaseClient();
const router = useRouter();
const route = useRoute();

const getLangFromRoute = (): string => {
  const langParam = route.params?.lang as string | undefined;
  if (langParam) {
    return langParam.toLowerCase();
  }
  return DEFAULT_LANGUAGE_URL_CODE;
};

const error = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    // Get code from URL (query params or hash)
    const code =
      (route.query.code as string) ||
      (typeof window !== 'undefined' && window.location.hash
        ? new URLSearchParams(window.location.hash.substring(1)).get('code')
        : null);

    // If we have a code, exchange it for session
    if (code) {
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        error.value = t('auth.callbackLinkExpiredOrInvalid');
        loading.value = false;
        return;
      }
    }

    // Check recovery flag (try both localStorage and sessionStorage)
    const recoveryFlag =
      localStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY) ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem(STORAGE_KEYS.AUTH_RECOVERY)
        : null);
    const lang = getLangFromRoute();

    loading.value = false;

    if (recoveryFlag) {
      router.replace(`/${lang}/auth/reset-password`);
      return;
    }

    // Default: redirect to home
    router.replace(`/${lang}/`);
  } catch {
    error.value = t('auth.callbackUnexpectedError');
    loading.value = false;
  }
});
</script>
