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
    <AlertMessage v-if="errorMessage" :message="errorMessage" type="error" />
    <AlertMessage
      v-if="successMessage"
      :message="successMessage"
      type="success"
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
      <div v-if="watchlistTitles.length === 0" class="py-12 text-center">
        <p class="text-gray-500 dark:text-gray-400">
          {{ $t('watchlist.empty') }}
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      >
        <div
          v-for="title in watchlistTitles"
          :key="`watchlist-${title.tmdb_id}`"
          class="relative rounded-lg border backdrop-blur-xl transition-all duration-300 group dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 hover:border-gray-400/50 dark:hover:border-white/20 hover:shadow-lg hover:shadow-gray-900/20"
        >
          <!-- Poster -->
          <nuxt-link
            :to="`/${title.type === MediaTypeEnum.movie ? 'movie' : 'tv-show'}/${title.tmdb_id}`"
            :aria-label="$t('media.viewDetailsOf', { title: title.title })"
            class="block aspect-[2/3] relative bg-gray-800 rounded-t-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-visible"
          >
            <div
              v-if="title.poster_path"
              class="overflow-hidden w-full h-full rounded-t-lg"
            >
              <img
                :src="`https://image.tmdb.org/t/p/w500${title.poster_path}`"
                :alt="title.title"
                class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div
              v-else
              class="flex overflow-hidden justify-center items-center w-full h-full text-gray-400 rounded-t-lg"
            >
              <svg
                class="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <!-- Remove Button -->
            <IconButton
              :aria-label="$t('watchlist.removeTitle', { title: title.title })"
              size="small"
              variant="default"
              custom-class="absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-sm pointer-events-auto tooltip-container bg-black/50 hover:bg-red-600/80"
              @click.stop.prevent="handleRemoveTitle(title)"
            >
              <svg
                class="w-4 h-4 text-white"
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
              <span class="tooltip">{{ $t('watchlist.removeTooltip') }}</span>
            </IconButton>

            <!-- Hover Overlay (same as RecommendationCard) -->
            <div
              class="flex absolute bottom-0 left-0 flex-col justify-center items-center px-4 w-full h-full opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100 dark:bg-black/80 bg-white/80"
            >
              <p class="font-semibold text-gray-800 dark:text-gray-300">
                {{ $t('media.viewDetails') }}
              </p>
            </div>
          </nuxt-link>

          <!-- Content -->
          <div class="p-4">
            <h3
              class="mb-1 text-sm font-semibold text-gray-800 truncate dark:text-gray-300"
            >
              {{ title.title }}
            </h3>
            <p class="mb-2 text-xs text-gray-500 dark:text-gray-300">
              {{
                title.type === MediaTypeEnum.movie
                  ? $t('media.movie')
                  : $t('media.series')
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import { getSession } from '@/composables/database/auth';
import AlertMessage from '@/components/AlertMessage.vue';
import IconButton from '@/components/ui/IconButton.vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';

const { t } = useI18n();

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
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
  poster_path: string | null;
  created_at: string;
};

type WatchlistResponseItem = {
  tmdb_id: number;
  title: string;
  type: typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv;
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

onMounted(() => {
  fetchWatchlist();
});
</script>

<style scoped>
/* Ensure tooltips can escape overflow containers */
.tooltip-container:hover,
.tooltip-container:focus {
  z-index: 10000;
}

/* Ensure the card container has higher z-index when tooltip is hovered */
.group:has(.tooltip-container:hover) {
  z-index: 10002;
  position: relative;
}

.tooltip {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background-color: rgba(0, 0, 0, 0.95);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.2s ease-in-out,
    transform 0.2s ease-in-out;
  z-index: 10003;
  margin-top: 0;
}

.tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: rgba(0, 0, 0, 0.95);
}

.tooltip-container:hover .tooltip,
.tooltip-container:focus .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip-container:focus-visible .tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
