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
          <div v-if="currentUser" class="relative">
            <Dropdown
              ref="userMenuDropdownRef"
              position="right"
              width="w-64"
              custom-class="backdrop-blur-3xl"
            >
              <template #trigger>
                <button
                  type="button"
                  class="hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer shadow-md rounded-full border border-primary"
                  :aria-label="
                    $t('navbar.userMenuFor', {
                      email: currentUser.email || 'usuario',
                    })
                  "
                >
                  <Avatar
                    :avatar-url="userProfile?.avatar_url"
                    :display-name="userProfile?.display_name"
                    :email="currentUser.email"
                    :user-id="
                      currentUser.id || (currentUser as { sub?: string })?.sub
                    "
                    size="md"
                  />
                </button>
              </template>
              <div class="p-4 backdrop-blur-3xl">
                <p
                  class="text-sm font-medium dark:text-gray-300 text-gray-800 truncate mb-3"
                >
                  {{ userProfile?.display_name || currentUser.email }}
                </p>
                <p
                  v-if="userProfile?.display_name && currentUser.email"
                  class="text-xs text-gray-500 dark:text-gray-400 truncate mb-3"
                >
                  {{ currentUser.email }}
                </p>
                <nuxt-link
                  to="/profile"
                  class="block w-full px-4 py-2 text-sm dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left mb-2"
                  @click="userMenuDropdownRef?.close()"
                >
                  {{ $t('navbar.editProfile') }}
                </nuxt-link>
                <div
                  class="border-t border-gray-300/50 dark:border-white/10 my-2"
                ></div>
                <button
                  type="button"
                  class="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                  @click="
                    userMenuDropdownRef?.close();
                    handleLogoutClick();
                  "
                >
                  {{ $t('navbar.logout') }}
                </button>
              </div>
            </Dropdown>
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
      class="dark:bg-gray-900/40 bg-gray-100/90 backdrop-blur-xl rounded-3xl border border-gray-300/50 dark:border-white/10"
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

        <!-- Hamburger Menu Button -->
        <button
          v-if="currentUser"
          type="button"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          :aria-label="$t('navbar.mobileMenu')"
          @click.stop="toggleMobileMenu"
        >
          <svg
            class="w-6 h-6 dark:text-gray-300 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              v-if="!showMobileMenu"
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
    </nav>
  </header>

  <!-- Mobile Menu Overlay (Outside header, covers navbar with blur) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
      @click="showMobileMenu = false"
    ></div>
  </Transition>

  <!-- Mobile Menu Panel (Outside header to avoid blur and overflow issues) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-x-full"
    enter-to-class="transform translate-x-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-x-0"
    leave-to-class="transform translate-x-full"
  >
    <div
      v-if="showMobileMenu && currentUser"
      class="fixed top-0 right-0 z-[100] w-80 max-w-[85vw] h-full dark:bg-gray-900/95 bg-gray-100/95 backdrop-blur-xl border-3xl border-gray-300/50 dark:border-white/10 shadow-2xl md:hidden overflow-y-auto"
      style="z-index: 100"
      @click.stop
    >
      <div class="p-6">
        <!-- User Info Section -->
        <div
          class="flex items-start gap-4 mb-8 pb-6 border-b border-gray-300/50 dark:border-white/10"
        >
          <!-- Avatar (not clickable) -->
          <div class="flex-shrink-0">
            <Avatar
              :avatar-url="userProfile?.avatar_url"
              :display-name="userProfile?.display_name"
              :email="currentUser.email"
              :user-id="
                currentUser.id || (currentUser as { sub?: string })?.sub
              "
              size="md"
            />
          </div>
          <!-- Display Name and Email -->
          <div class="flex-1 min-w-0 overflow-hidden">
            <p
              class="text-sm font-medium dark:text-gray-300 text-gray-800 whitespace-nowrap mb-1"
            >
              {{ userProfile?.display_name || currentUser.email }}
            </p>
            <p
              v-if="currentUser.email"
              class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            >
              {{ currentUser.email }}
            </p>
          </div>
        </div>

        <!-- Menu Items -->
        <nav class="space-y-2">
          <nuxt-link
            to="/"
            class="flex items-center px-4 py-3 text-sm font-medium dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
            @click="showMobileMenu = false"
          >
            {{ $t('navbar.home') }}
          </nuxt-link>
          <nuxt-link
            to="/profile"
            class="flex items-center px-4 py-3 text-sm font-medium dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
            @click="showMobileMenu = false"
          >
            {{ $t('navbar.editProfile') }}
          </nuxt-link>
          <nuxt-link
            to="/watchlist"
            class="flex items-center px-4 py-3 text-sm font-medium dark:text-gray-300 text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
            @click="showMobileMenu = false"
          >
            {{ $t('navbar.watchlist') }}
          </nuxt-link>
          <!-- Theme Switcher -->
          <div class="flex items-center justify-between px-4 py-3">
            <span class="text-sm font-medium dark:text-gray-300 text-gray-800">
              {{ $t('navbar.theme') }}
            </span>
            <ThemeSwitcher />
          </div>
          <div
            class="border-t border-gray-300/50 dark:border-white/10 my-2"
          ></div>
          <button
            type="button"
            class="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
            @click="handleLogoutClick"
          >
            {{ $t('navbar.logout') }}
          </button>
        </nav>
      </div>
    </div>
  </Transition>

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
  <Modal :is-open="showLogoutConfirm" @close="cancelLogout">
    <h3 class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2">
      {{ $t('navbar.logoutConfirm') }}
    </h3>
    <p class="text-gray-800 dark:text-gray-300 mb-4">
      {{ $t('navbar.logoutConfirmMessage') }}
    </p>
    <div class="flex gap-3 justify-end">
      <Button size="small" variant="outline" @click="cancelLogout">
        {{ $t('common.cancel') }}
      </Button>
      <Button size="small" variant="danger" @click="confirmLogout">
        {{ $t('navbar.logout') }}
      </Button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Avatar from './Avatar.vue';
import Dropdown from '@/components/ui/Dropdown.vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';

// User state
const user = useSupabaseUser();
const userStore = useUserStore();
const { signOut } = useAuth();
const router = useRouter();
const showMobileMenu = ref(false);
const userMenuDropdownRef = ref<InstanceType<typeof Dropdown> | null>(null);

// Use computed to ensure user is available after hydration
// During hydration, useSupabaseUser() might be null initially, so we also check the store
const currentUser = computed(() => {
  // During hydration, useSupabaseUser() might not be ready yet
  // So we check both the composable and the store
  return user.value || userStore.user;
});

// Get user profile for display name and avatar
const userProfile = computed(() => {
  return userStore.profile;
});

// Toggle mobile menu
const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
  // Close desktop menu if open
  userMenuDropdownRef.value?.close();
};

// Logout confirmation state
const showLogoutConfirm = ref(false);

// Handle logout click (show confirmation)
const handleLogoutClick = () => {
  showLogoutConfirm.value = true;
  userMenuDropdownRef.value?.close();
  showMobileMenu.value = false;
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
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
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
