<template>
  <div class="flex items-center gap-2">
    <!-- Sun icon for light mode -->
    <svg
      class="w-5 h-5 transition-colors"
      :class="
        theme === 'light'
          ? 'text-yellow-500'
          : 'dark:text-gray-500 text-gray-400'
      "
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>

    <!-- Toggle Switch -->
    <button
      type="button"
      role="switch"
      :aria-checked="theme === 'dark'"
      :aria-label="
        theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'
      "
      class="relative inline-flex h-7 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      :class="theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'"
      @click="toggleTheme"
    >
      <!-- Toggle Circle - Perfectly rounded -->
      <span
        class="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
        :class="theme === 'dark' ? 'translate-x-7' : 'translate-x-0'"
      ></span>
    </button>

    <!-- Moon icon for dark mode -->
    <svg
      class="w-5 h-5 transition-colors"
      :class="
        theme === 'dark' ? 'text-blue-400' : 'dark:text-gray-500 text-gray-400'
      "
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
// @ts-expect-error - useTheme is auto-imported by Nuxt
const { theme, toggleTheme } = useTheme();
</script>
