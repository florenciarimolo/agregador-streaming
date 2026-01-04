<script setup lang="ts">
import { useUserStore } from '../stores/user';
import { Recommendation } from '@/types/Recommendation';
import { TitleStatus } from '@/types/TitleStatus';
import { getSession } from '@/composables/database/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import { nextTick, onMounted, computed, watch, watchEffect, ref } from 'vue';
import Card from '@/components/ui/Card.vue';
import { getUserLikedTitle } from '@/composables/database/userTitleStatus';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';

// Type for Supabase user that may have either 'id' or 'sub' as identifier
type SupabaseUserWithSub = {
  id?: string;
  sub?: string;
  [key: string]: unknown;
};

// Helper function to safely get user ID from Supabase user object
function getUserId(
  user: SupabaseUserWithSub | null | undefined
): string | undefined {
  return user?.id || user?.sub;
}

// Homepage is public - no auth required, but we need to check onboarding status
definePageMeta({
  middleware: ['auth'],
});

const { t } = useI18n();

// SEO: Home page - public version for non-authenticated users
// If user is authenticated with personalized content, set noindex
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

// Auth state - must be defined before watchEffect
const user = useSupabaseUser();
const userStore = useUserStore();

// Computed to get effective user (from composable or store during hydration)
const effectiveUser = computed(() => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  return user.value || userStore.user;
});

// Use watchEffect to ensure i18n messages are loaded before setting SEO meta
watchEffect(() => {
  const isAuthenticated =
    !!effectiveUser.value && userStore.hasCompletedOnboarding;

  useHead({
    title: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    titleTemplate: isAuthenticated ? '%s' : undefined,
    meta: [
      {
        name: 'robots',
        content: isAuthenticated ? 'noindex, nofollow' : 'index, follow',
      },
    ],
    link: [
      {
        rel: 'canonical',
        href: `${siteUrl}/`,
      },
    ],
  });

  useSeoMeta({
    title: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    description: isAuthenticated
      ? t('seo.homeDescription')
      : t('seo.homeDescriptionPublic'),
    ogTitle: isAuthenticated ? t('seo.defaultTitle') : t('seo.homeTitlePublic'),
    ogDescription: isAuthenticated
      ? t('seo.homeDescription')
      : t('seo.homeDescriptionPublic'),
    ogType: 'website',
    ogUrl: `${siteUrl}/`,
    twitterCard: 'summary_large_image',
    robots: isAuthenticated ? 'noindex, nofollow' : 'index, follow',
  });
});

// Route
const route = useRoute();
const router = useRouter();

// State
const initialProfileLoaded = ref(false);
const showAuthForm = ref(false);
const loadingRecommendations = ref(false);
const hasAttemptedLoad = ref(false); // Track if we've attempted to load recommendations at least once
const populatingPool = ref(false);
// Track loading state for individual title actions
const loadingTitles = ref<Set<number>>(new Set());
const recommendations = ref<Recommendation[]>([]);
const allRecommendations = ref<Recommendation[]>([]); // Store all recommendations before filtering
const lastFetchedMood = ref<string | null>(null);
const lastFetchedAttention = ref<string | null>(null);
const hasPreferredLanguage = ref<boolean | null>(null); // null = not checked yet, true/false = checked
const selectedContentType = ref<'all' | 'movie' | 'tv'>('all');

// Track recommendations view to update scores
const trackRecommendationsView = async (
  recommendations: Recommendation[]
): Promise<void> => {
  if (!recommendations || recommendations.length === 0) {
    return;
  }

  if (!user.value || !userStore.hasCompletedOnboarding) {
    return;
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await getSession();

    if (sessionError || !session?.access_token) {
      return;
    }

    // Extract tmdb_ids from recommendations
    const tmdbIds = recommendations
      .map((rec) => rec.tmdb_id)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    if (tmdbIds.length === 0) {
      return;
    }

    // Call track-view endpoint (don't await to avoid blocking UI)
    $fetch('/api/recommendations/track-view', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
      body: { tmdb_ids: tmdbIds },
    }).catch((error) => {
      // Silently fail - this is not critical for UX
      if (import.meta.dev) {
        console.warn('[TrackView] Error tracking recommendations view:', error);
      }
    });
  } catch (error) {
    // Silently fail - this is not critical for UX
    if (import.meta.dev) {
      console.warn('[TrackView] Error tracking recommendations view:', error);
    }
  }
};

// Fetch recommendations function
const fetchRecommendations = async (): Promise<Recommendation[]> => {
  if (!user.value || !userStore.hasCompletedOnboarding) {
    return [];
  }

  loadingRecommendations.value = true;
  try {
    const {
      data: { session },
      error: sessionError,
    } = await getSession();

    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return [];
    }

    if (!session || !session.access_token) {
      return [];
    }

    // Get mood, attention, and content type from query params
    const query = route.query;
    const queryParams: Record<string, string> = {};
    if (query.mood) queryParams.mood = query.mood as string;
    if (query.attention) queryParams.attention = query.attention as string;
    // Send content type to server when not 'all' (server-side filtering)
    if (selectedContentType.value !== 'all') {
      queryParams.type = selectedContentType.value;
    }

    const data = await $fetch<Recommendation[]>('/api/recommendations', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
      query: queryParams,
    });

    // Ensure it's an array
    const recommendations = Array.isArray(data) ? data : [];

    // Track view after fetching recommendations
    if (recommendations.length > 0) {
      trackRecommendationsView(recommendations);
    }

    return recommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  } finally {
    loadingRecommendations.value = false;
  }
};

// Filter recommendations by content type
const filterRecommendationsByType = (
  recs: Recommendation[]
): Recommendation[] => {
  if (selectedContentType.value === 'all') {
    return recs;
  }
  return recs.filter((rec) => rec.type === selectedContentType.value);
};

// Watch for content type changes to filter recommendations
watch(selectedContentType, () => {
  if (allRecommendations.value.length > 0) {
    recommendations.value = filterRecommendationsByType(
      allRecommendations.value
    );
  }
});

// Watch for query param changes (mood/attention) to refetch recommendations
watch(
  () => [route.query.mood, route.query.attention],
  async () => {
    // Only refetch if user is logged in and has completed onboarding
    if (
      user.value &&
      userStore.hasCompletedOnboarding &&
      hasAttemptedLoad.value
    ) {
      const fetched = await fetchRecommendations();
      allRecommendations.value = fetched;
      recommendations.value = filterRecommendationsByType(fetched);

      if (import.meta.dev && fetched.length > 0) {
        console.log('[Recommendations] Refetched recommendations:', {
          count: fetched.length,
          sampleTitles: fetched.slice(0, 5).map((r) => ({
            tmdb_id: r.tmdb_id,
            title: r.title,
            type: r.type,
            titleLength: r.title?.length || 0,
          })),
        });
      }
    }
  }
);

// Handle user state changes
const handleUserStateChange = async () => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  const userId = getUserId(user.value) || getUserId(userStore.user);
  const effectiveUser = user.value || userStore.user;

  if (!effectiveUser || !userId) {
    // No user: reset state (only if auth is initialized to avoid clearing during hydration)
    // AND we're not in hydration phase (to avoid clearing during brief null state)
    if (userStore.authInitialized && !isHydrating.value) {
      userStore.reset();
      recommendations.value = [];
      hasAttemptedLoad.value = false; // Reset flag when clearing state
    }
    initialProfileLoaded.value = true;
    return;
  }

  // Set user in store if different (use the one from useSupabaseUser if available, otherwise from store)
  if (!userStore.user || getUserId(userStore.user) !== userId) {
    userStore.setUser(effectiveUser);
  }

  initialProfileLoaded.value = true;
};

// Track if we're already fetching to prevent concurrent calls
const isFetchingProfile = ref(false);
const lastFetchedUserId = ref<string | null>(null);
const isHydrating = ref(true); // Track if we're still in hydration phase
const isMounted = ref(false); // Track if component is mounted

// Single reactive watcher as the single source of truth
// CRITICAL: Only watch after auth is initialized to avoid race conditions on refresh
watch(
  () => ({
    authInitialized: userStore.authInitialized,
    userId: user.value?.id || (user.value as { sub?: string })?.sub || null,
    storeUserId:
      userStore.user?.id || (userStore.user as { sub?: string })?.sub || null,
    mood: route.query.mood,
    attention: route.query.attention,
  }),
  async (newValue, oldValue) => {
    // CRITICAL: Don't execute watcher until auth is initialized
    if (!newValue.authInitialized) {
      return;
    }

    // Get effective user ID (from composable or store)
    const effectiveUserId = newValue.userId || newValue.storeUserId;
    const oldEffectiveUserId = oldValue?.userId || oldValue?.storeUserId;

    // Skip if we're already fetching
    if (isFetchingProfile.value) {
      return;
    }

    // DETERMINISTIC CHECK: Only proceed if user ID actually changed
    // This prevents execution on token refresh or tab switch
    if (effectiveUserId === oldEffectiveUserId && hasAttemptedLoad.value) {
      return;
    }

    // Handle user state changes
    await handleUserStateChange();

    // If no user, clear recommendations
    if (!effectiveUserId) {
      if (isHydrating.value && newValue.storeUserId) {
        return; // Still hydrating, wait
      }
      recommendations.value = [];
      lastFetchedUserId.value = null;
      hasAttemptedLoad.value = false;
      return;
    }

    // Check if we already loaded for this user with these params
    if (
      lastFetchedUserId.value === effectiveUserId &&
      lastFetchedMood.value === (newValue.mood as string | null) &&
      lastFetchedAttention.value === (newValue.attention as string | null) &&
      hasAttemptedLoad.value
    ) {
      return;
    }

    // Load recommendations
    isFetchingProfile.value = true;
    loadingRecommendations.value = true;
    try {
      if (!userStore.profile) {
        await userStore.ensureProfile();
      }

      if (!userStore.hasCompletedOnboarding) {
        recommendations.value = [];
        hasAttemptedLoad.value = true;
        return;
      }

      // Check preferred languages only if not already checked
      if (hasPreferredLanguage.value === null) {
        try {
          const {
            data: { session },
          } = await getSession();
          if (session?.access_token) {
            const prefsResponse = await $fetch<{
              success: boolean;
              preferences: {
                preferred_language?: string;
              } | null;
            }>('/api/users/preferences', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            hasPreferredLanguage.value = !!(
              prefsResponse.success &&
              prefsResponse.preferences?.preferred_language
            );
          } else {
            hasPreferredLanguage.value = false;
          }
        } catch (error) {
          console.error(
            '[index.vue] Error checking preferred languages:',
            error
          );
          hasPreferredLanguage.value = false;
        }
      }

      if (hasPreferredLanguage.value) {
        const fetched = await fetchRecommendations();
        allRecommendations.value = fetched;
        recommendations.value = filterRecommendationsByType(fetched);

        if (import.meta.dev && fetched.length > 0) {
          console.log('[Recommendations] Received recommendations:', {
            count: fetched.length,
            sampleTitles: fetched.slice(0, 5).map((r) => ({
              tmdb_id: r.tmdb_id,
              title: r.title,
              type: r.type,
              titleLength: r.title?.length || 0,
            })),
          });
        }

        // If no recommendations and onboarding is complete, regenerate pool automatically
        if (
          fetched.length === 0 &&
          userStore.hasCompletedOnboarding &&
          !populatingPool.value &&
          !sessionStorage.getItem('generatingRecommendations')
        ) {
          // Get session for API call
          const {
            data: { session: sessionForPool },
          } = await getSession();

          if (sessionForPool?.access_token) {
            // Set flag to prevent multiple calls
            sessionStorage.setItem('generatingRecommendations', 'true');
            populatingPool.value = true;
            try {
              await $fetch(
                '/api/recommendations/populate-pool?clearPool=true',
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${sessionForPool.access_token}`,
                  },
                }
              );
              // After generation, fetch recommendations again
              const newFetched = await fetchRecommendations();
              allRecommendations.value = newFetched;
              recommendations.value = filterRecommendationsByType(newFetched);
            } catch (error) {
              console.error('[index.vue] Error regenerating pool:', error);
            } finally {
              sessionStorage.removeItem('generatingRecommendations');
              populatingPool.value = false;
            }
          }
        } else if (
          fetched.length === 0 &&
          !populatingPool.value &&
          !sessionStorage.getItem('generatingRecommendations')
        ) {
          await populatePool();
        }
      } else {
        recommendations.value = [];
      }

      lastFetchedUserId.value = effectiveUserId;
      lastFetchedMood.value = (newValue.mood as string) || null;
      lastFetchedAttention.value = (newValue.attention as string) || null;
      hasAttemptedLoad.value = true;
    } catch (error) {
      console.error('[index.vue] Error fetching recommendations:', error);
      hasAttemptedLoad.value = true;
    } finally {
      isFetchingProfile.value = false;
      loadingRecommendations.value = false;
    }
  },
  { immediate: true }
);

// Undo toast for not_interested actions
const { showToast } = useUndoToast();

// Handle marking a title with different statuses
// New logic: Single active status (watchlist/seen/not_interested)
// - Liking implies seen and removes from watchlist
// - Marking seen or liked removes from watchlist
// - Marking not_interested removes from all other states
const handleTitleStatus = async (
  title: Recommendation,
  status: TitleStatus,
  liked: boolean = false
) => {
  // Set loading state for this title
  loadingTitles.value.add(title.tmdb_id);

  // Store original state for rollback in case of error
  let originalTitleIndex = -1;
  let originalInWatchlist: boolean | undefined = undefined;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      return;
    }

    // Store original state for rollback (watchlist titles also disappear from recommendations)
    originalTitleIndex = recommendations.value.findIndex(
      (r: Recommendation) => r.tmdb_id === title.tmdb_id
    );
    if (originalTitleIndex !== -1 && status === TitleStatus.WATCHLIST) {
      originalInWatchlist =
        recommendations.value[originalTitleIndex].in_watchlist;
    }

    // Update status in backend
    const response = await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status,
        liked,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleTitleStatus] Success:', { status, response });
    }

    // Show toast with appropriate message and action based on status
    if (status === TitleStatus.NOT_INTERESTED) {
      showToast(
        t('home.titleMarkedNotInterested', { title: title.title }),
        {
          label: t('undo.undo'),
          variant: 'secondary',
          action: async () => {
            // Undo: delete the not_interested status
            await $fetch('/api/users/title-status', {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              query: {
                tmdb_id: title.tmdb_id,
              },
            });
            // Re-fetch recommendations to update UI
            await fetchRecommendations();
          },
        },
        7000
      );
    } else if (status === TitleStatus.SEEN) {
      showToast(
        t('home.titleMarkedSeen', { title: title.title }),
        {
          label: t('home.viewSeen'),
          variant: 'secondary',
          action: async () => {
            await navigateTo('/preferences?tab=seen');
          },
        },
        5000
      );
    } else if (status === TitleStatus.WATCHLIST) {
      showToast(
        t('home.titleSavedWatchlist', { title: title.title }),
        {
          label: t('home.viewList'),
          variant: 'secondary',
          action: async () => {
            await navigateTo('/watchlist');
          },
        },
        5000
      );
    }

    // Remove from UI and get replacement
    // Watchlist titles also disappear from recommendations
    const removedIndex = allRecommendations.value.findIndex(
      (r: Recommendation) => r.tmdb_id === title.tmdb_id
    );

    if (removedIndex !== -1) {
      // Remove the title
      allRecommendations.value = allRecommendations.value.filter(
        (r: Recommendation) => r.tmdb_id !== title.tmdb_id
      );

      // Get replacement recommendation
      try {
        const queryParams: Record<string, string> = {
          excluded_tmdb_id: title.tmdb_id.toString(),
          excluded_type: title.type,
        };
        if (route.query.mood) queryParams.mood = route.query.mood as string;
        if (route.query.attention)
          queryParams.attention = route.query.attention as string;

        const replacement = await $fetch<Recommendation | null>(
          '/api/recommendations/replacement',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            query: queryParams,
          }
        );

        if (replacement) {
          // Add replacement to maintain 20 recommendations
          allRecommendations.value.push(replacement);
          recommendations.value = filterRecommendationsByType(
            allRecommendations.value
          );
        } else {
          // No replacement available, just update filtered list
          recommendations.value = filterRecommendationsByType(
            allRecommendations.value
          );
        }
      } catch (error) {
        // If replacement fails, just update filtered list
        console.error('[handleTitleStatus] Error fetching replacement:', error);
        recommendations.value = filterRecommendationsByType(
          allRecommendations.value
        );
      }
    } else {
      // Title not in list, just update filtered list
      recommendations.value = filterRecommendationsByType(
        allRecommendations.value
      );
    }
  } catch (error) {
    // Rollback optimistic update if error occurred
    if (originalTitleIndex !== -1) {
      // Restore original state
      if (status === TitleStatus.WATCHLIST) {
        recommendations.value[originalTitleIndex] = {
          ...recommendations.value[originalTitleIndex],
          in_watchlist: originalInWatchlist,
        };
      } else {
        // Restore removed title
        const originalTitle = allRecommendations.value.find(
          (r) => r.tmdb_id === title.tmdb_id
        );
        if (!originalTitle) {
          // Re-add the title that was removed
          allRecommendations.value.push(title);
          recommendations.value = filterRecommendationsByType(
            allRecommendations.value
          );
        }
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[handleTitleStatus] Error:', error);
    }
    // Show error toast
    const errorMessage =
      status === TitleStatus.WATCHLIST
        ? t('home.errorSavingWatchlist', { title: title.title })
        : status === TitleStatus.SEEN
          ? t('home.errorMarkingSeen', { title: title.title })
          : t('home.errorUpdatingStatus', { title: title.title });
    showToast(errorMessage, null, 3000);
  }
};

// Handle marking as liked (implies seen, removes from watchlist)
// Or removing like if already liked
const handleMarkLiked = async (title: Recommendation) => {
  // Set loading state for this title
  loadingTitles.value.add(title.tmdb_id);

  console.log('[UNLIKE DEBUG] handleMarkLiked called', {
    title: title.title,
    tmdb_id: title.tmdb_id,
    type: title.type,
    currentLiked: title.liked,
  });

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      console.warn('[UNLIKE DEBUG] No session available');
      return;
    }

    const userId = getUserId(user.value);
    if (!userId) {
      console.warn('[UNLIKE DEBUG] No userId available');
      return;
    }

    console.log('[UNLIKE DEBUG] Checking if title is liked', {
      userId,
      tmdb_id: title.tmdb_id,
    });

    // Check if title is already liked
    const { data: likedTitle, error: likedError } = await getUserLikedTitle(
      userId,
      title.tmdb_id
    );

    console.log('[UNLIKE DEBUG] getUserLikedTitle result', {
      likedTitle,
      error: likedError,
      hasLikedTitle: !!likedTitle,
    });

    if (likedTitle) {
      console.log('[UNLIKE DEBUG] Title is already liked, removing it');
      // Title is already liked, remove it directly (no modal needed)
      await confirmRemoveLike(title);
      return;
    }

    console.log('[UNLIKE DEBUG] Title is not liked, adding it');

    // Title is not liked, add it
    const response = await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status: TitleStatus.SEEN, // Liked implies seen
        liked: true,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleMarkLiked] Success:', response);
    }

    // Show toast with link to see liked titles
    showToast(
      t('home.titleAddedFavorites', { title: title.title }),
      {
        label: t('home.viewFavorites'),
        action: async () => {
          await navigateTo('/preferences');
        },
      },
      5000
    );

    // Remove from UI and get replacement (liked titles are seen, not in recommendations)
    const removedIndex = allRecommendations.value.findIndex(
      (r) => r.tmdb_id === title.tmdb_id
    );

    if (removedIndex !== -1) {
      // Remove the title
      allRecommendations.value = allRecommendations.value.filter(
        (r) => r.tmdb_id !== title.tmdb_id
      );

      // Get replacement recommendation
      try {
        const queryParams: Record<string, string> = {
          excluded_tmdb_id: title.tmdb_id.toString(),
          excluded_type: title.type,
        };
        if (route.query.mood) queryParams.mood = route.query.mood as string;
        if (route.query.attention)
          queryParams.attention = route.query.attention as string;

        const replacement = await $fetch<Recommendation | null>(
          '/api/recommendations/replacement',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            query: queryParams,
          }
        );

        if (replacement) {
          // Add replacement to maintain 20 recommendations
          allRecommendations.value.push(replacement);
          recommendations.value = filterRecommendationsByType(
            allRecommendations.value
          );
        } else {
          // No replacement available, just update filtered list
          recommendations.value = filterRecommendationsByType(
            allRecommendations.value
          );
        }
      } catch (error) {
        // If replacement fails, just update filtered list
        console.error('[handleMarkLiked] Error fetching replacement:', error);
        recommendations.value = filterRecommendationsByType(
          allRecommendations.value
        );
      }
    } else {
      // Title not in list, just update filtered list
      recommendations.value = filterRecommendationsByType(
        allRecommendations.value
      );
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[handleMarkLiked] Error:', error);
    }
    // Show error toast
    showToast(
      t('home.errorAddingFavorites', { title: title.title }),
      null,
      3000
    );
  } finally {
    // Remove loading state for this title
    loadingTitles.value.delete(title.tmdb_id);
  }
};

// Handle removing like from recommendation card
const handleRemoveLiked = async (title: Recommendation) => {
  // Remove like directly (no modal needed - just updates score)
  await confirmRemoveLike(title);
};

// Handle removing like (no modal needed - just updates score)
const confirmRemoveLike = async (title: Recommendation) => {
  // Set loading state for this title
  loadingTitles.value.add(title.tmdb_id);

  console.log('[UNLIKE DEBUG] confirmRemoveLike called', {
    title: title.title,
  });

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      console.warn('[UNLIKE DEBUG] No session available in confirmRemoveLike');
      return;
    }

    const userId = getUserId(user.value);
    if (!userId) {
      console.warn('[UNLIKE DEBUG] No userId available in confirmRemoveLike');
      return;
    }

    console.log('[UNLIKE DEBUG] Removing like', {
      userId,
      tmdb_id: title.tmdb_id,
      type: title.type,
    });

    // Remove like
    const response = await $fetch('/api/users/title-status', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        tmdb_id: title.tmdb_id,
        type: title.type,
        status: TitleStatus.SEEN, // Keep status as seen, just remove liked
        liked: false,
      },
    });

    console.log('[UNLIKE DEBUG] Remove like response', { response });

    // Note: Title remains as "seen" (not liked), so it should NOT be in recommendations
    // The title was already removed from recommendations when it was marked as "liked"
    // No need to update recommendations list - title stays excluded because status is still "seen"

    // Show success toast
    showToast(t('home.likeRemoved', { title: title.title }), null, 3000);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[confirmRemoveLike] Error:', error);
    }
    showToast(
      t('home.errorRemovingFavorites', { title: title.title }),
      null,
      3000
    );
  } finally {
    // Remove loading state for this title
    loadingTitles.value.delete(title.tmdb_id);
  }
};

const handleAuthSuccess = async () => {
  console.log('[handleAuthSuccess] Starting...');

  // Wait for user to be available from useSupabaseUser
  let attempts = 0;
  while (!user.value && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  console.log('[handleAuthSuccess] User available:', {
    hasUser: !!user.value,
    hasStoreUser: !!userStore.user,
    attempts,
  });

  // Ensure user is set in store
  const currentUser = user.value || userStore.user;
  if (currentUser) {
    const userId = getUserId(currentUser);
    const currentUserId = getUserId(userStore.user);

    if (!userStore.user || currentUserId !== userId) {
      console.log('[handleAuthSuccess] Setting user in store');
      userStore.setUser(currentUser);
    }

    // Ensure profile is loaded
    console.log('[handleAuthSuccess] Ensuring profile is loaded...');
    await userStore.ensureProfile();

    // Wait a bit more to ensure profile is fully loaded
    if (!userStore.profile) {
      console.log('[handleAuthSuccess] Profile still not loaded, waiting...');
      let retryAttempts = 0;
      while (!userStore.profile && retryAttempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await userStore.ensureProfile();
        retryAttempts++;
      }
    }

    console.log('[handleAuthSuccess] Profile loaded:', {
      hasProfile: !!userStore.profile,
      onboarding_completed: userStore.profile?.onboarding_completed,
      hasCompletedOnboarding: userStore.hasCompletedOnboarding,
    });

    // Step: Eliminar el flag auth:recovery si existe (después de recuperar contraseña)
    // Esto se hace cuando el usuario inicia sesión manualmente después de recuperar la contraseña
    if (typeof window !== 'undefined') {
      const recoveryFlag = localStorage.getItem('auth:recovery');
      if (recoveryFlag) {
        // Check both new format (JSON) and legacy format (string '1')
        let hasRecoveryFlag = false;
        try {
          const parsed = JSON.parse(recoveryFlag);
          hasRecoveryFlag = parsed.value === 1;
        } catch {
          hasRecoveryFlag = recoveryFlag === '1';
        }
        
        if (hasRecoveryFlag) {
          console.log(
            '[handleAuthSuccess] Removing auth:recovery flag after successful login'
          );
          localStorage.removeItem('auth:recovery');
        }
      }
    }

    // Navigate based on onboarding status - use replace: true to trigger middleware
    if (userStore.hasCompletedOnboarding) {
      console.log(
        '[handleAuthSuccess] User completed onboarding, navigating to /'
      );
      await navigateTo('/', { replace: true });
    } else {
      console.log(
        '[handleAuthSuccess] User not completed onboarding, navigating to /onboarding'
      );
      await navigateTo('/onboarding', { replace: true });
    }
  } else {
    // Fallback: redirect to home and let middleware handle it
    console.log(
      '[handleAuthSuccess] No user found, redirecting to / and letting middleware handle it'
    );
    await navigateTo('/', { replace: true });
  }
};

const handleSignupSuccess = () => {
  // Signup success is handled in AuthForm component
};

const handleGetStarted = async () => {
  const currentUser = effectiveUser.value;
  if (currentUser) {
    const userId = getUserId(currentUser);
    if (userId) {
      const currentUserId = getUserId(userStore.user);
      if (!userStore.user || currentUserId !== userId) {
        userStore.setUser(currentUser);
      }
      userStore.setLoading(true);
      await userStore.fetchProfile();
      userStore.setLoading(false);
      if (userStore.hasCompletedOnboarding) {
        await navigateTo('/');
      } else {
        await navigateTo('/onboarding');
      }
    }
  } else {
    showAuthForm.value = true;
    await nextTick();
    const element = document.getElementById('auth-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// Populate recommendation pool manually
const populatePool = async () => {
  // Check if already populating or if there's a flag in sessionStorage
  if (
    populatingPool.value ||
    sessionStorage.getItem('generatingRecommendations')
  ) {
    return;
  }

  // Set flag in sessionStorage to prevent duplicate requests on refresh
  sessionStorage.setItem('generatingRecommendations', 'true');
  populatingPool.value = true;

  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      showToast(t('home.sessionError'), null, 3000);
      sessionStorage.removeItem('generatingRecommendations');
      return;
    }

    const result = await $fetch('/api/recommendations/populate-pool', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      credentials: 'include',
    });

    if (import.meta.dev) {
      console.log('[PopulatePool] Pool populated successfully:', {
        inserted: result.inserted,
        result,
      });
    }

    // Refresh recommendations after populating pool
    await fetchRecommendations();
  } catch (error) {
    console.error('[PopulatePool] Error:', error);
    showToast(t('home.generateError'), null, 3000);
  } finally {
    populatingPool.value = false;
    // Clear the flag after a delay to allow for refresh scenarios
    setTimeout(() => {
      sessionStorage.removeItem('generatingRecommendations');
    }, 5000); // 5 seconds after completion
  }
};

// Check if auth query param is present to show auth form
onMounted(() => {
  // Redirect auth-related query params to /auth/callback
  // Supabase sometimes redirects to /?code=... or /?error=... instead of /auth/callback?code=... or /auth/callback?error=...
  // All auth logic should be handled in callback.vue, not here
  if (typeof window !== 'undefined') {
    const hasCode = !!route.query.code;
    const hasError = !!(
      route.query.error ||
      route.query.error_code ||
      route.query.error_description ||
      route.query.error_message
    );

    if (hasCode || hasError) {
      console.log(
        '[AUTH TRACE] index.vue detected auth params, redirecting to /auth/callback',
        {
          hasCode,
          hasError,
          query: route.query,
        }
      );
      // Redirect to callback with all query params - callback.vue will handle everything
      router.replace({
        path: '/auth/callback',
        query: route.query,
      });
      return;
    }
  }
  if (route.query.auth === 'login' && !effectiveUser.value) {
    showAuthForm.value = true;
    nextTick(() => {
      const element = document.getElementById('auth-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Check if pool regeneration is in progress
  if (sessionStorage.getItem('regeneratingPool')) {
    populatingPool.value = true;

    // Poll to check if regeneration is complete
    const checkRegenerationStatus = setInterval(() => {
      if (!sessionStorage.getItem('regeneratingPool')) {
        populatingPool.value = false;
        clearInterval(checkRegenerationStatus);
        // Refresh recommendations after regeneration completes
        if (user.value && userStore.hasCompletedOnboarding) {
          fetchRecommendations().then((fetched) => {
            allRecommendations.value = fetched;
            recommendations.value = filterRecommendationsByType(fetched);
          });
        }
      }
    }, 2000); // Check every 2 seconds

    // Cleanup interval after 5 minutes (safety timeout)
    setTimeout(
      () => {
        clearInterval(checkRegenerationStatus);
        if (populatingPool.value) {
          populatingPool.value = false;
          sessionStorage.removeItem('regeneratingPool');
        }
      },
      5 * 60 * 1000
    );
  }

  // Mark hydration as complete after mount
  // Use nextTick to ensure all reactive updates have completed
  nextTick(() => {
    isHydrating.value = false;
    isMounted.value = true;
  });
});
</script>

<template>
  <div class="w-full">
    <!-- Hero Section -->
    <!-- Only show HeroSection when auth is initialized and there's no user, or user hasn't completed onboarding -->
    <ClientOnly>
      <template #default>
        <HeroSection
          v-if="
            userStore.authInitialized &&
            (!effectiveUser ||
              (initialProfileLoaded && !userStore.hasCompletedOnboarding))
          "
          :button-text="
            !effectiveUser
              ? $t('hero.discoverButton')
              : $t('hero.recommendationsButton')
          "
          :show-auth-form="showAuthForm"
          :is-authenticated="!!effectiveUser"
          :initial-profile-loaded="initialProfileLoaded"
          :has-completed-onboarding="userStore.hasCompletedOnboarding"
          @get-started="handleGetStarted"
          @auth-success="handleAuthSuccess"
          @signup-success="handleSignupSuccess"
        />
      </template>
      <template #fallback>
        <!-- Placeholder during SSR - empty to avoid hydration mismatch -->
      </template>
    </ClientOnly>

    <!-- Personalized Recommendations -->
    <ClientOnly>
      <section v-if="isMounted && userStore.authInitialized && effectiveUser">
        <AppShell>
          <PageContainer>
            <div class="pt-6 pb-6 w-full">
              <!-- Filtros Section -->
              <Section v-if="userStore.hasCompletedOnboarding">
                <div class="flex flex-col gap-4">
                  <!-- Mood Selector -->
                  <MoodSelector />

                  <!-- Content Type Filter -->
                  <div
                    class="p-6 rounded-3xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10 md:p-8"
                  >
                    <div class="flex flex-col gap-2">
                      <label
                        class="text-xs font-semibold tracking-wide text-gray-800 uppercase dark:text-gray-300"
                      >
                        {{ $t('home.contentTypeFilter') }}
                      </label>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="typeOption in [
                            { value: 'all', label: $t('home.contentTypeAll') },
                            {
                              value: 'movie',
                              label: $t('home.contentTypeMovie'),
                            },
                            { value: 'tv', label: $t('home.contentTypeTv') },
                          ]"
                          :key="typeOption.value"
                          :class="[
                            'px-3 py-1.5 rounded-full font-medium transition-all text-xs',
                            selectedContentType === typeOption.value
                              ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                              : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:border-primary/50 dark:hover:border-purple-500/30',
                          ]"
                          @click="
                            selectedContentType = typeOption.value as
                              | 'all'
                              | 'movie'
                              | 'tv'
                          "
                        >
                          {{ typeOption.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              <!-- Loading State -->
              <div
                v-if="loadingRecommendations || populatingPool"
                class="w-full"
              >
                <Spinner
                  :message="
                    populatingPool
                      ? $t('home.generatingButton')
                      : $t('home.loadingRecommendations')
                  "
                />
              </div>

              <!-- No Preferred Languages State -->
              <div
                v-else-if="
                  !populatingPool &&
                  hasAttemptedLoad &&
                  hasPreferredLanguage === false
                "
                class="py-6 text-center"
              >
                <div class="mx-auto w-full max-w-md">
                  <svg
                    class="mx-auto mb-4 w-16 h-16 text-gray-600 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                  <h3
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                  >
                    {{ $t('home.noPreferredLanguage') }}
                  </h3>
                  <p class="mb-6 text-gray-800 dark:text-gray-300">
                    {{ $t('home.noPreferredLanguageDescription') }}
                  </p>
                  <nuxt-link
                    to="/preferences?tab=content-preferences"
                    class="inline-block px-6 py-3 text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 border-primary-600/50"
                  >
                    {{ $t('home.setPreferredLanguage') }}
                  </nuxt-link>
                </div>
              </div>

              <!-- Empty State (only show if not populating and user has no likes) -->
              <!-- When pool is empty and user has likes, we automatically generate, so we don't show this -->
              <div
                v-else-if="
                  !populatingPool &&
                  hasAttemptedLoad &&
                  recommendations.length === 0 &&
                  hasPreferredLanguage !== false &&
                  !userStore.hasLikes
                "
                class="py-6 text-center"
              >
                <div class="mx-auto w-full max-w-md">
                  <svg
                    class="mx-auto mb-4 w-16 h-16 text-gray-600 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <h3
                    class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                  >
                    {{ $t('home.noRecommendations') }}
                  </h3>
                  <p class="mb-6 text-gray-800 dark:text-gray-300">
                    {{ $t('home.noRecommendationsDescription') }}
                  </p>
                  <nuxt-link
                    to="/onboarding"
                    class="inline-block px-6 py-3 text-base font-medium text-white rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 border-primary-600/50"
                  >
                    {{ $t('home.addFavorites') }}
                  </nuxt-link>
                </div>
              </div>

              <!-- Recommendations Section -->
              <Section v-else>
                <RecommendationSection
                  v-if="recommendations && recommendations.length > 0"
                  :key="`rec-${recommendations.length}`"
                  :title="$t('home.recommendationsTitle')"
                  :description="$t('home.recommendationsDescription')"
                  :recommendations="recommendations"
                  :loading-titles="loadingTitles"
                  @mark-seen="handleTitleStatus($event, TitleStatus.SEEN)"
                  @mark-not-interested="
                    handleTitleStatus($event, TitleStatus.NOT_INTERESTED)
                  "
                  @mark-liked="handleMarkLiked($event)"
                  @remove-liked="handleRemoveLiked($event)"
                  @mark-watchlist="
                    handleTitleStatus($event, TitleStatus.WATCHLIST)
                  "
                />
              </Section>
            </div>
          </PageContainer>
        </AppShell>
      </section>
      <template #fallback>
        <!-- Placeholder section to prevent hydration mismatch -->
        <section>
          <AppShell>
            <PageContainer>
              <div class="flex flex-col gap-6 pt-6 pb-6"></div>
            </PageContainer>
          </AppShell>
        </section>
      </template>
    </ClientOnly>

    <!-- How It Works Section -->
    <!-- Only show when auth is initialized and there's no user, or user hasn't completed onboarding -->
    <section
      v-if="
        userStore.authInitialized &&
        (!effectiveUser ||
          (initialProfileLoaded && !userStore.hasCompletedOnboarding))
      "
      id="como-funciona"
      class="py-6"
    >
      <AppShell>
        <PageContainer>
          <Section>
            <h2
              class="mb-6 text-3xl font-bold text-center text-gray-800 md:text-4xl dark:text-gray-300 font-heading"
            >
              {{ $t('home.howItWorksTitle') }}
            </h2>
            <div class="grid gap-4 md:grid-cols-3">
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-primary to-accent"
                >
                  <span class="text-2xl font-bold text-white">1</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step1Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step1Description') }}
                </p>
              </Card>
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-accent to-secondary"
                >
                  <span class="text-2xl font-bold text-white">2</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step2Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step2Description') }}
                </p>
              </Card>
              <Card
                padding="lg"
                custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
              >
                <div
                  class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-secondary to-pink"
                >
                  <span class="text-2xl font-bold text-white">3</span>
                </div>
                <h3
                  class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
                >
                  {{ $t('home.step3Title') }}
                </h3>
                <p class="text-gray-800 dark:text-gray-300">
                  {{ $t('home.step3Description') }}
                </p>
              </Card>
            </div>
          </Section>
        </PageContainer>
      </AppShell>
    </section>

    <!-- Value Proposition Section -->
    <!-- Only show when auth is initialized and there's no user -->
    <section
      v-if="userStore.authInitialized && !effectiveUser"
      class="pb-16 md:pt-16"
    >
      <AppShell>
        <PageContainer>
          <div class="w-full text-center">
            <p
              class="mb-6 text-2xl font-semibold leading-relaxed text-gray-900 md:text-3xl dark:text-gray-100"
            >
              {{ $t('home.tagline1') }}
            </p>
            <p
              class="text-3xl font-semibold leading-relaxed text-gray-900 md:text-5xl dark:text-gray-100"
            >
              {{ $t('home.tagline2') }}
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600"
                style="
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                "
                >{{ $t('home.tagline3') }}</span
              >
              {{ $t('home.tagline4') }}
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 dark:from-primary-400 dark:via-primary-500 dark:to-primary-600"
                style="
                  background-clip: text;
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                "
                >{{ $t('home.tagline5') }}</span
              >{{ $t('home.tagline6') }}
            </p>
          </div>
        </PageContainer>
      </AppShell>
    </section>
  </div>
</template>
