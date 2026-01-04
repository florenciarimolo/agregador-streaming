<template>
  <Section>
    <section
      class="relative flex flex-col items-center justify-between gap-16 dark:text-gray-300 text-gray-800 w-full flex-shrink-0 min-h-[400px] lg:flex-row lg:items-center lg:p-16 lg:bg-gray-100/80 dark:lg:bg-gray-900/40 lg:backdrop-blur-xl lg:border lg:gap-7 rounded-3xl lg:border-gray-300/50 lg:dark:border-primary-800 lg:shadow-lg lg:shadow-primary/20"
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
        class="relative w-full max-w-[60%] mx-auto lg:max-w-80 lg:w-80 lg:mx-0 flex-shrink-0 lg:aspect-[2/3]"
        style="
          filter: drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))
            drop-shadow(0 4px 6px -4px rgb(0 0 0 / 0.1))
            drop-shadow(0 0 20px rgb(var(--color-primary) / 0.3));
        "
      >
        <div
          class="relative overflow-hidden rounded-3xl w-full aspect-[2/3] max-h-[300px] lg:h-full lg:max-h-[500px]"
        >
          <img
            :src="
              `https://image.tmdb.org/t/p/w780` + mediaWithProviders.poster_path
            "
            :alt="mediaWithProviders.title"
            class="w-full h-full object-cover lg:rounded-3xl"
          />
          <!-- Informative icons overlay (only show if user has session) -->
          <div v-if="hasSession" class="flex absolute top-2 right-2 gap-2">
            <Tooltip v-if="isLiked" :text="$t('media.liked')">
              <div
                class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
              >
                <IconHeartFilled icon-class="w-5 h-5 text-white" />
              </div>
            </Tooltip>
            <Tooltip v-if="isSeen && !isLiked" :text="$t('media.seen')">
              <div
                class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
              >
                <IconCheck icon-class="w-5 h-5 text-white" />
              </div>
            </Tooltip>
            <Tooltip v-if="isNotInterested" :text="$t('media.notInterested')">
              <div
                class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
              >
                <IconX icon-class="w-5 h-5 text-white" />
              </div>
            </Tooltip>
            <Tooltip v-if="isInWatchlist" :text="$t('media.watchLater')">
              <div
                class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
              >
                <IconClock icon-class="w-5 h-5 text-white" />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
      <div
        class="z-10 relative flex flex-col flex-1 gap-6 rounded-lg lg:p-6 lg:ml-8 w-full flex-shrink-0 min-h-[300px]"
      >
        <div class="relative flex-row text-left">
          <button
            class="inline-flex gap-2 items-center mb-4 text-sm font-medium text-gray-700 transition-colors dark:text-gray-300 hover:dark:text-white hover:text-gray-900"
            @click="handleBack"
          >
            <IconArrowLeft icon-class="w-4 h-4" />
            {{ $t('media.back') }}
          </button>
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
              <!-- MediaStatusBadge -->
              <MediaStatusBadge
                v-if="mediaType === MediaTypeEnum.tv || inTheaters"
                :in-production="inProduction"
                :in-theaters="inTheaters"
              />
              <!-- Actions Menu (only show if user has session) -->
              <ActionMenu
                v-if="hasSession"
                ref="dropdownRef"
                position="right"
                width="w-48"
                custom-class="left-0 right-auto backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 md:right-0 md:left-auto"
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
                  <!-- If title has a state, only show option to remove that state -->
                  <Button
                    v-if="isLiked"
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleRemoveLike();
                    "
                  >
                    <template #icon>
                      <IconHeart icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.removeFromLiked') }}
                  </Button>
                  <Button
                    v-else-if="isSeen && !isLiked"
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleAction(TITLE_STATUS.SEEN);
                    "
                  >
                    <template #icon>
                      <IconCheck icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.removeFromSeen') }}
                  </Button>
                  <Button
                    v-else-if="isNotInterested"
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleAction(TITLE_STATUS.NOT_INTERESTED);
                    "
                  >
                    <template #icon>
                      <IconX icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.removeFromNotInterested') }}
                  </Button>
                  <Button
                    v-else-if="isInWatchlist"
                    type="button"
                    variant="ghost"
                    size="small"
                    custom-class="justify-start w-full text-left"
                    @click.stop.prevent="
                      dropdownRef?.close();
                      handleRemoveFromWatchlist();
                    "
                  >
                    <template #icon>
                      <IconClock icon-class="w-4 h-4" />
                    </template>
                    {{ $t('media.removeFromWatchlist') }}
                  </Button>
                  <!-- If title has no state, show all options to add states -->
                  <template v-else>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      custom-class="justify-start mb-2 w-full text-left"
                      @click.stop.prevent="
                        dropdownRef?.close();
                        handleAction(TITLE_STATUS.SEEN);
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
                        handleAction(TITLE_STATUS.NOT_INTERESTED);
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
                        handleAction(TITLE_STATUS.WATCHLIST);
                      "
                    >
                      <template #icon>
                        <IconClock icon-class="w-4 h-4" />
                      </template>
                      {{ $t('media.watchLater') }}
                    </Button>
                  </template>
                </div>
              </ActionMenu>
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
                '',
              userRegion
            )
          }}</span>
        </div>
        <div
          v-if="
            mediaType === MediaTypeEnum.tv &&
            ((mediaWithProviders as any).number_of_episodes ||
              (mediaWithProviders as any).number_of_seasons)
          "
          class="flex gap-2 items-center text-gray-800 dark:text-gray-300"
        >
          <IconEpisodes icon-class="w-5 h-5" />
          <span>
            <template v-if="(mediaWithProviders as any).number_of_seasons">
              {{
                $t('media.seasonsCount', {
                  count: (mediaWithProviders as any).number_of_seasons || 0,
                })
              }}
            </template>
            <template
              v-if="
                (mediaWithProviders as any).number_of_seasons &&
                (mediaWithProviders as any).number_of_episodes
              "
              >,
            </template>
            <template v-if="(mediaWithProviders as any).number_of_episodes">
              {{
                $t('media.episodesCount', {
                  count: (mediaWithProviders as any).number_of_episodes || 0,
                })
              }}
            </template>
          </span>
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
                mediaWithProviders.title ||
                (mediaWithProviders as any).name ||
                ''
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
              :media-provider-prop-list="
                mediaWithProviders.providers?.buy || []
              "
              :watch-type-prop="$t('media.buyIn')"
              :media-title="
                mediaWithProviders.title ||
                (mediaWithProviders as any).name ||
                ''
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
              :media-provider-prop-list="
                mediaWithProviders.providers?.rent || []
              "
              :watch-type-prop="$t('media.rentIn')"
              :media-title="
                mediaWithProviders.title ||
                (mediaWithProviders as any).name ||
                ''
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
    </section>
  </Section>
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
import MediaStatusBadge from './MediaStatusBadge.vue';
import IconArrowLeft from './icons/IconArrowLeft.vue';
import IconCalendar from './icons/IconCalendar.vue';
import IconTag from './icons/IconTag.vue';
import IconEpisodes from './icons/IconEpisodes.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconHeartFilled from './icons/IconHeartFilled.vue';
import IconX from './icons/IconX.vue';
import IconClock from './icons/IconClock.vue';
import {
  TITLE_STATUS,
  type TitleStatusType,
} from '@/constants/domain/titleStatus';
import { getSession } from '@/services/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import ActionMenu from '@/components/ui/ActionMenu.vue';
import IconButton from '@/components/ui/IconButton.vue';
import Button from '@/components/ui/Button.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import { getUserLikedTitle, getTitleStatus } from '@/services/userTitleStatus';
import { useRouter } from 'vue-router';
import Section from '@/components/layout/Section.vue';
import { useUserRegion } from '@/composables/useUserRegion';

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
const dropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const isLiked = ref(false);
const isInWatchlist = ref(false);
const isSeen = ref(false);
const isNotInterested = ref(false);
const router = useRouter();
const { getUserRegion } = useUserRegion();
const userRegion = ref<string | null>(null);

// Check if user has session
const user = useSupabaseUser();
const hasSession = computed(() => !!user.value);

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

// Fetch title status on mount (only if user has session)
const fetchTitleStatus = async () => {
  // Don't fetch if no session
  if (!hasSession.value) {
    return;
  }

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    const userId = session.user?.id || (session.user as { sub?: string })?.sub;

    if (!userId) {
      return;
    }

    const { data: titleStatus } = await getTitleStatus(
      userId,
      mediaWithProviders.value.id
    );

    if (titleStatus) {
      isLiked.value = titleStatus.liked === true;
      isInWatchlist.value = titleStatus.status === TITLE_STATUS.WATCHLIST;
      isSeen.value = titleStatus.status === TITLE_STATUS.SEEN;
      isNotInterested.value =
        titleStatus.status === TITLE_STATUS.NOT_INTERESTED;
    }
  } catch (error) {
    console.error('Error fetching title status:', error);
  }
};

onMounted(async () => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  // Get user region for date formatting
  userRegion.value = await getUserRegion();
  // Only fetch title status if user has session
  if (hasSession.value) {
    await fetchTitleStatus();
  }
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

const handleAction = async (action: TitleStatusType | 'liked') => {
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
          console.log('[UNLIKE DEBUG] Title is already liked, removing it');
          // Title is already liked, remove it directly (no modal needed)
          await handleRemoveLike();
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
          status: TITLE_STATUS.SEEN,
          liked: true,
        },
      });

      showToast(
        t('home.titleAddedFavorites', { title: mediaTitle }),
        {
          label: t('home.viewFavorites'),
          action: async () => {
            await navigateTo('/lists');
          },
        },
        5000
      );

      // Update local state immediately (liked implies seen, removes watchlist)
      isLiked.value = true;
      isSeen.value = true;
      isInWatchlist.value = false;
      isNotInterested.value = false;

      // Also fetch to ensure consistency
      await fetchTitleStatus();
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

      if (action === TITLE_STATUS.NOT_INTERESTED) {
        // Update local state immediately
        isNotInterested.value = true;
        isInWatchlist.value = false;
        isSeen.value = false;
        isLiked.value = false;

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
      } else if (action === TITLE_STATUS.SEEN) {
        // Check if already seen - if so, remove it (toggle behavior)
        if (isSeen.value) {
          // Remove seen status (DELETE)
          await $fetch('/api/users/title-status', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            query: {
              tmdb_id: mediaWithProviders.value.id,
            },
          });

          // Update local state immediately
          isSeen.value = false;
          isLiked.value = false; // Removing seen also removes liked
          isInWatchlist.value = false;
          isNotInterested.value = false;

          showToast(
            t('home.titleRemovedFromSeen', { title: mediaTitle }),
            null,
            3000
          );
        } else {
          // Mark as seen
          // Update local state immediately
          isSeen.value = true;
          isInWatchlist.value = false;
          isNotInterested.value = false;
          // Note: liked is not automatically set when marking as seen

          showToast(
            t('home.titleMarkedSeen', { title: mediaTitle }),
            {
              label: t('home.viewSeen'),
              action: async () => {
                await navigateTo('/lists?tab=seen');
              },
            },
            5000
          );
        }
      } else if (action === TITLE_STATUS.WATCHLIST) {
        // Update local state immediately
        isInWatchlist.value = true;
        isSeen.value = false;
        isNotInterested.value = false;
        isLiked.value = false;

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

      // Also fetch to ensure consistency
      await fetchTitleStatus();
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

// Handle removing like directly from dropdown
const handleRemoveLike = async () => {
  const mediaTitle =
    mediaWithProviders.value.title ||
    (mediaWithProviders.value as Movie & { name?: string }).name ||
    t('media.thisTitle');

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('media.authRequired'), null, 3000);
      return;
    }

    console.log('[UNLIKE DEBUG] Removing like', {
      tmdb_id: mediaWithProviders.value.id,
      type: props.mediaType,
    });

    // Remove like (no modal needed - just updates score)
    const response = await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: mediaWithProviders.value.id,
        type: props.mediaType,
        status: TITLE_STATUS.SEEN, // Keep status as seen, just remove liked
        liked: false,
      },
    });

    console.log('[UNLIKE DEBUG] Remove like response', { response });

    // Note: Title remains as "seen" (not liked), so it should NOT be in recommendations
    // The title was already removed from recommendations when it was marked as "liked"
    // No pool regeneration needed - only score is adjusted, pool remains stable

    // Show success toast
    showToast(t('home.likeRemoved', { title: mediaTitle }), null, 3000);

    // Update local state
    isLiked.value = false;
    await fetchTitleStatus();
  } catch (error) {
    console.error('[handleRemoveLike] Error:', error);
    showToast(
      t('home.errorRemovingFavorites', { title: mediaTitle }),
      null,
      3000
    );
  }
};

// Handle back navigation
const handleBack = () => {
  // Try to get the previous route from sessionStorage
  const previousRoute = sessionStorage.getItem('previousRoute');

  if (previousRoute) {
    // Clear the stored route
    sessionStorage.removeItem('previousRoute');
    // Navigate to the previous route
    router.push(previousRoute);
  } else {
    // Check if we can go back in history (user came from within the app)
    if (window.history.length > 1) {
      router.back();
    } else {
      // User came from outside the app, go to home
      router.push('/');
    }
  }
};

// Handle removing from watchlist
const handleRemoveFromWatchlist = async () => {
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

    // Remove from watchlist by deleting the status
    await $fetch('/api/users/title-status', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      query: {
        tmdb_id: mediaWithProviders.value.id,
      },
    });

    // Update local state immediately
    isInWatchlist.value = false;

    showToast(
      t('home.titleRemovedFromWatchlist', { title: mediaTitle }),
      null,
      3000
    );

    // Also fetch to ensure consistency
    await fetchTitleStatus();
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    const mediaTitle =
      mediaWithProviders.value.title ||
      (mediaWithProviders.value as Movie & { name?: string }).name ||
      t('media.thisTitle');
    showToast(t('home.errorUpdatingStatus', { title: mediaTitle }), null, 3000);
  }
};
</script>
