<template>
  <Button
    :variant="'primary'"
    :loading="isLoading"
    :disabled="isLoading"
    @click="handleSeed"
  >
    <template #icon>
      <IconSeed v-if="!isLoading" icon-class="w-4 h-4" />
    </template>
    {{ $t('discover.useAsSeed') }}
  </Button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from './ui/Button.vue';
import IconSeed from './icons/IconSeed.vue';
import { useUndoToast } from '@/composables/useUndoToast';

interface Props {
  listSlug: string;
}

const props = defineProps<Props>();
const { t } = useI18n();
const { showToast } = useUndoToast();

const isLoading = ref(false);

async function handleSeed() {
  if (isLoading.value) return;

  isLoading.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      inserted: number;
      message: string;
    }>(`/api/discover/list/${props.listSlug}/seed`, {
      method: 'POST',
    });

    if (response.success) {
      showToast({
        message: t('discover.seedSuccess', { count: response.inserted }),
        type: 'success',
      });
    } else {
      throw new Error('Failed to seed list');
    }
  } catch (error) {
    console.error('[SeedListButton] Error:', error);
    showToast({
      message: t('discover.seedError'),
      type: 'error',
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

