<template>
  <!-- Floating Navbar (Desktop/Tablet) -->
  <header class="hidden sticky top-4 z-50 w-full md:block">
    <AppShell>
      <nav
        class="rounded-3xl border shadow-md backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10"
      >
        <div class="flex justify-between items-center py-4 px-4 md:px-6">
          <!-- Logo -->
          <nuxt-link
            to="/"
            class="flex items-center transition-opacity hover:opacity-80"
          >
            <img
              src="/logo-light.png"
              :alt="$t('common.appName')"
              class="object-contain w-auto h-8 dark:hidden"
            />
            <img
              src="/logo-dark.png"
              :alt="$t('common.appName')"
              class="hidden object-contain w-auto h-8 dark:block"
            />
          </nuxt-link>

          <!-- Desktop Menu -->
          <div class="flex items-center gap-6 flex-shrink-0">
            <!-- Navigation Links (Always visible) -->
            <nav class="flex gap-6 items-center">
              <nuxt-link
                to="/"
                class="text-sm font-medium text-gray-800 transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                active-class="text-primary dark:text-primary-400"
              >
                {{ $t('navbar.home') }}
              </nuxt-link>
              <nuxt-link
                to="/discover"
                class="text-sm font-medium text-gray-800 transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                active-class="text-primary dark:text-primary-400"
              >
                {{ $t('discover.title') }}
              </nuxt-link>
            </nav>

            <!-- When logged in: Mi Watchlist and User Avatar -->
            <template v-if="currentUser">
              <nuxt-link
                to="/watchlist"
                class="text-sm font-medium text-gray-800 transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                active-class="text-primary dark:text-primary-400"
              >
                {{ $t('navbar.watchlist') }}
              </nuxt-link>

              <!-- User Avatar -->
              <div class="relative flex items-center justify-center">
                <ActionMenu
                  ref="userMenuDropdownRef"
                  position="right"
                  width="w-64"
                  custom-class="backdrop-blur-3xl"
                >
                  <template #trigger>
                    <AvatarButton
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
                          currentUser.id ||
                          (currentUser as { sub?: string })?.sub
                        "
                        size="md"
                      />
                    </AvatarButton>
                  </template>
                  <div class="p-4 backdrop-blur-3xl">
                    <p
                      class="mb-3 text-sm font-medium text-gray-800 truncate dark:text-gray-300"
                    >
                      {{ userProfile?.display_name || currentUser.email }}
                    </p>
                    <p
                      v-if="userProfile?.display_name && currentUser.email"
                      class="mb-3 text-xs text-gray-500 truncate dark:text-gray-400"
                    >
                      {{ currentUser.email }}
                    </p>
                    <nuxt-link
                      to="/lists"
                      class="block px-4 py-2 mb-2 w-full text-sm text-left text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      @click="userMenuDropdownRef?.close()"
                    >
                      {{ $t('navbar.lists') }}
                    </nuxt-link>
                    <nuxt-link
                      to="/preferences"
                      class="block px-4 py-2 mb-2 w-full text-sm text-left text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      @click="userMenuDropdownRef?.close()"
                    >
                      {{ $t('navbar.preferences') }}
                    </nuxt-link>
                    <nuxt-link
                      to="/my-account"
                      class="block px-4 py-2 mb-2 w-full text-sm text-left text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      @click="userMenuDropdownRef?.close()"
                    >
                      {{ $t('navbar.myAccount') }}
                    </nuxt-link>
                    <!-- Theme Switcher (when logged in) -->
                    <div class="flex justify-between items-center px-4 py-2 mb-2">
                      <span class="text-sm font-medium text-gray-800 dark:text-gray-300">
                        {{ $t('navbar.theme') }}
                      </span>
                      <ThemeSwitcher />
                    </div>
                    <div
                      class="my-2 border-t border-gray-300/50 dark:border-white/10"
                    ></div>
                    <button
                      type="button"
                      class="block px-4 py-2 mb-2 w-full text-sm text-left text-red-600 dark:text-red-400 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                      @click="
                        userMenuDropdownRef?.close();
                        handleLogoutClick();
                      "
                    >
                      {{ $t('navbar.logout') }}
                    </button>
                  </div>
                </ActionMenu>
              </div>
            </template>

            <!-- When not logged in: Iniciar sesión and Theme Switcher -->
            <template v-else>
              <button
                type="button"
                class="text-sm font-medium text-gray-800 transition-colors dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                @click="showAuthForm = true"
              >
                {{ $t('auth.login') }}
              </button>
              <!-- Theme Switcher (when not logged in) -->
              <ThemeSwitcher />
            </template>
          </div>
        </div>
      </nav>
    </AppShell>
  </header>

  <!-- Mobile Navbar -->
  <header
    class="fixed left-0 top-4 z-50 w-full transition-transform duration-300 md:hidden"
    :style="{ transform: `translateY(${isNavbarVisible ? '0' : '-10px'})` }"
  >
    <AppShell>
      <nav
        class="rounded-3xl border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/90 border-gray-300/50 dark:border-white/10"
      >
        <div class="flex justify-between items-center py-3 px-4">
          <!-- Logo -->
          <nuxt-link to="/" class="flex items-center">
            <img
              src="/logo-light.png"
              :alt="$t('common.appName')"
              class="object-contain w-auto h-6 dark:hidden"
            />
            <img
              src="/logo-dark.png"
              :alt="$t('common.appName')"
              class="hidden object-contain w-auto h-6 dark:block"
            />
          </nuxt-link>

          <!-- Right side: Search Icon and Hamburger Menu -->
          <div class="flex items-center gap-2">
            <!-- Search Icon -->
            <IconButton
              :icon="IconSearch"
              :aria-label="$t('search.title')"
              size="large"
              variant="ghost"
              custom-class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 [&_svg]:text-gray-800 dark:[&_svg]:text-gray-300"
              @click.stop="toggleMobileSearch"
            />

            <!-- Hamburger Menu (always visible) -->
            <IconButton
              :icon="showMobileMenu ? IconClose : IconMenu"
              :aria-label="$t('navbar.mobileMenu')"
              size="large"
              variant="ghost"
              custom-class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 [&_svg]:text-gray-800 dark:[&_svg]:text-gray-300"
              @click.stop="toggleMobileMenu"
            />
          </div>
        </div>
      </nav>
    </AppShell>
  </header>

  <!-- Mobile Search Bar Overlay (Shown when search icon is clicked) -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showMobileSearch"
      class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
      @click="closeMobileSearch"
    ></div>
  </Transition>

  <!-- Mobile Search Bar (Shown when search icon is clicked) -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="transform translate-y-[-100%] opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-[-100%] opacity-0"
  >
    <div
      v-if="showMobileSearch"
      class="fixed left-0 top-20 z-[70] w-full md:hidden mt-4"
      @click.stop
    >
      <AppShell>
        <div
          class="rounded-3xl border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/90 border-gray-300/50 dark:border-white/10 p-4"
        >
          <SearchBar ref="mobileSearchBarRef" @closed="closeMobileSearch" />
        </div>
      </AppShell>
    </div>
  </Transition>

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
      v-if="showMobileMenu"
      class="fixed top-0 right-0 z-[100] w-80 max-w-[85vw] h-full dark:bg-gray-900/95 bg-gray-100/95 backdrop-blur-xl border-3xl border-gray-300/50 dark:border-white/10 shadow-2xl md:hidden overflow-y-auto"
      style="z-index: 100"
      @click.stop
    >
      <div class="p-6">
        <!-- User Info Section (only when logged in) -->
        <template v-if="currentUser">
          <div
            class="flex gap-4 items-start pb-6 mb-8 border-b border-gray-300/50 dark:border-white/10"
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
            <div class="overflow-hidden flex-1 min-w-0">
              <p
                class="mb-1 text-sm font-medium text-gray-800 whitespace-nowrap dark:text-gray-300"
              >
                {{ userProfile?.display_name || currentUser.email }}
              </p>
              <p
                v-if="currentUser.email"
                class="text-xs text-gray-500 whitespace-nowrap dark:text-gray-400"
              >
                {{ currentUser.email }}
              </p>
            </div>
          </div>
        </template>

        <!-- Menu Items -->
        <nav class="space-y-2">
          <nuxt-link
            to="/"
            class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
            @click="showMobileMenu = false"
          >
            {{ $t('navbar.home') }}
          </nuxt-link>
          
          <!-- Menu items when logged in -->
          <template v-if="currentUser">
            <nuxt-link
              to="/discover"
              class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
              @click="showMobileMenu = false"
            >
              {{ $t('discover.title') }}
            </nuxt-link>
            <nuxt-link
              to="/watchlist"
              class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
              @click="showMobileMenu = false"
            >
              {{ $t('navbar.watchlist') }}
            </nuxt-link>
            <nuxt-link
              to="/lists"
              class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
              @click="showMobileMenu = false"
            >
              {{ $t('navbar.lists') }}
            </nuxt-link>
            <nuxt-link
              to="/preferences"
              class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
              @click="showMobileMenu = false"
            >
              {{ $t('navbar.preferences') }}
            </nuxt-link>
            <nuxt-link
              to="/my-account"
              class="flex items-center px-4 py-3 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-gray-100 dark:bg-gray-700 text-primary dark:text-primary-400"
              @click="showMobileMenu = false"
            >
              {{ $t('navbar.myAccount') }}
            </nuxt-link>
          </template>

          <!-- When not logged in: Iniciar sesión button -->
          <template v-else>
            <button
              type="button"
              class="flex items-center px-4 py-3 w-full text-sm font-medium text-left text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="
                showMobileMenu = false;
                showAuthForm = true;
              "
            >
              {{ $t('auth.login') }}
            </button>
          </template>

          <!-- App Language Selector (only when logged in) -->
          <template v-if="currentUser">
            <div class="flex justify-between items-center px-4 py-3">
              <span class="text-sm font-medium text-gray-800 dark:text-gray-300">
                {{ $t('settings.language.title') }}
              </span>
              <AppLanguageSelector />
            </div>
          </template>

          <!-- Theme Switcher (always visible) -->
          <div class="flex justify-between items-center px-4 py-3">
            <span class="text-sm font-medium text-gray-800 dark:text-gray-300">
              {{ $t('navbar.theme') }}
            </span>
            <ThemeSwitcher />
          </div>

          <!-- Logout button (only when logged in) -->
          <template v-if="currentUser">
            <div
              class="my-2 border-t border-gray-300/50 dark:border-white/10"
            ></div>
            <button
              type="button"
              class="block px-4 py-3 w-full text-sm text-left text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              @click="handleLogoutClick"
            >
              {{ $t('navbar.logout') }}
            </button>
          </template>
        </nav>
      </div>
    </div>
  </Transition>

  <!-- Scroll to Top Button (Mobile only) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <IconButton
      v-show="showScrollToTop && isMobile"
      :icon="IconArrowUp"
      :aria-label="$t('navbar.scrollToTop')"
      size="large"
      variant="default"
      custom-class="fixed right-6 bottom-6 z-40 p-3 text-white bg-gradient-to-br rounded-full shadow-lg transition-all duration-300 from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary hover:shadow-xl md:hidden"
      @click="scrollToTop"
    />
  </Transition>

  <!-- Logout Confirmation Dialog -->
  <Modal :is-open="showLogoutConfirm" @close="cancelLogout">
    <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-300">
      {{ $t('navbar.logoutConfirm') }}
    </h3>
    <p class="mb-4 text-gray-800 dark:text-gray-300">
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

  <!-- Auth Form Modal -->
  <Modal :is-open="showAuthForm" @close="showAuthForm = false" custom-class="max-w-md p-0">
    <AuthForm
      in-modal
      @success="handleAuthSuccess"
      @signup="handleSignupSuccess"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Avatar from './Avatar.vue';
import ActionMenu from '@/components/ui/ActionMenu.vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import IconButton from '@/components/ui/IconButton.vue';
import AvatarButton from '@/components/ui/AvatarButton.vue';
import SearchBar from '@/components/SearchBar.vue';
import AppShell from '@/components/layout/AppShell.vue';
import IconMenu from '@/components/icons/IconMenu.vue';
import IconClose from '@/components/icons/IconClose.vue';
import IconSearch from '@/components/icons/IconSearch.vue';
import IconArrowUp from '@/components/icons/IconArrowUp.vue';
import AppLanguageSelector from '@/components/AppLanguageSelector.vue';
import AuthForm from '@/components/AuthForm.vue';
import ThemeSwitcher from '@/components/ThemeSwitcher.vue';

// User state
const user = useSupabaseUser();
const userStore = useUserStore();
const { signOut } = useAuth();
const router = useRouter();
const showMobileMenu = ref(false);
const showMobileSearch = ref(false);
const userMenuDropdownRef = ref<InstanceType<typeof ActionMenu> | null>(null);
const mobileSearchBarRef = ref<InstanceType<typeof SearchBar> | null>(null);

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
  // Close search if open
  if (showMobileMenu.value) {
    showMobileSearch.value = false;
  }
};

// Toggle mobile search
const toggleMobileSearch = () => {
  showMobileSearch.value = !showMobileSearch.value;
  // Close menu if open
  if (showMobileSearch.value) {
    showMobileMenu.value = false;
  }
};

// Close mobile search
const closeMobileSearch = () => {
  showMobileSearch.value = false;
  // Clear search query
  if (mobileSearchBarRef.value) {
    mobileSearchBarRef.value.clearSearch();
  }
};

// Logout confirmation state
const showLogoutConfirm = ref(false);

// Auth form modal state
const showAuthForm = ref(false);

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

// Handle auth success
const handleAuthSuccess = () => {
  showAuthForm.value = false;
};

// Handle signup success
const handleSignupSuccess = () => {
  showAuthForm.value = false;
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
