<template lang="">
  <div
    v-if="mediaProviderList.length > 0"
    class="flex flex-row flex-wrap items-center justify-start gap-4"
  >
    <p class="font-semibold"> {{ watchType }}</p>
    <span
      v-for="provider in mediaProviderList"
      :key="provider.provider_id"
      class="inline-block mr-2"
    >
      <img
        :src="`https://image.tmdb.org/t/p/w300${provider.logo_path}`"
        :alt="provider.provider_name"
        class="inline-block w-8 h-8 rounded"
        :title="provider.provider_name"
      />
    </span>
  </div>
</template>
<script setup lang="ts">
import type { WatchProvider } from '@/types/WatchProvider';
import { watch, computed } from 'vue';

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

const mediaProviderList = computed(() => {
  return props.mediaProviderPropList;
});

const watchType = computed(() => {
  return props.watchTypeProp;
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
