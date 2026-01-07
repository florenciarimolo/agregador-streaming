<template>
  <div
    v-if="isOpen"
    class="space-y-6 p-6 rounded-3xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10 md:p-8"
  >
    <!-- Mood and Attention Selector -->
    <MoodSelector
      :no-container="true"
      :model-value-mood="selectedMood"
      :model-value-attention="selectedAttention"
      @update:mood="$emit('update:selectedMood', $event)"
      @update:attention="$emit('update:selectedAttention', $event)"
    />

    <!-- Content Type Filter -->
    <div class="flex flex-col gap-2">
      <label
        class="text-label uppercase tracking-overline font-label text-gray-800 dark:text-gray-300"
      >
        {{ $t('home.contentTypeFilter') }}
      </label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="typeOption in [
            { value: 'all', label: $t('home.contentTypeAll') },
            {
              value: 'movie',
              label: $t('home.contentTypeMovie'),
            },
            { value: 'tv', label: $t('home.contentTypeTv') },
          ]"
          :key="typeOption.value"
          :class="[
            'px-3 py-1.5 rounded-full font-medium transition-all text-xs',
            selectedContentType === typeOption.value
              ? 'bg-primary-800 text-white border border-gray-700/50 dark:border-gray-600/50'
              : 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:border-primary/50 dark:hover:border-purple-500/30',
          ]"
          @click="
            $emit('update:selectedContentType', typeOption.value as
              | 'all'
              | 'movie'
              | 'tv')
          "
        >
          {{ typeOption.label }}
        </button>
      </div>
    </div>

    <!-- Genres -->
    <div class="flex flex-col gap-2">
      <label
        class="text-label uppercase tracking-overline font-label text-gray-800 dark:text-gray-300"
      >
        {{ $t('preferences.content.favoriteGenres.title') }}
      </label>
      <GenreSelector
        v-model="selectedGenreForSelector"
        :available-genres="availableGenres"
        :selected-genres="selectedGenres"
        @select="(genre: any) => addGenre(genre)"
      />

      <!-- Selected Genres List -->
      <div v-if="selectedGenres.length > 0" class="mt-4">
        <p
          class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
        >
          {{ $t('preferences.content.favoriteGenres.selected') }}
          ({{ selectedGenres.length }})
        </p>
        <div class="flex flex-wrap gap-2">
          <FilterPill
            v-for="genre in selectedGenres"
            :key="genre.id"
            :label="genre.name"
            :aria-label="
              $t('preferences.content.favoriteGenres.remove', {
                name: genre.name,
              })
            "
            @remove="removeGenre(genre.id)"
          />
        </div>
      </div>
    </div>

    <!-- Providers -->
    <div class="flex flex-col gap-2">
      <label
        class="text-label uppercase tracking-overline font-label text-gray-800 dark:text-gray-300"
      >
        {{ $t('preferences.content.includedProviders.title') }}
      </label>
      <ProviderSelector
        v-model="selectedProviderForSelector"
        :available-providers="availableProviders"
        :selected-providers="selectedProviders"
        :placeholder="
          $t('preferences.content.includedProviders.searchPlaceholder')
        "
        :max-results="0"
        @select="(provider: any) => addProvider(provider)"
      />

      <!-- Selected Providers List -->
      <div v-if="selectedProviders.length > 0" class="mt-4">
        <p
          class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-300"
        >
          {{ $t('preferences.content.includedProviders.selected') }}
          ({{ selectedProviders.length }})
        </p>
        <div class="flex flex-wrap gap-2">
          <FilterPill
            v-for="provider in selectedProviders"
            :key="provider.provider_id"
            :label="provider.provider_name"
            :icon="
              provider.logo_path
                ? `https://image.tmdb.org/t/p/w45${provider.logo_path}`
                : undefined
            "
            :aria-label="
              $t('preferences.content.includedProviders.remove', {
                name: provider.provider_name,
              })
            "
            @remove="removeProvider(provider.provider_id)"
          />
        </div>
      </div>
    </div>

    <!-- Apply and Clear Filters Buttons -->
    <div class="flex justify-end gap-2">
      <Button
        v-if="hasActiveFilters"
        variant="secondary"
        size="small"
        icon-position="left"
        @click="$emit('clear')"
      >
        <template #icon>
          <IconX icon-class="w-4 h-4" />
        </template>
        {{ $t('common.clearFilters') }}
      </Button>
      <Button
        variant="primary"
        size="small"
        @click="$emit('apply')"
      >
        {{ $t('common.applyFilters') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { Mood } from '@/constants/domain/mood';
import type { Attention } from '@/constants/domain/attention';
import Button from '@/components/ui/Button.vue';
import GenreSelector from '@/components/GenreSelector.vue';
import ProviderSelector from '@/components/ProviderSelector.vue';
import FilterPill from '@/components/ui/FilterPill.vue';
import IconX from '@/components/icons/IconX.vue';
import MoodSelector from '@/components/MoodSelector.vue';

interface Genre {
  id: number;
  name: string;
  type?: typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV;
}

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Props {
  isOpen: boolean;
  availableGenres: Genre[];
  availableProviders: Provider[];
  selectedGenres: Genre[];
  selectedProviders: Provider[];
  selectedContentType: 'all' | 'movie' | 'tv';
  selectedMood?: Mood | null;
  selectedAttention?: Attention | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:selectedGenres': [genres: Genre[]];
  'update:selectedProviders': [providers: Provider[]];
  'update:selectedContentType': [contentType: 'all' | 'movie' | 'tv'];
  'update:selectedMood': [mood: Mood | null];
  'update:selectedAttention': [attention: Attention | null];
  clear: [];
  apply: [];
}>();

// Selected genre/provider for selectors (temporary state)
const selectedGenreForSelector = ref<Genre | null>(null);
const selectedProviderForSelector = ref<Provider | null>(null);

// Local state for selected items
const selectedGenres = ref<Genre[]>([...props.selectedGenres]);
const selectedProviders = ref<Provider[]>([...props.selectedProviders]);

// Watch props changes to sync local state
watch(
  () => props.selectedGenres,
  (newGenres) => {
    selectedGenres.value = [...newGenres];
  },
  { deep: true }
);

watch(
  () => props.selectedProviders,
  (newProviders) => {
    selectedProviders.value = [...newProviders];
  },
  { deep: true }
);

// Add genre to selected list
const addGenre = (genre: Genre) => {
  if (selectedGenres.value.some((g) => g.id === genre.id)) {
    return;
  }
  selectedGenres.value.push({ id: genre.id, name: genre.name });
  emit('update:selectedGenres', [...selectedGenres.value]);
};

// Remove genre from selected list
const removeGenre = (genreId: number) => {
  selectedGenres.value = selectedGenres.value.filter((g) => g.id !== genreId);
  emit('update:selectedGenres', [...selectedGenres.value]);
};

// Add provider to selected list
const addProvider = (provider: Provider) => {
  if (
    selectedProviders.value.some(
      (p) => p.provider_id === provider.provider_id
    )
  ) {
    return;
  }
  selectedProviders.value.push(provider);
  emit('update:selectedProviders', [...selectedProviders.value]);
};

// Remove provider from selected list
const removeProvider = (providerId: number) => {
  selectedProviders.value = selectedProviders.value.filter(
    (p) => p.provider_id !== providerId
  );
  emit('update:selectedProviders', [...selectedProviders.value]);
};

// Check if there are active filters
const hasActiveFilters = computed(() => {
  return (
    selectedGenres.value.length > 0 ||
    selectedProviders.value.length > 0 ||
    props.selectedMood !== null ||
    props.selectedAttention !== null ||
    props.selectedContentType !== 'all'
  );
});
</script>

