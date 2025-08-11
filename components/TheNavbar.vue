<template>
    <div class="h-auto text-white bg-gray-900 fixed top-0 z-50 w-[80%]">
      <nav class="p-4 bg-gray-800">
        <div class="container flex items-center justify-between mx-auto">
          <div class="text-lg font-bold">Agregador Streaming</div>
          <div>
            <nuxt-link to="/" class="px-3 py-2 text-white hover:text-gray-300"
              >Inicio</nuxt-link
            >
            <nuxt-link
              to="/search"
              class="px-3 py-2 text-white hover:text-gray-300"
              >Buscar</nuxt-link
            >
            <nuxt-link
              to="/library"
              class="px-3 py-2 text-white hover:text-gray-300"
              >Biblioteca</nuxt-link
            >
          </div>
        </div>
      </nav>
    </div>
  </template>
  
  <script lang="ts">
  export default {};
  </script>
  
  <style scoped></style>