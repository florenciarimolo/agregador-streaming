<template>
  <Card
    padding="lg"
    custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
  >
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-300"
        >
          {{ $t('mood.label') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="moodOption in moodOptions"
            :key="moodOption.value"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all text-xs',
              selectedMood === moodOption.value
                ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50',
            ]"
            disabled
          >
            <component :is="moodOption.icon" class="w-3.5 h-3.5" />
            <span>{{ moodOption.label }}</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label
          class="text-xs font-semibold uppercase tracking-wide text-gray-800 dark:text-gray-300"
        >
          {{ $t('attention.label') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="attentionOption in attentionOptions"
            :key="attentionOption.value"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all text-xs',
              selectedAttention === attentionOption.value
                ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50',
            ]"
            disabled
          >
            <component :is="attentionOption.icon" class="w-3.5 h-3.5" />
            <span>{{ attentionOption.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@/components/ui/Card.vue';
import IconRelax from '@/components/icons/IconRelax.vue';
import IconLigero from '@/components/icons/IconLigero.vue';
import IconIntenso from '@/components/icons/IconIntenso.vue';
import IconEmocional from '@/components/icons/IconEmocional.vue';
import IconReflexivo from '@/components/icons/IconReflexivo.vue';
import IconBattery0 from '@/components/icons/IconBattery0.vue';
import IconBattery50 from '@/components/icons/IconBattery50.vue';
import IconBattery100 from '@/components/icons/IconBattery100.vue';
import { MOOD } from '@/constants/domain/mood';
import { ATTENTION } from '@/constants/domain/attention';

const { t } = useI18n();

// Mock selected values for demonstration
const selectedMood = MOOD.RELAX;
const selectedAttention = ATTENTION.MEDIUM;

const moodOptions = computed(() => [
  { value: MOOD.RELAX, label: t('mood.relaxed'), icon: IconRelax },
  { value: MOOD.LIGERO, label: t('mood.light'), icon: IconLigero },
  { value: MOOD.INTENSO, label: t('mood.intense'), icon: IconIntenso },
  {
    value: MOOD.EMOCIONAL,
    label: t('mood.emotional'),
    icon: IconEmocional,
  },
  {
    value: MOOD.REFLEXIVO,
    label: t('mood.reflective'),
    icon: IconReflexivo,
  },
]);

const attentionOptions = computed(() => [
  { value: ATTENTION.LOW, label: t('attention.low'), icon: IconBattery0 },
  {
    value: ATTENTION.MEDIUM,
    label: t('attention.medium'),
    icon: IconBattery50,
  },
  {
    value: ATTENTION.HIGH,
    label: t('attention.high'),
    icon: IconBattery100,
  },
]);
</script>

