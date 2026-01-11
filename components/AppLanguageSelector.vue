<template>
  <Listbox v-slot="{ open }" v-model="selectedLanguage" by="i18nCode">
    <div class="relative" :data-open="open">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ListboxButton
        ref="buttonRef"
        class="flex gap-2 items-center px-3 py-2 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation select-none"
        :class="{
          'bg-gray-100 dark:bg-gray-700': open,
        }"
        style="
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        "
      >
        <img
          v-if="selectedLanguage"
          :src="`/icons/flags/${getFlagFileName(selectedLanguage.flagCode)}.svg`"
          :alt="selectedLanguage.flagCode"
          class="object-contain flex-shrink-0 w-5 h-4"
          loading="lazy"
          @error="
            (e) => ((e.target as HTMLImageElement).style.display = 'none')
          "
        />
        <span class="text-sm">{{
          selectedLanguage?.nativeName || 'Español'
        }}</span>
        <IconChevronDown
          :icon-class="`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`"
        />
      </ListboxButton>

      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <ListboxOptions
            v-if="open"
            :style="dropdownStyle"
            class="fixed z-[110] mt-1 overflow-hidden rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600 shadow-lg focus:outline-none"
          >
            <div
              data-dropdown-scroll
              class="max-h-64 overflow-y-auto custom-scrollbar"
            >
              <div class="py-2">
                <ListboxOption
                  v-for="lang in availableLanguages"
                  :key="lang.i18nCode"
                  v-slot="{ active, selected }"
                  :value="lang"
                  as="template"
                >
                  <div
                    :class="[
                      'flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer',
                      active
                        ? 'dark:bg-gray-800/50 bg-gray-100/50'
                        : 'bg-transparent',
                      selected ? 'dark:bg-gray-800/30 bg-gray-100/50' : '',
                    ]"
                  >
                    <img
                      :src="`/icons/flags/${getFlagFileName(lang.flagCode)}.svg`"
                      :alt="lang.flagCode"
                      class="object-contain flex-shrink-0 w-5 h-4"
                      loading="lazy"
                      @error="
                        (e) =>
                          ((e.target as HTMLImageElement).style.display =
                            'none')
                      "
                    />
                    <span
                      class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap"
                      >{{ lang.nativeName }}</span
                    >
                  </div>
                </ListboxOption>
              </div>
            </div>
          </ListboxOptions>
        </Transition>
      </Teleport>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Language,
} from '@/constants/languages';
import { LanguageCode } from '@/types/enums/LanguageCode';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';
import { useRegions } from '@/composables/useRegions';
import {
  getUrlCodeFromI18nCode,
  getI18nCodeFromUrlCode,
} from '@/composables/useLangFromUrl';
import {
  VALID_URL_CODES,
  type UrlLanguageCode,
} from '@/constants/urlLanguageCodes';
import { getFlagFileName } from '@/utils/flags';
import { useCurrentLanguage } from '@/composables/useCurrentLanguage';

interface Props {
  /**
   * If true, the dropdown will open upward when there's not enough space below.
   * This is useful for selectors in the footer.
   */
  openUpward?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  openUpward: false,
});

const { locale, setLocale } = useI18n();
const router = useRouter();
const route = useRoute(); // Must be called at top level of setup

const availableLanguages = AVAILABLE_LANGUAGES;

// Positioning for dropdown
const buttonRef = ref<InstanceType<typeof ListboxButton> | null>(null);
const dropdownStyle = ref<{
  position: 'fixed';
  top: string;
  right: string;
  minWidth: string;
  width: string;
  maxWidth?: string;
}>({
  position: 'fixed',
  top: '0px',
  right: '0px',
  minWidth: '192px',
  width: 'max-content',
});

// Update dropdown position based on button position
const updateDropdownPosition = () => {
  if (!buttonRef.value) return;

  const button = buttonRef.value.$el as HTMLElement;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const isMobile = window.innerWidth < 768; // md breakpoint

  // On mobile, align to the right edge of the button
  // On desktop, also align to the right edge
  const rightPosition = window.innerWidth - rect.right;

  // Ensure dropdown doesn't go off-screen on mobile
  const minWidth = Math.max(rect.width, 192); // Minimum width
  const maxRight = window.innerWidth - 16; // 16px padding from screen edge

  // Calculate dropdown height (approximate: header + items)
  // Each item is ~48px (py-3 = 12px top + 12px bottom + ~24px content)
  // Header padding: py-2 = 8px top + 8px bottom
  // Max height is 256px (max-h-64), but we'll use a more conservative estimate
  const estimatedDropdownHeight = Math.min(
    availableLanguages.length * 48 + 16, // items + padding
    256 // max-h-64
  );

  // Calculate available space
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  // Check if we should open upward
  // Priority: 1) openUpward prop forces upward, 2) auto-detect if not enough space below
  let shouldOpenUpward: boolean;
  if (props.openUpward) {
    // If openUpward is true, prefer upward unless there's not enough space above
    shouldOpenUpward =
      spaceAbove >= estimatedDropdownHeight || spaceAbove > spaceBelow;
  } else {
    // Auto-detect: open upward if not enough space below and more space above
    shouldOpenUpward =
      spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow;
  }

  // Calculate top position
  let topPosition: string;
  if (shouldOpenUpward) {
    // Position above the button
    const calculatedTop = rect.top - estimatedDropdownHeight - 4; // 4px gap
    // Ensure it doesn't go above viewport (16px padding from top)
    topPosition = `${Math.max(calculatedTop, 16)}px`;
  } else {
    // Position below the button (default)
    topPosition = `${rect.bottom + 4}px`; // mt-1 = 4px
  }

  dropdownStyle.value = {
    position: 'fixed',
    top: topPosition,
    right: `${Math.min(rightPosition, maxRight)}px`,
    minWidth: `${minWidth}px`,
    width: 'max-content',
    maxWidth: isMobile ? `${window.innerWidth - 32}px` : 'none', // Prevent overflow on mobile
  };
};

// Watch for open state and update position
const openState = ref(false);

// Method to update openState from template
const updateOpenState = (value: boolean) => {
  if (openState.value !== value) {
    openState.value = value;
  }
};

// Watch openState for position updates
watch(openState, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  updateDropdownPosition();
});

// Update position on scroll and resize when open
onMounted(() => {
  window.addEventListener('scroll', updateDropdownPosition, { passive: true });
  window.addEventListener('resize', updateDropdownPosition);
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateDropdownPosition);
  window.removeEventListener('resize', updateDropdownPosition);
});

// Type for valid i18n codes - use LanguageCode enum values since i18nCode matches them
type ValidI18nCode = LanguageCode;

// Helper function to validate i18n code (no hardcoded values)
const isValidI18nCode = (code: string): code is ValidI18nCode => {
  return Object.values(LanguageCode).includes(code as LanguageCode);
};

// Helper to get default i18n code (no hardcoded values)
const getDefaultI18nCode = (): ValidI18nCode => {
  // DEFAULT_LANGUAGE is already a LanguageCode enum value
  return DEFAULT_LANGUAGE;
};

// Get current language object based on route
// Uses centralized composable that handles route.params.lang and path extraction
const { currentLanguage } = useCurrentLanguage();
const currentLanguageObj = computed(() => currentLanguage.value);

/**
 * Get path without language prefix
 * @param fullPath - Full route path (e.g., '/es/movie/123')
 * @returns Path without language prefix (e.g., '/movie/123')
 */
const getPathWithoutLang = (fullPath: string): string => {
  // Remove leading slash and split
  const parts = fullPath.split('/').filter(Boolean);

  // Use VALID_URL_CODES from constants (deterministic)
  if (!VALID_URL_CODES || !Array.isArray(VALID_URL_CODES)) {
    return fullPath;
  }

  // If first part is a language code, remove it
  const firstPart = parts[0]?.toLowerCase();
  const isLangCode = VALID_URL_CODES.includes(firstPart || '');

  if (isLangCode && parts.length > 1) {
    // Remove language code and reconstruct path
    return '/' + parts.slice(1).join('/');
  } else if (isLangCode && parts.length === 1) {
    // Only language code, return root
    return '/';
  }

  // If no language prefix, return original
  return fullPath;
};

// Selected language for Listbox (must be the Language object, not just the code)
const selectedLanguage = computed({
  get: () => {
    const current = currentLanguageObj.value;
    if (current) {
      return current;
    }
    // Fallback to default language (Spanish) if currentLanguageObj is undefined
    const defaultLang = availableLanguages.find(
      (l) => l.i18nCode === DEFAULT_LANGUAGE
    );
    return defaultLang || availableLanguages[0];
  },
  set: async (lang: Language) => {
    const i18nCode = lang.i18nCode;
    try {
      // Validate that the i18nCode is a valid LanguageCode enum value
      if (!isValidI18nCode(i18nCode)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `Invalid i18n code: ${i18nCode}. Falling back to default`
          );
        }
        // Use default language if invalid - navigate to default language URL
        const defaultUrlCode = getUrlCodeFromI18nCode(getDefaultI18nCode());
        if (defaultUrlCode) {
          const pathWithoutLang = getPathWithoutLang(route.path);
          const defaultPath = `/${defaultUrlCode}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;
          const queryString = route.fullPath.includes('?')
            ? route.fullPath.substring(route.fullPath.indexOf('?'))
            : '';
          await router.push(`${defaultPath}${queryString}`);
        }
        return;
      }

      // Get old language before changing (convert URL code to i18n code for comparison)
      const oldLanguageUrlCode = locale.value;
      const oldLanguageI18nCode = getI18nCodeFromUrlCode(oldLanguageUrlCode);

      // Get URL code for new language
      const newLangUrlCode = getUrlCodeFromI18nCode(i18nCode);
      if (!newLangUrlCode) {
        console.warn(`Could not get URL code for i18n code: ${i18nCode}`);
        return;
      }

      // Get current path without language prefix
      const pathWithoutLang = getPathWithoutLang(route.path);

      // Build new path with new language prefix
      const newPath = `/${newLangUrlCode}${pathWithoutLang === '/' ? '' : pathWithoutLang}`;

      // Preserve query string if present
      const queryString = route.fullPath.includes('?')
        ? route.fullPath.substring(route.fullPath.indexOf('?'))
        : '';

      const newFullPath = `${newPath}${queryString}`;

      // CRITICAL: Only navigate - do NOT call setLocale() here
      // The middleware/sync-lang.ts will automatically synchronize i18n.locale
      // with route.params.lang after navigation. This ensures deterministic behavior
      // and prevents race conditions.
      await router.push(newFullPath);

      // Notify regions composable about app language change
      // Use i18n code for regions (they expect i18n format)
      if (oldLanguageI18nCode && oldLanguageI18nCode !== i18nCode) {
        const { invalidateCache, notifyAppLanguageChange } = useRegions();
        // Invalidate cache for old language (expects i18n code)
        invalidateCache(oldLanguageI18nCode);
        // Notify about the change (expects i18n code)
        notifyAppLanguageChange(i18nCode);
      }
    } catch (error) {
      // Log error but don't try to set locale directly
      // The middleware will handle synchronization after navigation
      if (process.env.NODE_ENV === 'development') {
        console.error('Error changing language:', error);
      }
    }
  },
});
</script>
