<template>
  <div class="w-full">
    <slot />
  </div>
</template>

<script setup lang="ts">
// PageContainer: Solo maneja spacing vertical de página
// NO define ancho (eso lo hace AppShell en layouts/default.vue)
// Se usa dentro de AppShell para espaciado vertical consistente
// NO usar en: landing, auth, onboarding (layouts especiales)
</script>

