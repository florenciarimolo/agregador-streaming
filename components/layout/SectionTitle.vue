<template>
  <div class="space-y-4 text-center">
    <h2
      class="text-h2 font-heading font-semibold text-gray-800 dark:text-gray-300"
    >
      <slot />
    </h2>
    <p
      v-if="description"
      class="text-subtitle font-body text-gray-800 dark:text-gray-300"
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
