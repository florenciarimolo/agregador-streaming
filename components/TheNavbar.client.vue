<template>
  <!-- Floating Navbar (Desktop/Tablet) -->
  <header class="sticky top-4 z-50 w-full container mx-auto hidden md:block">
    <nav
      class="shadow-md dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-3xl border border-gray-300/50 dark:border-white/10"
    >
      <div class="flex items-center justify-between px-8 py-4">
        <!-- Logo -->
        <nuxt-link
          to="/"
          class="flex items-center transition-opacity hover:opacity-80"
        >
          <img
            src="/logo-light.png"
            :alt="$t('common.appName')"
            class="h-8 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-dark.png"
            :alt="$t('common.appName')"
            class="h-8 w-auto object-contain hidden dark:block"
          />
        </nuxt-link>

        <!-- Desktop Menu -->
        <div class="flex items-center gap-4 w-[70%] justify-end">
          <!-- Navigation Links (only if logged in) -->
          <nav v-if="currentUser" class="flex items-center gap-6 mr-4">
            <nuxt-link
              to="/"
              class="text-sm font-medium dark:text-gray-300 text-gray-800 hover:text-primary dark:hover:text-primary-400 transition-colors"
              active-class="text-primary dark:text-primary-400"
            >
              {{ $t('navbar.home') }}
            </nuxt-link>
            <nuxt-link
              to="/watchlist"
              class="text-sm font-medium dark:text-gray-300 text-gray-800 hover:text-primary dark:hover:text-primary-400 transition-colors"
              active-class="text-primary dark:text-primary-400"
            >
              {{ $t('navbar.watchlist') }}
            </nuxt-link>
          </nav>

          <!-- Theme Switcher -->
          <ThemeSwitcher />

          <!-- User Avatar (if logged in) -->
          <div v-if="currentUser" ref="userMenuContainer" class="relative">
            <button
              type="button"
              class="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer shadow-md"
              :aria-label="
                $t('navbar.userMenuFor', {
                  email: currentUser.email || 'usuario',
                })
              "
              @click="toggleUserMenu"
            >
              {{ getUserInitials(currentUser.email) }}
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
                class="absolute right-0 mt-2 w-64 dark:bg-gray-900/90 bg-gray-100/90 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 z-50"
                @click.stop
              >
                <div class="p-4">
                  <p
                    class="text-sm font-medium dark:text-gray-300 text-gray-800 truncate mb-3"
                  >
                    {{ currentUser.email }}
                  </p>
                  <nuxt-link
                    to="/profile"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.editProfile') }}
                  </nuxt-link>
                  <nuxt-link
                    to="/seen"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.seen') }}
                  </nuxt-link>
                  <nuxt-link
                    to="/not-interested"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.notInterested') }}
                  </nuxt-link>
                  <div
                    class="border-t border-gray-300/50 dark:border-white/10 my-2"
                  ></div>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                    @click="handleLogoutClick"
                  >
                    {{ $t('navbar.logout') }}
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
    class="fixed top-4 left-0 z-50 w-full transition-transform duration-300 md:hidden px-4"
    :style="{ transform: `translateY(${isNavbarVisible ? '0' : '-10px'})` }"
  >
    <nav
      class="dark:bg-gray-900/40 bg-gray-100/90 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10"
    >
      <div class="flex items-center justify-between px-6 py-3">
        <!-- Logo -->
        <nuxt-link to="/" class="flex items-center">
          <img
            src="/logo-light.png"
            :alt="$t('common.appName')"
            class="h-6 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo-dark.png"
            :alt="$t('common.appName')"
            class="h-6 w-auto object-contain hidden dark:block"
          />
        </nuxt-link>

        <!-- Mobile Menu -->
        <div class="flex items-center gap-2">
          <!-- Navigation Links (only if logged in) -->
          <nav v-if="currentUser" class="flex items-center gap-4 mr-2">
            <nuxt-link
              to="/"
              class="text-xs font-medium dark:text-gray-300 text-gray-800 hover:text-primary dark:hover:text-primary-400 transition-colors"
              active-class="text-primary dark:text-primary-400"
            >
              {{ $t('navbar.home') }}
            </nuxt-link>
            <nuxt-link
              to="/watchlist"
              class="text-xs font-medium dark:text-gray-300 text-gray-800 hover:text-primary dark:hover:text-primary-400 transition-colors"
              active-class="text-primary dark:text-primary-400"
            >
              {{ $t('navbar.watchlist') }}
            </nuxt-link>
          </nav>

          <!-- Theme Switcher -->
          <ThemeSwitcher />

          <!-- User Avatar (if logged in) -->
          <div
            v-if="currentUser"
            ref="userMenuContainerMobile"
            class="relative"
          >
            <button
              type="button"
              class="w-8 h-8 rounded-full bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center text-white font-semibold text-xs hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer shadow-md touch-manipulation"
              :aria-label="
                $t('navbar.userMenuFor', {
                  email: currentUser.email || 'usuario',
                })
              "
              @click="toggleUserMenu"
            >
              {{ getUserInitials(currentUser.email) }}
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
                class="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] dark:bg-gray-900/90 bg-gray-100/90 backdrop-blur-xl rounded-lg border border-gray-300/50 dark:border-white/10 z-[60] shadow-xl"
                @click.stop
              >
                <div class="p-4">
                  <p
                    class="text-sm font-medium dark:text-gray-300 text-gray-800 truncate mb-3"
                  >
                    {{ currentUser.email }}
                  </p>
                  <nuxt-link
                    to="/profile"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.editProfile') }}
                  </nuxt-link>
                  <nuxt-link
                    to="/seen"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.seen') }}
                  </nuxt-link>
                  <nuxt-link
                    to="/not-interested"
                    class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                    @click="showUserMenu = false"
                  >
                    {{ $t('navbar.notInterested') }}
                  </nuxt-link>
                  <div
                    class="border-t border-gray-300/50 dark:border-white/10 my-2"
                  ></div>
                  <button
                    type="button"
                    class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                    @click="handleLogoutClick"
                  >
                    {{ $t('navbar.logout') }}
                  </button>
                </div>
              </div>
            </Transition>
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
      :aria-label="$t('navbar.scrollToTop')"
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

  <!-- Logout Confirmation Dialog -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform scale-95 opacity-0"
    enter-to-class="transform scale-100 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform scale-100 opacity-100"
    leave-to-class="transform scale-95 opacity-0"
  >
    <div
      v-if="showLogoutConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click="cancelLogout"
    >
      <div
        class="dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 dark:border-white/10 rounded-3xl shadow-xl p-6 max-w-md mx-4"
        @click.stop
      >
        <h3 class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2">
          {{ $t('navbar.logoutConfirm') }}
        </h3>
        <p class="text-gray-800 dark:text-gray-300 mb-4">
          {{ $t('navbar.logoutConfirmMessage') }}
        </p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            @click="cancelLogout"
          >
            {{ $t('common.cancel') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            @click="confirmLogout"
          >
            {{ $t('navbar.logout') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';

// User state
const user = useSupabaseUser();
const userStore = useUserStore();
const { signOut } = useAuth();
const router = useRouter();
const showUserMenu = ref(false);

// Use computed to ensure user is available after hydration
// During hydration, useSupabaseUser() might be null initially, so we also check the store
const currentUser = computed(() => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  return user.value || userStore.user;
});

// Get user initials from email
const getUserInitials = (email: string | undefined | null): string => {
  if (!email) return 'U';
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

// Toggle user menu
const toggleUserMenu = async (event?: Event) => {
  // Prevent the click from immediately triggering handleClickOutside
  if (event) {
    event.stopPropagation();
  }

  const wasOpen = showUserMenu.value;
  showUserMenu.value = !showUserMenu.value;

  // If we just opened the menu, wait for next tick to ensure DOM is updated
  // before allowing handleClickOutside to process
  if (!wasOpen && showUserMenu.value) {
    await nextTick();
  }
};

// Logout confirmation state
const showLogoutConfirm = ref(false);

// Handle logout click (show confirmation)
const handleLogoutClick = () => {
  showLogoutConfirm.value = true;
  showUserMenu.value = false;
};

// Confirm logout
const confirmLogout = async () => {
  try {
    showLogoutConfirm.value = false;
    await signOut();
    await router.push('/');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error signing out:', error);
    }
  }
};

// Cancel logout
const cancelLogout = () => {
  showLogoutConfirm.value = false;
};

// Refs for user menu containers
const userMenuContainer = ref<HTMLElement | null>(null);
const userMenuContainerMobile = ref<HTMLElement | null>(null);

// Close user menu when clicking outside
const handleClickOutside = (event: Event) => {
  // Don't process if menu is closed
  if (!showUserMenu.value) return;

  const target = event.target as HTMLElement;
  if (!target) return;

  // Get the active container (desktop or mobile)
  const activeContainer =
    userMenuContainer.value || userMenuContainerMobile.value;

  // If no container found, don't do anything
  if (!activeContainer) return;

  // Check if the click was inside the container (button or menu)
  // This includes the button that toggles the menu
  if (activeContainer.contains(target)) {
    return; // Click was inside, don't close
  }

  // Click was outside, close the menu
  // Use nextTick to ensure this runs after toggleUserMenu has finished
  nextTick(() => {
    if (showUserMenu.value) {
      showUserMenu.value = false;
    }
  });
};

// Scroll to top state
const showScrollToTop = ref(false);
const isMobile = ref(false);

// Navbar visibility state
const isNavbarVisible = ref(true);
const lastScrollY = ref(0);

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
      isNavbarVisible.value = true;
    } else if (scrollTop > lastScrollY.value && scrollTop > 100) {
      isNavbarVisible.value = false;
    } else if (scrollTop < lastScrollY.value) {
      isNavbarVisible.value = true;
    }
  } else {
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
};

onMounted(() => {
  checkMobile();
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('resize', handleResize);
  // Use bubbling phase (default) so button handlers run first
  document.addEventListener('click', handleClickOutside, false);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', handleClickOutside, false);
});
</script>

<style scoped>
.backdrop-blur-md {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.touch-manipulation {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
</style>
