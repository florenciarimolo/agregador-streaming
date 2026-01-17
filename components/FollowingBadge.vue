<template>
  <div
    v-if="isFollowing"
    class="flex justify-center items-center w-8 h-8 rounded-full backdrop-blur-sm bg-primary-600/90"
  >
    <IconStar icon-class="w-5 h-5 text-white" />
  </div>
</template>

<script setup lang="ts">
import IconStar from '@/components/icons/IconStar.vue';

interface Props {
  isFollowing?: boolean;
}

withDefaults(defineProps<Props>(), {
  isFollowing: false,
});
</script>
