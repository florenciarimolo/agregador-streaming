<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center font-semibold text-primary dark:text-white overflow-hidden relative group',
      sizeClasses,
      editable
        ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all'
        : '',
    ]"
    :style="avatarStyle"
    @click="editable ? $emit('click') : undefined"
  >
    <img
      v-if="avatarUrl"
      :src="avatarUrl"
      :alt="alt"
      class="w-full h-full object-cover rounded-full"
    />
    <span v-else class="select-none">{{ initials }}</span>

    <!-- Edit icon overlay on hover (only when editable) -->
    <div
      v-if="editable"
      class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <IconEdit :icon-class="iconSizeClasses + ' text-white'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IconEdit from './icons/IconEdit.vue';

const { t } = useI18n();

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: null,
  displayName: null,
  email: null,
  userId: undefined,
  size: 'md',
  editable: false,
});

defineEmits<{
  click: [];
}>();

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  return sizes[props.size];
});

const iconSizeClasses = computed(() => {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };
  return sizes[props.size];
});

const initials = computed(() => {
  if (props.displayName) {
    const parts = props.displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return props.displayName.substring(0, 2).toUpperCase();
  }

  if (props.email) {
    const parts = props.email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return props.email.substring(0, 2).toUpperCase();
  }

  return 'U';
});

// Generate consistent color from user ID or email
const avatarStyle = computed(() => {
  if (props.avatarUrl) {
    return {};
  }

  const seed = props.userId || props.email || 'default';
  const colors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-yellow-500 to-yellow-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
  ];

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % colors.length;
  return {
    background: colors[colorIndex].replace('bg-gradient-to-br', ''),
  };
});

const alt = computed(() => {
  return props.displayName || props.email || t('profile.userAvatar');
});
</script>

<style scoped>
/* Ensure gradient works */
div[style*='background'] {
  background: linear-gradient(to bottom right, var(--tw-gradient-stops));
}
</style>
