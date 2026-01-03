<template>
  <div class="px-4 md:max-w-7xl md:mx-auto md:px-6">
    <slot />
  </div>
</template>

<script setup lang="ts">
// AppShell: ÚNICA fuente de verdad para el ancho compartido
// Mobile: px-4 (padding lateral)
// Desktop: max-w-7xl mx-auto px-6 (md+)
// Se usa en: Navbar, Main, Footer
// NO se usa en: PageContainer (solo maneja spacing vertical)
</script>

