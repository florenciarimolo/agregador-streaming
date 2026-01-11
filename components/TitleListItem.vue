<template>
  <ListItemBase
    :title="title"
    :poster-path="posterPath"
    :tagline="tagline"
    :tag="tag"
    :overview="overview"
    :vote-average="voteAverage"
    :type="type"
    :tmdb-id="tmdbId"
    :providers="providers"
    :hide-type-badge="hideTypeBadge"
    :aria-label="
      $t('media.titleCardLabel', { title: title || $t('media.noTitle') })
    "
    :link-aria-label="
      $t('media.viewDetailsOf', { title: title || $t('media.noTitle') })
    "
    :image-alt="$t('media.posterOf', { title: title || $t('media.noTitle') })"
    :no-image-aria-label="
      $t('media.noPosterAvailableFor', { title: title || $t('media.noTitle') })
    "
  >
    <template #actions>
      <slot name="actions" />
    </template>
  </ListItemBase>
</template>

<script setup lang="ts">
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import ListItemBase from '@/components/ListItemBase.vue';

import type { Provider } from '@/types/Recommendation';

interface Props {
  title: string;
  posterPath?: string | null;
  tagline?: string | null;
  tag?: string | null;
  overview?: string | null;
  voteAverage?: number | null;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
  tmdbId: number;
  providers?: Provider[];
  hideTypeBadge?: boolean;
  showOverviewPlaceholder?: boolean;
}

withDefaults(defineProps<Props>(), {
  posterPath: null,
  tagline: null,
  tag: null,
  overview: null,
  voteAverage: null,
  type: undefined,
  providers: undefined,
  hideTypeBadge: false,
  showOverviewPlaceholder: true,
});
</script>
