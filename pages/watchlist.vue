<template>
  <AppShell>
    <PageContainer>
    <div class="w-full pt-6 pb-6">
    <div class="mb-8">
      <h1
        class="mb-2 text-3xl font-bold text-gray-800 md:text-4xl dark:text-gray-300 font-heading"
      >
        {{ $t('watchlist.title') }}
      </h1>
      <p class="text-gray-800 dark:text-gray-300">
        {{ $t('watchlist.description') }}
      </p>
    </div>

    <!-- Alert Messages -->
    <Alert
      v-if="errorMessage"
      :message="errorMessage"
      variant="error"
      :with-transition="true"
      custom-class="mb-4"
      :show-icon="false"
    />
    <Alert
      v-if="successMessage"
      :message="successMessage"
      variant="success"
      :with-transition="true"
      custom-class="mb-4"
      :show-icon="false"
    />

    <!-- Loading State -->
    <div v-if="isLoading" class="py-12 text-center">
      <div
        class="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 animate-spin border-primary"
      ></div>
      <p class="text-gray-800 dark:text-gray-300">
        {{ $t('watchlist.loading') }}
      </p>
    </div>

    <!-- Content -->
    <div v-else>
      <EmptyState
        v-if="watchlistTitles.length === 0"
        :message="$t('watchlist.empty')"
        icon="bookmark"
        :cta-text="$t('watchlist.emptyCta')"
        :cta-action="goToRecommendations"
      />

      <div
        v-else
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <TitleCard
          v-for="title in watchlistTitles"
          :key="`watchlist-${title.tmdb_id}`"
          :title="title.title"
          :poster-path="title.poster_path"
          :link-to="getTitleLink(title.type, title.tmdb_id)"
          :link-aria-label="$t('media.viewDetailsOf', { title: title.title })"
          :image-alt="title.title"
          :no-image-aria-label="$t('media.noPosterAvailableFor', { title: title.title })"
          :type="title.type"
          :aria-label="$t('media.titleCardLabel', { title: title.title })"
        >
          <!-- Top-right: Remove Button -->
          <template #top-right-actions>
            <Tooltip :text="$t('watchlist.removeTooltip')">
              <IconButton
                :aria-label="$t('watchlist.removeTitle', { title: title.title })"
                size="small"
                variant="default"
                custom-class="p-2 rounded-full backdrop-blur-sm pointer-events-auto w-fit h-fit bg-black/50 hover:bg-red-600/80"
                @click.stop.prevent="handleRemoveTitle(title)"
              >
                <IconX icon-class="w-4 h-4 text-white" />
              </IconButton>
            </Tooltip>
          </template>
        </TitleCard>
      </div>
    </div>
    </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import { getSession } from '@/services/auth';
import Alert from '@/components/ui/Alert.vue';
import IconButton from '@/components/ui/IconButton.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import TitleCard from '@/components/TitleCard.vue';
import IconX from '@/components/icons/IconX.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import EmptyState from '@/components/EmptyState.vue';

const { t, locale } = useI18n();

// SEO: Private page - noindex, nofollow
useHead({
  title: t('watchlist.title'),
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
  ],
});

useSeoMeta({
  title: t('watchlist.title'),
  description: t('watchlist.description'),
  robots: 'noindex, nofollow',
});

type WatchlistTitle = {
  tmdb_id: number;
  title: string;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  poster_path: string | null;
  created_at: string;
};

type WatchlistResponseItem = {
  tmdb_id: number;
  title: string;
  type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  poster_path: string | null;
  created_at: string;
};

const isLoading = ref(true);
const watchlistTitles = ref<WatchlistTitle[]>([]);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const isRemoving = ref(false);

const fetchWatchlist = async () => {
  try {
    isLoading.value = true;

    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      isLoading.value = false;
      return;
    }

    const response = await $fetch<{ watchlist: WatchlistResponseItem[] }>(
      '/api/users/watchlist',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    watchlistTitles.value = (response.watchlist || []).map((item) => ({
      tmdb_id: item.tmdb_id,
      title: item.title || t('watchlist.noTitle'),
      type: item.type,
      poster_path: item.poster_path,
      created_at: item.created_at,
    }));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching watchlist:', error);
    }
    showError(t('watchlist.errorLoading'));
  } finally {
    isLoading.value = false;
  }
};

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

// Get routeWithLang for building language-prefixed links
const { routeWithLang } = useRouteWithLang();

// Helper function to generate link with language prefix
const getTitleLink = (type: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV, tmdbId: number): string => {
  const mediaType = type === MEDIA_TYPE.MOVIE ? 'movie' : 'tv-show';
  return routeWithLang(`/${mediaType}/${tmdbId}`);
};

// Navigate to recommendations (home page)
const goToRecommendations = () => {
  navigateTo(routeWithLang('/'), { replace: false });
};

const handleRemoveTitle = async (title: WatchlistTitle) => {
  if (isRemoving.value) return;

  isRemoving.value = true;
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showError(t('watchlist.notAuthenticated'));
      isRemoving.value = false;
      return;
    }

    // Delete title status
    await $fetch('/api/users/title-status', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: title.tmdb_id,
      },
    });

    // Optimistic UI update
    watchlistTitles.value = watchlistTitles.value.filter(
      (t) => t.tmdb_id !== title.tmdb_id
    );

    showSuccess(t('watchlist.titleRemoved'));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error removing title:', error);
    }
    showError(t('watchlist.errorRemoving'));
    await fetchWatchlist();
  } finally {
    isRemoving.value = false;
  }
};

// Watch for locale changes and refresh watchlist
watch(
  () => locale.value,
  async (newLocale, oldLocale) => {
    if (newLocale && oldLocale && newLocale !== oldLocale) {
      if (import.meta.dev) {
        console.log('[watchlist.vue] Language changed, refreshing watchlist:', {
          oldLocale,
          newLocale,
        });
      }
      // Refresh watchlist with new language
      await fetchWatchlist();
    }
  },
  { immediate: false }
);

onMounted(() => {
  fetchWatchlist();
});
</script>

<style scoped>
/* Ensure the card container has higher z-index when tooltip is hovered */
.group:has(.tooltip-container:hover) {
  z-index: 10002;
  position: relative;
}
</style>
