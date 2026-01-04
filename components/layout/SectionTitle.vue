<template>
  <div class="space-y-4">
    <h2
      class="text-2xl font-semibold text-gray-800 md:text-3xl dark:text-gray-300 font-heading"
    >
      <slot />
    </h2>
    <p
      v-if="description"
      class="text-sm text-gray-800 dark:text-gray-300 md:text-base"
    >
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
// SectionTitle: Títulos de sección (H2) estandarizados
// Mobile: text-2xl font-semibold mb-3
// Desktop: md:text-3xl md:mb-4 lg:mb-6
// Empezar sin props - añadir solo si hay necesidad real de niveles diferentes

interface Props {
  description?: string;
}

withDefaults(defineProps<Props>(), {
  description: undefined,
});
</script>
