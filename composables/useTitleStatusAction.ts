import { getSession } from '@/services/auth';
import { useUndoToast } from '@/composables/useUndoToast';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { TITLE_STATUS, type TitleStatusType } from '@/constants/domain/titleStatus';
import { type MediaType } from '@/constants/domain/mediaType';
import { useI18n } from 'vue-i18n';

export interface TitleStatusActionParams {
  tmdb_id: number;
  type: MediaType;
  title: string;
  currentStatus?: TitleStatusType | null;
  isLiked?: boolean;
  onUndoComplete?: () => Promise<void> | void; // Optional callback after undo completes
  hideViewListButton?: boolean; // If true, don't show "View list" button for add actions (e.g., when already on that list page)
}

export interface TitleStatusActionResult {
  success: boolean;
  action: 'added' | 'removed';
  newStatus: TitleStatusType | null;
}

/**
 * Unified composable for handling title status actions
 * Handles API calls, toast messages, and undo logic
 * 
 * Each component can handle its own UI updates after the action
 */
export const useTitleStatusAction = () => {
  const { t } = useI18n();
  const { showToast } = useUndoToast();
  const { routeWithLang } = useRouteWithLang();

  /**
   * Execute a title status action (add or remove)
   * Returns the result so components can update their UI accordingly
   */
  const executeAction = async (
    params: TitleStatusActionParams,
    targetStatus: TitleStatusType
  ): Promise<TitleStatusActionResult> => {
    const { tmdb_id, type, title, currentStatus, isLiked = false, onUndoComplete, hideViewListButton = false } = params;

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        showToast(t('media.authRequired'), null, 3000);
        return { success: false, action: 'removed', newStatus: null };
      }

      // Determine if we're adding or removing
      const isCurrentlySet = currentStatus === targetStatus;
      const isRemoving = isCurrentlySet;

      if (isRemoving) {
        // Remove status (DELETE)
        await $fetch('/api/users/title-status/delete', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          query: {
            tmdb_id,
          },
        });

        // Show toast with undo button
        const removeMessages: Record<TitleStatusType, string> = {
          [TITLE_STATUS.SEEN]: t('seen.titleRemoved', { title }),
          [TITLE_STATUS.NOT_INTERESTED]: t('notInterested.titleRemoved', { title }),
          [TITLE_STATUS.WATCHLIST]: t('watchlist.titleRemoved', { title }),
        };

        showToast(removeMessages[targetStatus], {
          label: t('undo.undo'),
          variant: 'secondary',
          action: async () => {
            // Undo: Re-add the status
            try {
              const {
                data: { session: undoSession },
              } = await getSession();
              if (!undoSession?.access_token) return;

              await $fetch('/api/users/title-status', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${undoSession.access_token}`,
                },
                body: {
                  tmdb_id,
                  type,
                  status: targetStatus,
                  liked: targetStatus === TITLE_STATUS.SEEN ? isLiked : false,
                },
              });
              // Execute optional callback after undo
              if (onUndoComplete) {
                await onUndoComplete();
              }
            } catch (error) {
              console.error('[useTitleStatusAction] Error undoing:', error);
            }
          },
        }, 7000);

        return { success: true, action: 'removed', newStatus: null };
      } else {
        // Add status (POST)
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id,
            type,
            status: targetStatus,
            liked: targetStatus === TITLE_STATUS.SEEN ? isLiked : false,
          },
        });

        // Show toast with "View list" button
        const addMessages: Record<TitleStatusType, string> = {
          [TITLE_STATUS.SEEN]: t('seen.titleAdded', { title }),
          [TITLE_STATUS.NOT_INTERESTED]: t('notInterested.titleAdded', { title }),
          [TITLE_STATUS.WATCHLIST]: t('watchlist.titleAdded', { title }),
        };

        const viewRoutes: Record<TitleStatusType, string> = {
          [TITLE_STATUS.SEEN]: '/lists?tab=seen',
          [TITLE_STATUS.NOT_INTERESTED]: '/lists?tab=not-interested',
          [TITLE_STATUS.WATCHLIST]: '/watchlist',
        };

        const viewLabels: Record<TitleStatusType, string> = {
          [TITLE_STATUS.SEEN]: t('home.viewSeen'),
          [TITLE_STATUS.NOT_INTERESTED]: t('home.viewList'),
          [TITLE_STATUS.WATCHLIST]: t('home.viewList'),
        };

        // If hideViewListButton is true, don't show the button (e.g., when already on that list page)
        showToast(addMessages[targetStatus], hideViewListButton ? null : {
          label: viewLabels[targetStatus],
          variant: 'secondary',
          action: async () => {
            await navigateTo(routeWithLang(viewRoutes[targetStatus]));
          },
        }, 5000);

        return { success: true, action: 'added', newStatus: targetStatus };
      }
    } catch (error) {
      console.error('[useTitleStatusAction] Error:', error);
      showToast(t('home.errorUpdatingStatus', { title }), null, 3000);
      return { success: false, action: 'removed', newStatus: null };
    }
  };

  /**
   * Handle liked action (special case - liked is an attribute of seen)
   */
  const executeLikedAction = async (
    params: TitleStatusActionParams,
    isCurrentlyLiked: boolean
  ): Promise<TitleStatusActionResult> => {
    const { tmdb_id, type, title, currentStatus, onUndoComplete, hideViewListButton = false } = params;

    try {
      const {
        data: { session },
      } = await getSession();

      if (!session?.access_token) {
        showToast(t('media.authRequired'), null, 3000);
        return { success: false, action: 'removed', newStatus: null };
      }

      if (isCurrentlyLiked) {
        // Remove like (but keep seen status)
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id,
            type,
            status: TITLE_STATUS.SEEN,
            liked: false,
          },
        });

        showToast(t('preferences.titleRemoved', { title }), {
          label: t('undo.undo'),
          variant: 'secondary',
          action: async () => {
            // Undo: Re-add like
            try {
              const {
                data: { session: undoSession },
              } = await getSession();
              if (!undoSession?.access_token) return;

              await $fetch('/api/users/title-status', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${undoSession.access_token}`,
                },
                body: {
                  tmdb_id,
                  type,
                  status: TITLE_STATUS.SEEN,
                  liked: true,
                },
              });
              // Execute optional callback after undo
              if (onUndoComplete) {
                await onUndoComplete();
              }
            } catch (error) {
              console.error('[useTitleStatusAction] Error undoing like:', error);
            }
          },
        }, 7000);

        return { success: true, action: 'removed', newStatus: currentStatus };
      } else {
        // Add like (requires seen status)
        await $fetch('/api/users/title-status', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            tmdb_id,
            type,
            status: TITLE_STATUS.SEEN,
            liked: true,
          },
        });

        // If hideViewListButton is true, don't show the button (e.g., when already on that list page)
        showToast(t('preferences.titleAdded', { title }), hideViewListButton ? null : {
          label: t('home.viewFavorites'),
          variant: 'secondary',
          action: async () => {
            await navigateTo(routeWithLang('/lists?tab=liked'));
          },
        }, 5000);

        return { success: true, action: 'added', newStatus: TITLE_STATUS.SEEN };
      }
    } catch (error) {
      console.error('[useTitleStatusAction] Error:', error);
      showToast(t('home.errorUpdatingStatus', { title }), null, 3000);
      return { success: false, action: 'removed', newStatus: null };
    }
  };

  return {
    executeAction,
    executeLikedAction,
  };
};

