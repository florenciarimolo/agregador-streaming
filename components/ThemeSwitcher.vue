<template>
  <button
    v-if="mounted"
    type="button"
    role="switch"
    :aria-checked="theme === 'dark'"
    :aria-label="theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'"
    class="relative w-16 md:w-16 md:h-7 h-6 bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    @click="toggleTheme"
  >
    <div
      class="flex justify-between items-center gap-x-3 h-full px-1 overflow-hidden"
    >
      <!-- Sun icon (light theme) -->
      <svg
        class="z-10 transition-all duration-300 w-4 h-4 md:w-5 md:h-5 flex-shrink-0"
        :class="
          theme === 'dark'
            ? 'text-gray-400'
            : 'text-yellow-400 bg-gray-400 dark:bg-gray-800 rounded-full p-1'
        "
        fill="currentColor"
        viewBox="0 0 20 20"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          fill-rule="evenodd"
          d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
          clip-rule="evenodd"
        />
      </svg>
      <!-- Moon icon (dark theme) -->
      <svg
        class="z-10 transition-all duration-300 w-4 h-4 md:w-5 md:h-5 flex-shrink-0"
        :class="
          theme === 'dark'
            ? 'text-blue-400 bg-gray-400 dark:bg-gray-800 rounded-full p-1'
            : 'text-gray-400'
        "
        fill="currentColor"
        viewBox="0 0 20 20"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
        />
      </svg>
    </div>
  </button>
  <!-- Loading state (before mounted) -->
  <button
    v-else
    type="button"
    role="switch"
    aria-label="Toggle theme"
    disabled
    class="relative w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
  >
    <div
      class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
    />
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Nuxt auto-imports: useTheme
// Types are generated in .nuxt/types/imports.d.ts
const { theme, toggleTheme } = useTheme();
const mounted = ref(false);

onMounted(() => {
  mounted.value = true;
});
</script>
