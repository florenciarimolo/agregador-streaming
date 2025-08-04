<template>
  <div></div>
</template>
<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
let movieId = route.params.id;

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId !== oldId) {
      movieId = newId;
    }
  },
  { immediate: true }, // Ejecuta la función inmediatamente con el valor actual
);
</script>
<style lang=""></style>
