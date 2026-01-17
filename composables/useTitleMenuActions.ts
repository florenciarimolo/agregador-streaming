import { computed, type ComputedRef } from 'vue';
import { TITLE_STATUS } from '@/constants/domain/titleStatus';
import { TITLE_ACTION } from '@/constants/domain/titleActions';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';

/**
 * Interface for title status information
 */
export interface TitleStatusInfo {
  isLiked: boolean;
  isSeen: boolean;
  isNotInterested: boolean;
  isInWatchlist: boolean;
  isFollowing?: boolean;
  isFullySeen?: boolean; // For TV series - if all episodes are seen, cannot follow
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV; // Media type - following only applies to TV
}

/**
 * Interface for menu action configuration
 */
export interface MenuAction {
  action: string | typeof TITLE_STATUS.SEEN | typeof TITLE_STATUS.WATCHLIST | typeof TITLE_STATUS.NOT_INTERESTED | typeof TITLE_ACTION.LIKED | typeof TITLE_ACTION.REMOVE_LIKED | typeof TITLE_ACTION.FOLLOW | typeof TITLE_ACTION.UNFOLLOW | 'remove-seen' | 'remove-watchlist' | 'remove-not-interested';
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
    const { isLiked, isSeen, isNotInterested, isInWatchlist, isFollowing, isFullySeen, type } = status.value;

    // If title has a state, only show option to remove that state
    // All remove actions use IconX
    // Priority: Liked > Seen > Following > Not Interested > Watchlist
    if (isLiked) {
      return [
        {
          action: TITLE_ACTION.REMOVE_LIKED,
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

    // Following has higher priority than Not Interested and Watchlist
    // When following, those states should be removed, so they shouldn't appear together
    // But we check following first to ensure it takes precedence
    if (isFollowing) {
      return [
        {
          action: TITLE_ACTION.UNFOLLOW,
          label: 'following.unfollow',
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
    const actions: MenuAction[] = [
      {
        action: TITLE_STATUS.SEEN,
        label: 'media.seen',
        icon: 'IconCheck',
        showRemove: false,
      },
      {
        action: TITLE_ACTION.LIKED,
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

    // Add follow option for TV series (hide if fully seen)
    if (type === MEDIA_TYPE.TV && !isFullySeen) {
      actions.push({
        action: TITLE_ACTION.FOLLOW,
        label: 'following.follow',
        icon: 'IconStar',
        showRemove: false,
      });
    }

    return actions;
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

