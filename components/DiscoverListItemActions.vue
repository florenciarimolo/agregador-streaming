<template>
  <div class="overflow-visible">
    <ActionMenu width="w-48" position="right">
      <template #trigger>
        <IconButton
          :icon="IconMoreVertical"
          :aria-label="$t('media.actionsMenuFor', { title: item.title })"
          size="small"
          variant="default"
          custom-class="menu-button p-2 rounded-full bg-black/50 hover:bg-gray-700/80 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black/50 [&>svg]:text-white"
        />
      </template>
      <div class="p-4">
        <Button
          v-for="(menuAction, index) in menuActions"
          :key="index"
          type="button"
          variant="ghost"
          size="small"
          :custom-class="
            index < menuActions.length - 1
              ? 'justify-start mb-2 w-full text-left'
              : 'justify-start w-full text-left'
          "
          @click.stop.prevent="handleMenuAction(menuAction.action)"
        >
          <template #icon>
            <!-- All remove actions use IconX -->
            <IconX v-if="menuAction.showRemove" icon-class="w-4 h-4" />
            <!-- Add actions keep their original icons -->
            <IconCheck
              v-else-if="menuAction.icon === 'IconCheck'"
              icon-class="w-4 h-4"
            />
            <IconHeart
              v-else-if="menuAction.icon === 'IconHeart'"
              icon-class="w-4 h-4"
            />
            <IconClock
              v-else-if="menuAction.icon === 'IconClock'"
              icon-class="w-4 h-4"
            />
            <IconX
              v-else-if="menuAction.icon === 'IconX'"
              icon-class="w-4 h-4"
            />
          </template>
          {{ $t(menuAction.label) }}
        </Button>
      </div>
    </ActionMenu>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  useTitleMenuActions,
  type TitleStatusInfo,
} from '@/composables/useTitleMenuActions';
import type { DiscoverListItem } from '@/composables/database/discoverLists';
import ActionMenu from './ui/ActionMenu.vue';
import IconButton from './ui/IconButton.vue';
import Button from './ui/Button.vue';
import IconMoreVertical from './icons/IconMoreVertical.vue';
import IconCheck from './icons/IconCheck.vue';
import IconHeart from './icons/IconHeart.vue';
import IconClock from './icons/IconClock.vue';
import IconX from './icons/IconX.vue';

interface Props {
  item: DiscoverListItem;
  titleStatus: TitleStatusInfo;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  action: [item: DiscoverListItem, action: string];
}>();

// Use the composable to determine which actions to show
const { menuActions } = useTitleMenuActions(computed(() => props.titleStatus));

const handleMenuAction = (action: string) => {
  emit('action', props.item, action);
};
</script>
