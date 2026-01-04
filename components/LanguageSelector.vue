<template>
  <Listbox v-slot="{ open }" v-model="selectedLanguageObj" by="code">
    <div class="relative" :data-open="open">
      <div v-show="false">{{ updateOpenState(open) }}</div>
      <ListboxButton
        ref="buttonRef"
        class="px-4 py-2 w-full text-left text-gray-800 rounded-lg border border-gray-300 opacity-90 dark:bg-gray-800/50 bg-white/80 dark:border-gray-600 dark:text-gray-300 backdrop-blur-xs hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
              open ? 'rotate-180' : ''
            }`"
          />
        </span>
      </ListboxButton>

      <Teleport to="body">
        <ListboxOptions
          v-if="open"
          :style="dropdownStyle"
          class="fixed z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-gray-300 backdrop-blur-sm dark:bg-gray-900/95 bg-white/95 dark:border-gray-600 shadow-lg focus:outline-none"
        >
            <div data-dropdown-scroll class="max-h-64 overflow-y-auto custom-scrollbar">
              <div class="py-2">
                <ListboxOption
                  v-for="lang in availableLanguages"
                  :key="lang.code"
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
                      selected
                        ? 'dark:bg-gray-800/30 bg-gray-100/50'
                        : '',
                    ]"
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
                    <span class="text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap">{{
                      lang.nativeName
                    }}</span>
                  </div>
                </ListboxOption>
              </div>
            </div>
          </ListboxOptions>
      </Teleport>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import { AVAILABLE_LANGUAGES, type Language } from '@/constants/languages';
import IconChevronDown from '@/components/icons/IconChevronDown.vue';

interface Props {
  modelValue: string | null | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// NOTE: This is for CONTENT language preference, not app language

const availableLanguages = AVAILABLE_LANGUAGES;

// Use a ref to store the actual Language object to maintain reference stability
// This ensures Headless UI can properly compare objects using by="code"
const getInitialLanguage = (): Language => {
  if (!props.modelValue) {
    return availableLanguages[0];
  }
  const found = availableLanguages.find((l) => l.code === props.modelValue);
  return found || availableLanguages[0];
};

const selectedLanguageObj = ref<Language>(getInitialLanguage());

// Watch for external changes to modelValue and update the ref
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      const found = availableLanguages.find((l) => l.code === newValue);
      if (found && found !== selectedLanguageObj.value) {
        selectedLanguageObj.value = found;
      }
    } else {
      selectedLanguageObj.value = availableLanguages[0];
    }
  },
  { immediate: true }
);

// Watch for changes to selectedLanguageObj and emit the code
watch(
  () => selectedLanguageObj.value,
  (newLang) => {
    if (newLang && newLang.code !== props.modelValue) {
      emit('update:modelValue', newLang.code);
    }
  }
);

// Keep selectedLanguage for display fallback
const selectedLanguage = computed(() => props.modelValue);

// Positioning for dropdown
const buttonRef = ref<InstanceType<typeof ListboxButton> | null>(null);
const dropdownStyle = ref<{
  position: 'fixed';
  top: string;
  left: string;
  minWidth: string;
  width: string;
}>({
  position: 'fixed',
  top: '0px',
  left: '0px',
  minWidth: '200px',
  width: 'max-content',
});

// Update dropdown position based on button position
const updateDropdownPosition = () => {
  if (!buttonRef.value) return;

  const button = buttonRef.value.$el as HTMLElement;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`, // mt-1 = 4px
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
    width: 'max-content',
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

// NOTE: This selector is for CONTENT language preference, NOT app language
// Do NOT change i18n locale here - that's handled by AppLanguageSelector
</script>
