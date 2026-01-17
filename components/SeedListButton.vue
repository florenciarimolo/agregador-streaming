<template>
  <div class="flex flex-col md:flex-row md:items-center gap-4">
    <div class="text-sm text-gray-600 dark:text-gray-400 md:flex-1">
      <p class="font-semibold">
        {{ $t('discover.seedDescriptionTitle') }}
      </p>
      <p>
        {{ $t('discover.seedDescriptionText') }}
      </p>
    </div>
    <div class="self-start md:self-auto">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from './ui/Button.vue';
import IconSeed from './icons/IconSeed.vue';
import { useUndoToast } from '@/composables/useUndoToast';
import { getSession } from '@/services/auth';
import { useLogger } from '@/composables/useLogger';

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
    // Get session for authentication
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await $fetch<{
      success: boolean;
      inserted: number;
      message: string;
    }>(`/api/discover/list/${props.listSlug}/seed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
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
    const { logError } = useLogger();
    logError('[SeedListButton] Error seeding list', error as Error, {
      listSlug: props.listSlug,
    });
    showToast(t('discover.seedError'), null, 5000);
  } finally {
    isLoading.value = false;
  }
}
</script>
