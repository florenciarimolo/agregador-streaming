<template>
  <div
    ref="cardRef"
    :class="[
      'dark:bg-gray-900/40 bg-gray-100/80 backdrop-blur-xl rounded-3xl border border-gray-300/50 dark:border-white/10 relative overflow-hidden',
      paddingClass,
      customClass,
      enableFlashlight ? 'flashlight-card' : '',
    ]"
    :style="flashlightCardStyle"
  >
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFlashlight } from '@/composables/useFlashlight';

type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

const props = withDefaults(
  defineProps<{
    padding?: CardPadding;
    customClass?: string;
    enableFlashlight?: boolean;
  }>(),
  {
    padding: 'lg',
    customClass: undefined,
    enableFlashlight: false,
  }
);

const cardRef = ref<HTMLElement | null>(null);
const enableFlashlightRef = computed(() => props.enableFlashlight);

const { styles, isHovering } = useFlashlight(cardRef, enableFlashlightRef);

const paddingClass = computed(() => {
  const classes: Record<CardPadding, string> = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };
  return classes[props.padding];
});

const flashlightCardStyle = computed(() => {
  if (!props.enableFlashlight || !isHovering.value) {
    return {
      '--flashlight-bg': 'transparent',
      '--flashlight-border-top': 'transparent',
      '--flashlight-border-right': 'transparent',
      '--flashlight-border-bottom': 'transparent',
      '--flashlight-border-left': 'transparent',
    } as Record<string, string>;
  }
  
  return {
    '--flashlight-bg': styles.value.backgroundStyle,
    '--flashlight-border-top': styles.value.borderTopStyle,
    '--flashlight-border-right': styles.value.borderRightStyle,
    '--flashlight-border-bottom': styles.value.borderBottomStyle,
    '--flashlight-border-left': styles.value.borderLeftStyle,
  } as Record<string, string>;
});

</script>

<style scoped>
.flashlight-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: var(--flashlight-bg, transparent);
  opacity: var(--flashlight-opacity, 0);
  transition: opacity 0.2s ease-out;
  z-index: 1;
}

.flashlight-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  background-image: 
    var(--flashlight-border-top, transparent),
    var(--flashlight-border-right, transparent),
    var(--flashlight-border-bottom, transparent),
    var(--flashlight-border-left, transparent);
  background-size: 100% 1px, 1px 100%, 100% 1px, 1px 100%;
  background-position: top, right, bottom, left;
  background-repeat: no-repeat;
  opacity: var(--flashlight-opacity, 0);
  transition: opacity 0.2s ease-out;
  z-index: 0;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  padding: 1px;
}

.flashlight-card:hover::before,
.flashlight-card:hover::after {
  --flashlight-opacity: 1;
}
</style>

