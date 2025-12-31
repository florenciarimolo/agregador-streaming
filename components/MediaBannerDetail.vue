<template>
  <section
    class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full min-w-full flex-shrink-0 min-h-[400px] md:flex-row md:items-stretch md:p-16 md:bg-gray-100/80 dark:md:bg-gray-900/40 md:backdrop-blur-xl md:border md:gap-7 rounded-3xl md:border-gray-300/50 md:dark:border-primary-800 md:shadow-lg md:shadow-primary/20 py-8"
  >
    <div
      class="absolute inset-0 z-0 hidden md:block rounded-3xl"
      :style="sectionStyle"
    ></div>
    <div
      class="absolute z-0 hidden md:block rounded-3xl bg-gray-100/90 dark:bg-gray-900/90"
      style="top: 0px; right: 0px; bottom: 0px; left: 0px"
    ></div>
    <div
      class="relative overflow-hidden rounded-xl w-full max-w-80 md:w-80 flex-shrink-0 aspect-[2/3]"
      style="
        filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))
          drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1))
          drop-shadow(0 0 20px rgb(var(--color-primary) / 0.3));
      "
    >
      <img
        :src="
          `https://image.tmdb.org/t/p/w780` + mediaWithProviders.poster_path
        "
        :alt="mediaWithProviders.title"
        class="object-cover w-full h-full rounded-xl"
        style="clip-path: inset(0 round 0.75rem)"
      />
    </div>
    <div
      class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg md:p-6 md:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
    >
      <div class="text-left relative flex-row">
        <nuxt-link
          to="/"
          class="inline-flex items-center gap-2 mb-4 text-sm font-medium dark:text-gray-300 text-gray-700 hover:dark:text-white hover:text-gray-900 transition-colors"
        >
          <IconArrowLeft icon-class="w-4 h-4" />
          {{ $t('media.back') }}
        </nuxt-link>
        <div class="flex flex-row items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold dark:text-gray-300 text-gray-800">{{
              mediaWithProviders.title || (mediaWithProviders as any).name
            }}</h1>
            <RatingBadge
              v-if="mediaWithProviders.vote_average"
              :rating="mediaWithProviders.vote_average"
            />
          </div>
          <div class="flex items-center gap-2">
            <!-- MediaStatusBagde positioned to the right in desktop -->
            <MediaStatusBagde
              v-if="mediaType === MediaTypeEnum.tv || inTheaters"
              :in-production="inProduction"
              :in-theaters="inTheaters"
            />
            <!-- Actions Menu -->
            <div class="relative">
              <button
                type="button"
                :aria-label="
                  $t('media.actionsMenuFor', {
                    title:
                      mediaWithProviders.title ||
                      (mediaWithProviders as any).name,
                  })
                "
                class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50"
                @click.stop.prevent="showMenu = !showMenu"
                @mousedown.stop.prevent
              >
                <IconMoreVertical icon-class="w-4 h-4 text-white" />
              </button>

              <!-- Dropdown Menu -->
              <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <div
                  v-if="showMenu"
                  class="absolute right-0 mt-2 w-48 dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 z-50"
                  @click.stop
                >
                  <div class="p-4">
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                      @click.stop.prevent="handleAction(TitleStatus.SEEN)"
                    >
                      <svg
                        class="w-4 h-4"
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
                      {{ $t('media.seen') }}
                    </button>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                      @click.stop.prevent="handleAction('liked')"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      {{ $t('media.liked') }}
                    </button>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2 mb-2"
                      @click.stop.prevent="
                        handleAction(TitleStatus.NOT_INTERESTED)
                      "
                    >
                      <svg
                        class="w-4 h-4"
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
                      {{ $t('media.notInterested') }}
                    </button>
                    <button
                      type="button"
                      class="w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left flex items-center gap-2"
                      @click.stop.prevent="handleAction(TitleStatus.WATCHLIST)"
                    >
                      <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {{ $t('media.watchLater') }}
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>

      <p
        :class="[
          'dark:text-gray-300 text-gray-800',
          { italic: !mediaWithProviders.overview },
        ]"
        >{{ mediaWithProviders.overview || $t('media.noDescription') }}</p
      >
      <div
        class="mt-2 flex items-center gap-2 dark:text-gray-300 text-gray-800"
      >
        <IconCalendar icon-class="w-5 h-5" />
        <span>{{
          formatDateToSpanish(
            mediaWithProviders.release_date ||
              (mediaWithProviders as any).first_air_date ||
              ''
          )
        }}</span>
      </div>
      <div class="flex items-center gap-2 dark:text-gray-300 text-gray-800">
        <IconTag icon-class="w-5 h-5" />
        <span>{{
          mediaWithProviders?.genres
            ?.map((genre: Genre) => genre.name)
            .join(', ') || $t('media.notAvailable')
        }}</span>
      </div>
      <!-- Displaying watch providers with their logos-->
      <section class="flex flex-col gap-6">
        <section v-if="hasAvailableProviders" class="flex flex-col gap-8">
          <ProviderList
            :media-provider-prop-list="
              mediaWithProviders.providers?.flatrate || []
            "
            :watch-type-prop="$t('media.watchIn')"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />

          <ProviderList
            :media-provider-prop-list="mediaWithProviders.providers?.buy || []"
            :watch-type-prop="$t('media.buyIn')"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />

          <ProviderList
            :media-provider-prop-list="mediaWithProviders.providers?.rent || []"
            :watch-type-prop="$t('media.rentIn')"
            :media-title="
              mediaWithProviders.title || (mediaWithProviders as any).name || ''
            "
            :original-title="
              mediaWithProviders.original_title ||
              (mediaWithProviders as any).original_name ||
              ''
            "
            :alternative-titles="alternativeTitles"
            :media-type="mediaType"
          />
        </section>
        <section v-else class="dark:text-gray-400 text-gray-600">
          <p class="italic">{{ $t('media.noPlatforms') }}</p>
        </section>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import RatingBadge from './RatingBadge.vue';
import type { Media } from '@/types/Media';
import { computed, onMounted, PropType, ref } from 'vue';
import { onUnmounted } from 'vue';
import { formatDateToSpanish } from '@/utils/formatDate';
import type { Genre } from '@/types/Genre';
import ProviderList from './ProviderList.vue';
import type { Movie } from '@/types/Movie';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import MediaStatusBagde from './MediaStatusBagde.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconCalendar from './icons/IconCalendar.vue';
import IconTag from './icons/IconTag.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import { TitleStatus } from '@/types/TitleStatus';
import { getSession } from '@/composables/database/auth';
import { useUndoToast } from '@/composables/useUndoToast';

const props = defineProps({
  media: {
    type: Object as PropType<Media>,
    required: true,
  },
  mediaType: {
    type: String as PropType<MediaTypeEnum>,
    required: true,
  },
  inProduction: {
    type: Boolean,
    required: false,
  },
  inTheaters: {
    type: Boolean,
    required: false,
    default: false,
  },
});

const mediaWithProviders = computed(() => props.media as unknown as Movie);

const hasAvailableProviders = computed(() => {
  return (
    (mediaWithProviders.value.providers?.flatrate?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.buy?.length || 0) > 0 ||
    (mediaWithProviders.value.providers?.rent?.length || 0) > 0
  );
});

// Extract alternative titles for Spain (with types)
const alternativeTitles = computed(() => {
  const media = mediaWithProviders.value as Movie & {
    alternative_titles?: {
      titles: Array<{ title: string; type: string; iso_3166_1: string }>;
    };
  };
  if (media.alternative_titles?.titles) {
    // Filter for Spain and return objects with title and type
    return media.alternative_titles.titles
      .filter((alt) => alt.iso_3166_1 === 'ES')
      .map((alt) => ({ title: alt.title, type: alt.type }));
  }
  return [];
});

const isMobile = ref(false);

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

const showMenu = ref(false);
const { showToast } = useUndoToast();
const { t } = useI18n();

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest('.menu-button') && !target.closest('.absolute.right-0')) {
    showMenu.value = false;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClickOutside);
});

const backgroundImage = computed(() => {
  if (mediaWithProviders.value.backdrop_path) {
    return `https://image.tmdb.org/t/p/w780${mediaWithProviders.value.backdrop_path}`;
  }
  return '';
});

const sectionStyle = computed(() => ({
  backgroundImage: isMobile.value ? '' : `url(${backgroundImage.value})`,
  backgroundSize: isMobile.value ? 'contain' : 'cover',
  backgroundPosition: isMobile.value ? 'center' : 'center',
}));

const handleAction = async (action: TitleStatus | 'liked') => {
  showMenu.value = false;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    const mediaTitle =
      mediaWithProviders.value.title ||
      (mediaWithProviders.value as Movie & { name?: string }).name ||
      t('media.thisTitle');

    if (action === 'liked') {
      // Update or insert with liked=true and status=seen
      await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: mediaWithProviders.value.id,
          type: props.mediaType,
          status: TitleStatus.SEEN,
          liked: true,
        },
      });

      showToast(
        t('home.titleAddedFavorites', { title: mediaTitle }),
        {
          label: t('home.viewFavorites'),
          action: async () => {
            await navigateTo('/profile');
          },
        },
        5000
      );
    } else {
      // Update status
      await $fetch('/api/users/title-status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          tmdb_id: mediaWithProviders.value.id,
          type: props.mediaType,
          status: action,
        },
      });

      if (action === TitleStatus.NOT_INTERESTED) {
        showToast(
          t('home.titleMarkedNotInterested', { title: mediaTitle }),
          {
            label: t('undo.undo'),
            action: async () => {
              await $fetch('/api/users/title-status', {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                query: {
                  tmdb_id: mediaWithProviders.value.id,
                },
              });
            },
          },
          7000
        );
      } else if (action === TitleStatus.SEEN) {
        showToast(
          t('home.titleMarkedSeen', { title: mediaTitle }),
          {
            label: t('home.viewSeen'),
            action: async () => {
              await navigateTo('/seen');
            },
          },
          5000
        );
      } else if (action === TitleStatus.WATCHLIST) {
        showToast(
          t('home.titleSavedWatchlist', { title: mediaTitle }),
          {
            label: t('home.viewList'),
            action: async () => {
              await navigateTo('/watchlist');
            },
          },
          5000
        );
      }
    }
  } catch (error) {
    console.error('Error handling action:', error);
    const mediaTitle =
      mediaWithProviders.value.title ||
      (mediaWithProviders.value as Movie & { name?: string }).name ||
      t('media.thisTitle');
    showToast(t('home.errorUpdatingStatus', { title: mediaTitle }), null, 3000);
  }
};
</script>
