<template>
  <div>
    <!-- Tab Buttons -->
    <nav :class="['flex items-center gap-2 overflow-x-auto', customClass]">
      <slot name="buttons" :activeTab="activeTab" :setActiveTab="setActiveTab" />
    </nav>

    <!-- Tab Content -->
    <div class="mt-4">
      <slot :activeTab="activeTab" />
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

