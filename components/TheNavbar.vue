<template>
  <!-- Floating Navbar (Desktop/Tablet) -->
  <header
    class="sticky top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-[1100px] lg:px-4 hidden md:block"
  >
    <nav
      class="border shadow-2xl bg-gray-900/80 backdrop-blur-md border-primary rounded-2xl"
    >
      <div class="flex items-center justify-between px-6 py-4">
        <!-- Logo -->
        <nuxt-link
          to="/"
          class="text-xl font-bold text-white transition-colors hover:text-primary"
        >
          Agregador Streaming
        </nuxt-link>

        <!-- Desktop Menu -->
        <div class="flex items-center space-x-1">
          <nuxt-link
            to="/"
            class="px-4 py-2 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary"
            :class="{ 'text-primary bg-gray-800/50': $route.path === '/' }"
          >
            Inicio
          </nuxt-link>
          <nuxt-link
            to="/search"
            class="px-4 py-2 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary"
            :class="{
              'text-primary bg-gray-800/50': $route.path === '/search',
            }"
          >
            Buscar
          </nuxt-link>
          <nuxt-link
            to="/library"
            class="px-4 py-2 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary"
            :class="{
              'text-primary bg-gray-800/50': $route.path === '/library',
            }"
          >
            Biblioteca
          </nuxt-link>
        </div>
      </div>
    </nav>
  </header>

  <!-- Mobile Navbar -->
  <header
    class="fixed top-0 left-0 z-50 w-full transition-transform duration-300 md:hidden"
    :style="{ transform: `translateY(${isNavbarVisible ? '0' : '-100%'})` }"
  >
    <nav class="border-b bg-gray-900/95 backdrop-blur-sm border-gray-700/50">
      <div class="flex items-center justify-between px-4 py-3">
        <!-- Logo -->
        <nuxt-link to="/" class="text-lg font-bold text-white">
          Agregador Streaming
        </nuxt-link>

        <!-- Hamburger Button -->
        <button
          class="p-2 text-white transition-colors hover:text-primary"
          aria-label="Toggle menu"
          @click="toggleMobileMenu"
        >
          <svg
            :class="{ 'rotate-90': isMobileMenuOpen }"
            class="w-6 h-6 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!isMobileMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div
        v-show="isMobileMenuOpen"
        class="absolute left-0 w-full border-b shadow-lg top-full bg-gray-900/95 backdrop-blur-sm border-gray-700/50"
      >
        <div class="px-4 py-3 space-y-1">
          <nuxt-link
            to="/"
            class="block px-4 py-3 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary hover:bg-gray-800/50"
            :class="{ 'text-primary bg-gray-800/50': $route.path === '/' }"
            @click="closeMobileMenu"
          >
            Inicio
          </nuxt-link>
          <nuxt-link
            to="/search"
            class="block px-4 py-3 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary hover:bg-gray-800/50"
            :class="{
              'text-primary bg-gray-800/50': $route.path === '/search',
            }"
            @click="closeMobileMenu"
          >
            Buscar
          </nuxt-link>
          <nuxt-link
            to="/library"
            class="block px-4 py-3 text-sm font-medium text-white transition-all duration-200 rounded-lg hover:text-primary hover:bg-gray-800/50"
            :class="{
              'text-primary bg-gray-800/50': $route.path === '/library',
            }"
            @click="closeMobileMenu"
          >
            Biblioteca
          </nuxt-link>
        </div>
      </div>
    </nav>
  </header>

  <!-- Scroll to Top Button (Mobile only) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <button
      v-show="showScrollToTop && isMobile"
      class="fixed z-40 p-3 text-white transition-all duration-300 rounded-full shadow-lg bottom-6 right-6 bg-primary hover:bg-secondary hover:shadow-xl md:hidden"
      aria-label="Scroll to top"
      @click="scrollToTop"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Mobile menu state
const isMobileMenuOpen = ref(false);

// Scroll to top state
const showScrollToTop = ref(false);
const isMobile = ref(false);

// Navbar visibility state
const isNavbarVisible = ref(true);
const lastScrollY = ref(0);

// Toggle mobile menu
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// Scroll to top functionality
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
};

// Handle scroll events
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Show/hide scroll to top button
  showScrollToTop.value = scrollTop > 300;

  // Show/hide navbar ONLY on mobile
  if (isMobile.value) {
    if (scrollTop < 10) {
      // At the top - always show
      isNavbarVisible.value = true;
    } else if (scrollTop > lastScrollY.value && scrollTop > 100) {
      // Scrolling down & past 100px - hide navbar (mobile only)
      isNavbarVisible.value = false;
    } else if (scrollTop < lastScrollY.value) {
      // Scrolling up - show navbar (mobile only)
      isNavbarVisible.value = true;
    }
  } else {
    // Desktop - always show navbar
    isNavbarVisible.value = true;
  }

  lastScrollY.value = scrollTop;
};

// Detect mobile screen size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// Handle resize
const handleResize = () => {
  checkMobile();
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
/* Custom styles for better backdrop blur support */
.backdrop-blur-md {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Ensure proper z-index layering */
header {
  position: relative;
  z-index: 50;
}

/* Smooth transitions for mobile menu */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
