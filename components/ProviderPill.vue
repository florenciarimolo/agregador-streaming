<template>
  <div
    class="flex gap-2 items-center px-4 py-1.5 rounded-full border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
  >
    <img
      v-if="provider.logo_path"
      :src="`https://image.tmdb.org/t/p/w45${provider.logo_path}`"
      :alt="provider.provider_name"
      class="object-contain w-auto h-5"
    />
    <span class="text-xs font-semibold text-gray-800 dark:text-gray-300">{{
      provider.provider_name
    }}</span>
    <CloseButton
      custom-class="ml-1"
      :aria-label="ariaLabel"
      @click="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import CloseButton from '@/components/ui/CloseButton.vue';

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
}

interface Props {
  provider: Provider;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: '',
});

defineEmits<{
  remove: [];
}>();
</script>

