<script setup lang="ts">
import { onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'

const library = useLibraryStore()

onMounted(() => {
  if (library.content.length === 0) {
    library.loadMockData()
  }
})
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Tu biblioteca</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="item in library.content"
        :key="item.id"
        class="bg-white shadow rounded overflow-hidden"
      >
        <img :src="item.image" :alt="item.title" class="w-full h-auto" />
        <div class="p-2">
          <h2 class="font-semibold">{{ item.title }}</h2>
          <p class="text-sm text-gray-600">{{ item.platform.join(', ') }}</p>
          <a
            :href="item.url"
            target="_blank"
            class="text-blue-500 text-sm underline"
          >
            Ver ahora
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
