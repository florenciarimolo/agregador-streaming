<template>
  <section
    class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full min-w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-stretch lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-7 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20 py-8"
  >
    <div
      class="hidden absolute inset-0 z-0 rounded-3xl lg:block"
      :style="sectionStyle"
    ></div>
    <div
      class="hidden absolute z-0 rounded-3xl lg:block bg-gray-100/90 dark:bg-gray-900/90"
      style="top: 0px; right: 0px; bottom: 0px; left: 0px"
    ></div>
    <div
      class="relative overflow-hidden rounded-3xl w-full max-w-80 lg:w-80 flex-shrink-0 aspect-[2/3]"
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
        class="object-contain w-full h-full rounded-3xl max-h-[400px] lg:max-h-[500px]"
        style="clip-path: inset(0 round 1.5rem)"
      />
    </div>
    <div
      class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg lg:p-6 lg:ml-8 w-full min-w-[300px] flex-shrink-0 min-h-[300px]"
    >
      <div class="relative flex-row text-left">
        <nuxt-link
          to="/"
          class="inline-flex gap-2 items-center mb-4 text-sm font-medium text-gray-700 transition-colors dark:text-gray-300 hover:dark:text-white hover:text-gray-900"
        >
          <IconArrowLeft icon-class="w-4 h-4" />
          {{ $t('media.back') }}
        </nuxt-link>
        <div
          class="flex flex-col gap-2 w-full xl:flex-row xl:items-center xl:justify-between"
        >
          <!-- Title with Rating inline on desktop large -->
          <div
            class="flex flex-wrap gap-3 items-center xl:flex-nowrap xl:flex-1 xl:min-w-0"
          >
            <h1
              class="text-2xl font-bold text-gray-800 break-words dark:text-gray-300 xl:flex-1 xl:min-w-0"
              >{{
                mediaWithProviders.title || (mediaWithProviders as any).name
              }}</h1
            >
            <!-- Rating inline with title on desktop large, hidden on mobile/tablet (shown below) -->
            <div class="hidden xl:block xl:flex-shrink-0">
              <RatingBadge
                v-if="mediaWithProviders.vote_average"
                :rating="mediaWithProviders.vote_average"
              />
            </div>
          </div>
          <!-- Rating, Status, Menu row (mobile/tablet) or Status, Menu (desktop large) -->
          <div class="flex flex-shrink-0 gap-3 items-center xl:gap-2">
            <!-- Rating only on mobile/tablet (hidden on desktop large, already shown above) -->
            <RatingBadge
              v-if="mediaWithProviders.vote_average"
              :rating="mediaWithProviders.vote_average"
              class="xl:hidden"
            />
            <!-- MediaStatusBagde -->
            <MediaStatusBagde
              v-if="mediaType === MediaTypeEnum.tv || inTheaters"
              :in-production="inProduction"
              :in-theaters="inTheaters"
            />
            <!-- Actions Menu -->
            <Dropdown
              ref="dropdownRef"
              position="right"
              width="w-48"
              custom-class="backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
            >
              <template #trigger>
                <IconButton
                  :icon="IconMoreVertical"
                  :aria-label="
                    $t('media.actionsMenuFor', {
                      title:
                        mediaWithProviders.title ||
                        (mediaWithProviders as any).name,
                    })
                  "
                  size="small"
                  variant="default"
                  custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm [&>svg]:text-white"
                />
              </template>
              <div class="p-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start mb-2 w-full text-left"
                  @click.stop.prevent="
                    dropdownRef?.close();
                    handleAction(TitleStatus.SEEN);
                  "
                >
                  <template #icon>
                    <IconCheck icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.seen') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start mb-2 w-full text-left"
                  @click.stop.prevent="
                    dropdownRef?.close();
                    handleAction('liked');
                  "
                >
                  <template #icon>
                    <IconHeart icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.liked') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start mb-2 w-full text-left"
                  @click.stop.prevent="
                    dropdownRef?.close();
                    handleAction(TitleStatus.NOT_INTERESTED);
                  "
                >
                  <template #icon>
                    <IconX icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.notInterested') }}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  custom-class="justify-start w-full text-left"
                  @click.stop.prevent="
                    dropdownRef?.close();
                    handleAction(TitleStatus.WATCHLIST);
                  "
                >
                  <template #icon>
                    <IconClock icon-class="w-4 h-4" />
                  </template>
                  {{ $t('media.watchLater') }}
                </Button>
              </div>
            </Dropdown>
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
        class="flex gap-2 items-center mt-2 text-gray-800 dark:text-gray-300"
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
      <div class="flex gap-2 items-center text-gray-800 dark:text-gray-300">
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
            :tmdb-id="mediaWithProviders.id"
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
            :tmdb-id="mediaWithProviders.id"
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
            :tmdb-id="mediaWithProviders.id"
          />
        </section>
        <section v-else class="text-gray-600 dark:text-gray-400">
          <p class="italic">{{ $t('media.noPlatforms') }}</p>
        </section>
      </section>
    </div>

    <!-- Modal for removing like -->
    <Modal :is-open="showRemoveLikeModal" @close="showRemoveLikeModal = false">
      <div class="flex flex-col gap-4">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-300">
          {{ $t('home.confirmRemoveLikeTitle') }}
        </h2>
        <p class="text-gray-700 dark:text-gray-300">
          {{
            $t('home.removeLikeMessage', {
              title: titleToRemoveLike?.title || '',
            }) ||
            `¿Estás seguro de que quieres quitar "${titleToRemoveLike?.title}" de tus favoritos? Se recalcularán tus recomendaciones.`
          }}
        </p>
        <div class="flex gap-3 justify-end mt-4">
          <Button
            variant="outline"
            size="medium"
            @click="showRemoveLikeModal = false"
          >
            {{ $t('common.cancel') }}
          </Button>
          <Button variant="primary" size="medium" @click="confirmRemoveLike">
            {{ $t('common.confirm') }}
          </Button>
        </div>
      </div>
    </Modal>
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
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconX from './icons/IconX.vue';
import IconClock from './icons/IconClock.vue';
import { TitleStatus } from '@/types/TitleStatus';
import { getSession } from '@/composables/database/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import Dropdown from '@/components/ui/Dropdown.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import { getUserLikedTitle } from '@/composables/database/userTitleStatus';

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
const dropdownRef = ref<InstanceType<typeof Dropdown> | null>(null);
const showRemoveLikeModal = ref(false);
const titleToRemoveLike = ref<{
  id: number;
  title: string;
  type: string;
} | null>(null);

// Detect mobile/tablet screen size (use mobile style for tablet too)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024; // lg breakpoint
};

// Handle resize
const handleResize = () => {
  checkMobile();
};

const { showToast } = useUndoToast();
const { t } = useI18n();

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
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
      console.log('[UNLIKE DEBUG] handleAction liked called', {
        title: mediaTitle,
        tmdb_id: mediaWithProviders.value.id,
        type: props.mediaType,
      });

      // Check if title is already liked
      const userId =
        session.user?.id || (session.user as { sub?: string })?.sub;
      console.log('[UNLIKE DEBUG] userId', { userId });

      if (userId) {
        const { data: likedTitle, error: likedError } = await getUserLikedTitle(
          userId,
          mediaWithProviders.value.id
        );

        console.log('[UNLIKE DEBUG] getUserLikedTitle result', {
          likedTitle,
          error: likedError,
          hasLikedTitle: !!likedTitle,
        });

        if (likedTitle) {
          console.log('[UNLIKE DEBUG] Title is already liked, showing modal');
          // Title is already liked, show confirmation modal
          titleToRemoveLike.value = {
            id: mediaWithProviders.value.id,
            title: mediaTitle,
            type: props.mediaType,
          };
          showRemoveLikeModal.value = true;
          return;
        }
      }

      console.log('[UNLIKE DEBUG] Title is not liked, adding it');

      // Title is not liked, add it
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

// Handle removing like after confirmation
const confirmRemoveLike = async () => {
  console.log('[UNLIKE DEBUG] confirmRemoveLike called', {
    title: titleToRemoveLike.value,
  });

  if (!titleToRemoveLike.value) {
    console.warn('[UNLIKE DEBUG] No title to remove like');
    return;
  }

  const title = titleToRemoveLike.value;
  showRemoveLikeModal.value = false;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      console.warn('[UNLIKE DEBUG] No session available in confirmRemoveLike');
      return;
    }

    console.log('[UNLIKE DEBUG] Removing like', {
      tmdb_id: title.id,
      type: title.type,
    });

    // Remove like
    const response = await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.id,
        type: title.type,
        status: TitleStatus.SEEN, // Keep status as seen, just remove liked
        liked: false,
      },
    });

    console.log('[UNLIKE DEBUG] Remove like response', { response });

    // Show toast about regenerating recommendations
    showToast(t('home.regeneratingRecommendations'), null, 5000);

    // Regenerate recommendation pool in background
    try {
      await $fetch('/api/recommendations/populate-pool', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (poolError) {
      console.error('[handleAction] Error regenerating pool:', poolError);
      // Don't show error to user, pool regeneration is background task
    }

    titleToRemoveLike.value = null;
  } catch (error) {
    console.error('[confirmRemoveLike] Error:', error);
    showToast(
      t('home.errorRemovingFavorites', { title: title.title }),
      null,
      3000
    );
    titleToRemoveLike.value = null;
  }
};
</script>
