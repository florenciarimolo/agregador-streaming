import { computed, type ComputedRef } from 'vue';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';

/**
 * Interface for title status information
 */
export interface TitleStatusInfo {
  isLiked: boolean;
  isSeen: boolean;
  isNotInterested: boolean;
  isInWatchlist: boolean;
}

/**
 * Interface for menu action configuration
 */
export interface MenuAction {
  action: string | typeof TITLE_STATUS.SEEN | typeof TITLE_STATUS.WATCHLIST | typeof TITLE_STATUS.NOT_INTERESTED | 'liked' | 'remove-liked' | 'remove-seen' | 'remove-watchlist' | 'remove-not-interested';
  label: string;
  icon: string;
  showRemove?: boolean;
}

/**
 * Composable to determine which menu actions to show based on title status
 * 
 * Logic:
 * - If title has a state (liked, seen, not_interested, watchlist), only show option to remove that state
 * - If title has no state, show all options to add states
 * 
 * Priority order for removal:
 * 1. isLiked (highest priority - liked is an attribute of seen)
 * 2. isSeen && !isLiked
 * 3. isNotInterested
 * 4. isInWatchlist
 */
export const useTitleMenuActions = (
  statusInfo: ComputedRef<TitleStatusInfo> | TitleStatusInfo
) => {
  const status = computed(() => {
    if ('value' in statusInfo) {
      return statusInfo.value;
    }
    return statusInfo;
  });

  /**
   * Determine which actions to show in the menu
   */
  const menuActions = computed<MenuAction[]>(() => {
    const { isLiked, isSeen, isNotInterested, isInWatchlist } = status.value;

    // If title has a state, only show option to remove that state
    // All remove actions use IconX
    if (isLiked) {
      return [
        {
          action: 'remove-liked',
          label: 'media.removeFromLiked',
          icon: 'IconX',
          showRemove: true,
        },
      ];
    }

    if (isSeen && !isLiked) {
      return [
        {
          action: TITLE_STATUS.SEEN,
          label: 'media.removeFromSeen',
          icon: 'IconX',
          showRemove: true,
        },
      ];
    }

    if (isNotInterested) {
      return [
        {
          action: TITLE_STATUS.NOT_INTERESTED,
          label: 'media.removeFromNotInterested',
          icon: 'IconX',
          showRemove: true,
        },
      ];
    }

    if (isInWatchlist) {
      return [
        {
          action: 'remove-watchlist',
          label: 'media.removeFromWatchlist',
          icon: 'IconX',
          showRemove: true,
        },
      ];
    }

    // If title has no state, show all options to add states
    return [
      {
        action: TITLE_STATUS.SEEN,
        label: 'media.seen',
        icon: 'IconCheck',
        showRemove: false,
      },
      {
        action: 'liked',
        label: 'media.like',
        icon: 'IconHeart',
        showRemove: false,
      },
      {
        action: TITLE_STATUS.WATCHLIST,
        label: 'media.addToWatchlist',
        icon: 'IconClock',
        showRemove: false,
      },
      {
        action: TITLE_STATUS.NOT_INTERESTED,
        label: 'media.notInterested',
        icon: 'IconX',
        showRemove: false,
      },
    ];
  });

  /**
   * Check if title has any state
   */
  const hasState = computed(() => {
    const { isLiked, isSeen, isNotInterested, isInWatchlist } = status.value;
    return isLiked || isSeen || isNotInterested || isInWatchlist;
  });

  return {
    menuActions,
    hasState,
  };
};

