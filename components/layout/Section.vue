<template>
  <section class="space-y-12 md:space-y-16 lg:space-y-24 section-container">
    <slot />
  </section>
</template>

<script setup lang="ts">
// Section: Contenedor estándar para secciones
// Mobile: space-y-12 (separación vertical entre secciones)
// Desktop: md:space-y-16 lg:space-y-24
// Reduce espacio después de SectionTitle para mejor jerarquía visual
</script>

<style scoped>
/* Reduce espacio entre SectionTitle y su contenido para mejor jerarquía visual */
/* El space-y aplica mucho espacio, pero queremos menos entre título y contenido */
.section-container :deep(h2 + *) {
  margin-top: 1rem !important; /* mb-4 equivalente - menor que space-y-12 */
}

/* Espacio entre descripción (p) y contenido siguiente */
.section-container :deep(p + *) {
  margin-top: 1rem !important; /* Espacio después de descripción */
}

@media (min-width: 768px) {
  .section-container :deep(h2 + *) {
    margin-top: 1.25rem !important; /* md:mb-5 equivalente - menor que space-y-16 */
  }

  .section-container :deep(p + *) {
    margin-top: 1.25rem !important;
  }
}

@media (min-width: 1024px) {
  .section-container :deep(h2 + *) {
    margin-top: 1.5rem !important; /* lg:mb-6 equivalente - menor que space-y-24 */
  }

  .section-container :deep(p + *) {
    margin-top: 1.5rem !important;
  }
}
</style>
