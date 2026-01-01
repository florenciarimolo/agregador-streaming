<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <Alert
      v-if="message"
      :variant="type === 'error' ? 'error' : 'success'"
      custom-class="mb-4"
      :show-icon="false"
    >
      {{ message }}
    </Alert>
  </Transition>
</template>

<script setup lang="ts">
import Alert from '@/components/ui/Alert.vue';

interface Props {
  message?: string | null;
  type?: 'error' | 'success';
}

withDefaults(defineProps<Props>(), {
  message: null,
  type: 'error',
});
</script>
