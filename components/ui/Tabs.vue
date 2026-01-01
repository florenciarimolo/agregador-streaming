<template>
  <div>
    <!-- Tab Buttons -->
    <nav :class="['flex items-center gap-2 overflow-x-auto', customClass]">
      <slot
        name="buttons"
        :active-tab="activeTab"
        :set-active-tab="setActiveTab"
      />
    </nav>

    <!-- Tab Content -->
    <div class="mt-6">
      <slot :active-tab="activeTab" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    defaultTab?: string;
    customClass?: string;
  }>(),
  {
    defaultTab: '',
    customClass: '',
  }
);

const emit = defineEmits<{
  'update:activeTab': [tab: string];
  'tab-change': [tab: string | number];
}>();

const activeTab = ref(props.defaultTab);

const setActiveTab = (tab: string) => {
  activeTab.value = tab;
  emit('update:activeTab', tab);
  emit('tab-change', tab);
};

watch(
  () => props.defaultTab,
  (newTab) => {
    if (newTab) {
      activeTab.value = newTab;
    }
  }
);

defineExpose({
  activeTab,
  setActiveTab,
});
</script>
