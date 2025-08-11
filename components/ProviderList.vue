<template lang="">
  <div
    v-if="mediaProviderPropList.length > 0"
    class="flex flex-row flex-wrap items-center justify-start gap-4"
  >
    <p class="font-semibold"> {{ watchTypeProp }}</p>
    <span
      v-for="provider in mediaProviderPropList"
      :key="provider.provider_id"
      class="inline-block mr-2"
    >
      <img
        :src="`https://image.tmdb.org/t/p/w300${provider.logo_path}`"
        :alt="provider.provider_name"
        class="inline-block w-12 h-12 rounded shadow-secondary/50 shadow-lg"
        :title="provider.provider_name"
      />
    </span>
  </div>
</template>
<script setup lang="ts">
import type { WatchProvider } from '@/types/WatchProvider';
import { watch } from 'vue';

const props = defineProps({
  mediaProviderPropList: {
    type: Array as () => WatchProvider[],
    required: true,
  },
  watchTypeProp: {
    type: String,
    required: true,
  },
});

watch(
  () => props.mediaProviderPropList,
  (newValue) => {
    if (newValue.length === 0) {
      console.warn('No providers available for this media.');
    }
  },
  { immediate: true }
);

watch(
  () => props.watchTypeProp,
  (newValue) => {
    if (!newValue) {
      console.warn('Watch type is not defined.');
    }
  },
  { immediate: true }
);
</script>
<style scoped></style>
