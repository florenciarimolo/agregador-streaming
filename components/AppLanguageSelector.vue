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
          v-if="currentLanguageObj"
          :src="`/icons/flags/${getFlagFileName(currentLanguageObj.flagCode)}.svg`"
          :alt="currentLanguageObj.flagCode"
          class="object-contain flex-shrink-0 w-5 h-4"
          loading="lazy"
          @error="
            (e) => ((e.target as HTMLImageElement).style.display = 'none')
          "
        />
        <span class="text-sm">{{
          currentLanguageObj?.nativeName || 'Español'
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
import { useI18n } from 'vue-i18n';
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

const { locale, setLocale } = useI18n();

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

  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`, // mt-1 = 4px
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

// Map flag codes to file names
const getFlagFileName = (flagCode: string): string => {
  const flagMap: Record<string, string> = {
    ES: 'es',
    CAT: 'cat',
    GAL: 'gal',
    EUS: 'eus',
    US: 'us',
    GB: 'gb',
  };
  return flagMap[flagCode] || flagCode.toLowerCase();
};

// Get current language object based on i18n locale
const currentLanguageObj = computed<Language | undefined>(() => {
  const found = availableLanguages.find((l) => l.i18nCode === locale.value);
  // Fallback to Spanish if not found
  return (
    found || availableLanguages.find((l) => l.i18nCode === DEFAULT_LANGUAGE)
  );
});

// Selected language for Listbox (must be the Language object, not just the code)
const selectedLanguage = computed({
  get: () => currentLanguageObj.value || availableLanguages[0],
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
        // Use default language if invalid
        await setLocale(getDefaultI18nCode());
        return;
      }

      // Get old language before changing
      const oldLanguage = locale.value;

      // Use setLocale to properly change the language
      // This will save to cookies automatically via nuxt.config.ts
      // After type guard, TypeScript knows i18nCode is ValidI18nCode (LanguageCode)
      await setLocale(i18nCode);

      // Notify regions composable about app language change
      if (oldLanguage !== i18nCode) {
        const { invalidateCache, notifyAppLanguageChange } = useRegions();
        // Invalidate cache for old language
        invalidateCache(oldLanguage);
        // Notify about the change
        notifyAppLanguageChange(i18nCode);
      }
    } catch (error) {
      // Fallback to direct assignment if setLocale fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error setting locale:', error);
      }
      // Use validated code or default
      const fallbackCode: ValidI18nCode = isValidI18nCode(i18nCode)
        ? i18nCode
        : getDefaultI18nCode();
      locale.value = fallbackCode;
    }
  },
});
</script>
