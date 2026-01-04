<template>
  <div
    class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl p-6 md:p-8"
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
              mood === moodOption.value
                ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:border-primary/50 dark:hover:border-purple-500/30',
            ]"
            @click="selectMood(moodOption.value as Mood)"
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
              attention === attentionOption.value
                ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
                : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:border-primary/50 dark:hover:border-purple-500/30',
            ]"
            @click="selectAttention(attentionOption.value as Attention)"
          >
            <component :is="attentionOption.icon" class="w-3.5 h-3.5" />
            <span>{{ attentionOption.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  MoodEnum,
  type MoodEnum as MoodEnumType,
} from '@/types/enums/MoodEnum';
import {
  AttentionEnum,
  type AttentionEnum as AttentionEnumType,
} from '@/types/enums/AttentionEnum';
import IconRelax from './icons/IconRelax.vue';
import IconLigero from './icons/IconLigero.vue';
import IconIntenso from './icons/IconIntenso.vue';
import IconEmocional from './icons/IconEmocional.vue';
import IconReflexivo from './icons/IconReflexivo.vue';
import IconBattery0 from './icons/IconBattery0.vue';
import IconBattery50 from './icons/IconBattery50.vue';
import IconBattery100 from './icons/IconBattery100.vue';

const { t } = useI18n();

type Mood = MoodEnumType | null;
type Attention = AttentionEnumType | null;

const route = useRoute();
const router = useRouter();

// Initialize from query params
const mood = ref<Mood>((route.query.mood as MoodEnumType) || null);
const attention = ref<Attention>(
  (route.query.attention as AttentionEnumType) || null
);

const moodOptions = computed(() => [
  { value: MoodEnum.RELAX, label: t('mood.relaxed'), icon: IconRelax },
  { value: MoodEnum.LIGERO, label: t('mood.light'), icon: IconLigero },
  { value: MoodEnum.INTENSO, label: t('mood.intense'), icon: IconIntenso },
  {
    value: MoodEnum.EMOCIONAL,
    label: t('mood.emotional'),
    icon: IconEmocional,
  },
  {
    value: MoodEnum.REFLEXIVO,
    label: t('mood.reflective'),
    icon: IconReflexivo,
  },
]);

const attentionOptions = computed(() => [
  { value: AttentionEnum.LOW, label: t('attention.low'), icon: IconBattery0 },
  {
    value: AttentionEnum.MEDIUM,
    label: t('attention.medium'),
    icon: IconBattery50,
  },
  {
    value: AttentionEnum.HIGH,
    label: t('attention.high'),
    icon: IconBattery100,
  },
]);

const selectMood = (value: Mood) => {
  mood.value = mood.value === value ? null : value;
  updateQuery();
};

const selectAttention = (value: Attention) => {
  attention.value = attention.value === value ? null : value;
  updateQuery();
};

const updateQuery = () => {
  const query: Record<string, string> = {};

  // Copy existing query params (excluding mood and attention)
  Object.keys(route.query).forEach((key) => {
    if (key !== 'mood' && key !== 'attention') {
      const value = route.query[key];
      if (value !== null && value !== undefined) {
        const strValue = Array.isArray(value) ? value[0] : value;
        if (strValue !== null) {
          query[key] = strValue;
        }
      }
    }
  });

  if (mood.value) {
    query.mood = mood.value;
  } else {
    delete query.mood;
  }

  if (attention.value) {
    query.attention = attention.value;
  } else {
    delete query.attention;
  }

  router.replace({ query });
};

// Watch for external query changes
watch(
  () => route.query.mood,
  (newMood) => {
    mood.value = (newMood as MoodEnumType) || null;
  }
);

watch(
  () => route.query.attention,
  (newAttention) => {
    attention.value = (newAttention as AttentionEnumType) || null;
  }
);
</script>
