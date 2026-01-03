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
            <span class="text-sm truncate">{{
              selectedLanguage
                ? availableLanguages.find((l) => l.code === selectedLanguage)
                    ?.name || selectedLanguage
                : availableLanguages[0]?.name || ''
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
            <span class="text-sm text-gray-800 dark:text-gray-300">{{
              lang.name
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </SelectMenu>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
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

const selectedLanguage = ref<string | null>(props.modelValue || null);

const availableLanguages = AVAILABLE_LANGUAGES;

const dropdownRef = ref<InstanceType<typeof SelectMenu> | null>(null);

const handleDropdownOpen = () => {
  // No search needed for languages
};

const selectLanguage = (code: string) => {
  selectedLanguage.value = code;
  emit('update:modelValue', code);
  dropdownRef.value?.close();
};

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedLanguage.value = newValue || null;
  }
);
</script>
