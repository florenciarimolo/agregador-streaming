<template>
  <section
    class="pt-6 pb-6 w-full space-y-4 md:space-y-8 section-container"
  >
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
/* Section: Contenedor estándar para secciones */
/* El espaciado entre elementos se maneja directamente en los componentes hijos */
</style>
