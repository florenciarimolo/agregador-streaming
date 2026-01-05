<template>
  <div class="flex items-center gap-4">
    <p class="text-sm text-gray-600 dark:text-gray-400 flex-1">
      {{ $t('discover.seedDescription') }}
    </p>
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
  </div>
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
      // Silently handle errors - we'll show a generic message in the catch block
      onResponseError: () => {
        // Error will be caught by catch block below
      },
    });

    if (response.success) {
      showToast(
        t('discover.seedSuccess', { count: response.inserted }),
        null,
        5000
      );
    } else {
      throw new Error('Failed to seed list');
    }
  } catch (error) {
    // Always show generic error message to user, regardless of error type
    // Log full error details to console for debugging
    console.error('[SeedListButton] Error seeding list:', error);
    showToast(t('discover.seedError'), null, 5000);
  } finally {
    isLoading.value = false;
  }
}
</script>

