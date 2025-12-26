<template>
  <!-- Floating Navbar (Desktop/Tablet) -->
  <header
    class="sticky top-4 left-1/2 transform -translate-x-1/2 z-50 w-full container hidden md:block"
  >
    <nav
      class="shadow-md dark:bg-gray-800/60 bg-gray-100/80 backdrop-blur-sm rounded-2xl border border-primary/20"
    >
      <div class="flex items-center justify-between px-6 py-4">
        <!-- Logo -->
        <nuxt-link
          to="/"
          class="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <img src="/logo.png" alt="UpNext" class="h-8 w-8" />
          <span class="text-md font-bold dark:text-white text-gray-900"
            >UpNext</span
          >
        </nuxt-link>

        <!-- Desktop Menu -->
        <div class="flex items-center gap-4 w-[70%]">
          <!-- Search Bar -->
          <div class="flex-1">
            <SearchBar />
          </div>
          <!-- Theme Switcher -->
          <ThemeSwitcher />
          <!-- User Avatar (if logged in) -->
          <div v-if="user" class="relative">
            <button
              type="button"
              class="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer shadow-md"
              :aria-label="`Menú de usuario para ${user.email}`"
              @click="toggleUserMenu"
            >
              {{ getUserInitials(user.email) }}
            </button>
            <!-- User Menu Dropdown -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-64 dark:bg-gray-800/90 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl border border-primary/20 z-50"
                @click.stop
              >
                <div class="p-4">
                  <p
                    class="text-sm font-medium dark:text-white text-gray-900 truncate mb-3"
                  >
                    {{ user.email }}
                  </p>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                    @click="handleLogout"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </nav>
  </header>

  <!-- Mobile Navbar -->
  <header
    class="fixed top-4 left-0 z-50 w-full transition-transform duration-300 md:hidden"
    :style="{ transform: `translateY(${isNavbarVisible ? '0' : '-100%'})` }"
  >
    <nav
      class="dark:bg-gray-800/70 bg-gray-100/90 backdrop-blur-xs rounded-lg border border-primary/20"
    >
      <div class="flex items-center justify-between px-4 py-3">
        <!-- Logo -->
        <nuxt-link to="/" class="flex items-center gap-2">
          <img src="/logo.png" alt="UpNext" class="h-6 w-6" />
          <span class="text-md font-bold dark:text-white text-gray-900"
            >StreamHub</span
          >
        </nuxt-link>

        <div class="flex items-center gap-2">
          <!-- User Avatar (if logged in) -->
          <div v-if="user" class="relative">
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer shadow-md"
              :aria-label="`Menú de usuario para ${user.email}`"
              @click="toggleUserMenu"
            >
              {{ getUserInitials(user.email) }}
            </button>
            <!-- User Menu Dropdown (Mobile) -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-64 dark:bg-gray-800/90 bg-white/90 backdrop-blur-sm rounded-lg shadow-xl border border-primary/20 z-50"
                @click.stop
              >
                <div class="p-4">
                  <p
                    class="text-sm font-medium dark:text-white text-gray-900 truncate mb-3"
                  >
                    {{ user.email }}
                  </p>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                    @click="handleLogout"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </Transition>
          </div>
          <!-- Theme Switcher -->
          <ThemeSwitcher />
          <!-- Hamburger Button -->
          <button
            class="p-2 dark:text-white text-gray-900 transition-colors hover:text-primary !border-none"
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
      </div>

      <!-- Mobile Menu Dropdown -->
      <div
        v-show="isMobileMenuOpen"
        class="absolute left-0 w-full shadow-lg top-full dark:bg-gray-800 bg-gray-100 backdrop-blur-xs mt-1 rounded-lg"
      >
        <div class="px-4 py-3 space-y-3">
          <!-- Mobile Search Bar -->
          <div class="mb-2">
            <SearchBar />
          </div>
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
      class="fixed z-40 p-3 text-white transition-all duration-300 rounded-full shadow-lg bottom-6 right-6 bg-gradient-to-br from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary hover:shadow-xl md:hidden"
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

// User state
const user = useSupabaseUser();
const { signOut } = useAuth();
const router = useRouter();
const showUserMenu = ref(false);

// Get user initials from email
const getUserInitials = (email: string | undefined): string => {
  if (!email) return 'U';
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

// Toggle user menu
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value;
};

// Handle logout
const handleLogout = async () => {
  try {
    showUserMenu.value = false;
    await signOut();
    await router.push('/');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

// Close user menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (!showUserMenu.value) return;
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showUserMenu.value = false;
  }
};

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
  if (user.value) {
    document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClickOutside);
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
