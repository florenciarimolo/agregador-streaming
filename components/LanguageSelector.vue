<template>
  <SelectMenu
    ref="dropdownRef"
    position="left"
    width="w-full"
    :close-on-click-outside="true"
    @open="handleDropdownOpen"
  >
    <template #trigger="{ isOpen }">
      <!-- Selected Value Display -->
      <Button
        type="button"
        variant="outline"
        size="medium"
        custom-class="px-4 py-2 w-full text-left text-gray-800 rounded-lg border border-gray-300 opacity-90 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 dark:text-gray-300 backdrop-blur-xs hover:opacity-100"
      >
        <span class="flex gap-2 justify-between items-center w-full">
          <div class="flex overflow-hidden flex-1 gap-2 items-center min-w-0">
            <img
              v-if="selectedLanguageObj"
              :src="`/icons/flags/${getFlagFileName(selectedLanguageObj.flagCode)}.svg`"
              :alt="selectedLanguageObj.flagCode"
              class="object-contain flex-shrink-0 w-5 h-4"
              loading="lazy"
              @error="
                (e) => ((e.target as HTMLImageElement).style.display = 'none')
              "
            />
            <span class="text-sm truncate">{{
              selectedLanguageObj?.nativeName || selectedLanguage || ''
            }}</span>
          </div>
          <IconChevronDown
            :icon-class="`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`"
          />
        </span>
      </Button>
    </template>
    <div
      class="flex overflow-hidden flex-col max-h-64 rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600"
    >
      <!-- Options List -->
      <div class="overflow-y-auto flex-1 custom-scrollbar">
        <div class="py-2">
          <!-- Language Options -->
          <div
            v-for="lang in availableLanguages"
            :key="lang.code"
            class="flex gap-3 items-center px-4 py-3 transition-colors duration-150 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-gray-100/50"
            :class="{
              'dark:bg-gray-800/30 bg-gray-100/50':
                selectedLanguage === lang.code,
            }"
            @click="selectLanguage(lang.code)"
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
            <span class="text-sm text-gray-800 dark:text-gray-300">{{
              lang.nativeName
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </SelectMenu>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AVAILABLE_LANGUAGES, type Language } from '@/constants/languages';
import SelectMenu from '@/components/ui/SelectMenu.vue';
import Button from '@/components/ui/Button.vue';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';

interface Props {
  modelValue: string | null | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const { locale } = useI18n();

// Initialize selectedLanguage from props only
// NOTE: This is for CONTENT language preference, not app language
const getInitialLanguage = (): string | null => {
  return props.modelValue || null;
};

const selectedLanguage = ref<string | null>(getInitialLanguage());

const availableLanguages = AVAILABLE_LANGUAGES;

const dropdownRef = ref<InstanceType<typeof SelectMenu> | null>(null);

// Get selected language object
// NOTE: This is for CONTENT language preference, not app language
const selectedLanguageObj = computed<Language | undefined>(() => {
  if (!selectedLanguage.value) {
    return availableLanguages[0];
  }
  return availableLanguages.find((l) => l.code === selectedLanguage.value);
});

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

const handleDropdownOpen = () => {
  // No search needed for languages
};

const selectLanguage = (code: string) => {
  selectedLanguage.value = code;
  emit('update:modelValue', code);
  // NOTE: This selector is for CONTENT language preference, NOT app language
  // Do NOT change i18n locale here - that's handled by AppLanguageSelector
  dropdownRef.value?.close();
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedLanguage.value = newValue || null;
  }
);

// NOTE: Removed watch for i18n locale changes
// This selector is for CONTENT language preference, not app language
// App language changes are handled by AppLanguageSelector
</script>
