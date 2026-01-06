<template>
  <Card
    padding="lg"
    custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
  >
    <div class="flex flex-col gap-4 items-center text-center">
      <div class="flex items-center gap-3 justify-center">
        <div
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50"
        >
          <component :is="selectedMoodIcon" class="w-3.5 h-3.5" />
          <span>{{ selectedMoodLabel }}</span>
        </div>
        <span class="text-gray-600 dark:text-gray-400">+</span>
        <div
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-xs bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50"
        >
          <component :is="selectedAttentionIcon" class="w-3.5 h-3.5" />
          <span>{{ selectedAttentionLabel }}</span>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@/components/ui/Card.vue';
import IconRelax from '@/components/icons/IconRelax.vue';
import IconBattery50 from '@/components/icons/IconBattery50.vue';
import { MOOD } from '@/constants/domain/mood';
import { ATTENTION } from '@/constants/domain/attention';

const { t } = useI18n();

// Mock selected values for demonstration
const selectedMood = MOOD.RELAX;
const selectedAttention = ATTENTION.MEDIUM;

const selectedMoodIcon = IconRelax;
const selectedMoodLabel = computed(() => t('mood.relaxed'));
const selectedAttentionIcon = IconBattery50;
const selectedAttentionLabel = computed(() => t('attention.medium'));
</script>

