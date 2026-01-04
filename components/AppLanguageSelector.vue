<template>
  <SelectMenu
    ref="dropdownRef"
    position="right"
    width="w-48"
    :close-on-click-outside="true"
    select-id="app-language-selector"
  >
    <template #trigger="{ isOpen }">
      <!-- Trigger Button with Flag -->
      <button
        type="button"
        class="flex gap-2 items-center px-3 py-2 text-sm font-medium text-gray-800 rounded-lg transition-colors dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        :class="{
          'bg-gray-100 dark:bg-gray-700': isOpen,
        }"
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
            isOpen ? 'rotate-180' : ''
          }`"
        />
      </button>
    </template>
    <div
      class="flex overflow-hidden flex-col max-h-64 rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600"
    >
      <!-- Options List -->
      <div data-dropdown-scroll class="overflow-y-auto flex-1 custom-scrollbar">
        <div class="py-2">
          <!-- Language Options -->
          <div
            v-for="lang in availableLanguages"
            :key="lang.i18nCode"
            class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
            :class="{
              'dark:bg-gray-800/30 bg-gray-100/50':
                currentLocale === lang.i18nCode,
            }"
            @click="selectLanguage(lang.i18nCode)"
          >
            <img
              :src="`/icons/flags/${getFlagFileName(lang.flagCode)}.svg`"
              :alt="lang.flagCode"
              class="object-contain flex-shrink-0 w-5 h-4"
              loading="lazy"
              @error="
                (e) => ((e.target as HTMLImageElement).style.display = 'none')
              "
            />
            <span
              class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap"
              >{{ lang.nativeName }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </SelectMenu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  type Language,
} from '@/constants/languages';
import { LanguageCode } from '@/types/enums/LanguageCode';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';

const { locale, setLocale } = useI18n();

const availableLanguages = AVAILABLE_LANGUAGES;

const dropdownRef = ref<InstanceType<typeof SelectMenu> | null>(null);

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

// Get current locale
const currentLocale = computed(() => locale.value);

// Get current language object based on i18n locale
const currentLanguageObj = computed<Language | undefined>(() => {
  const found = availableLanguages.find(
    (l) => l.i18nCode === currentLocale.value
  );
  // Fallback to Spanish if not found
  return (
    found || availableLanguages.find((l) => l.i18nCode === DEFAULT_LANGUAGE)
  );
});

const selectLanguage = async (i18nCode: string) => {
  try {
    // Validate that the i18nCode is a valid LanguageCode enum value
    if (!isValidI18nCode(i18nCode)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Invalid i18n code: ${i18nCode}. Falling back to default`);
      }
      // Use default language if invalid
      await setLocale(getDefaultI18nCode());
      dropdownRef.value?.close();
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

    dropdownRef.value?.close();
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
    dropdownRef.value?.close();
  }
};
</script>
