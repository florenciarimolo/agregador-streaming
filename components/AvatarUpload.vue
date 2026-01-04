<template>
  <div class="avatar-upload">
    <div
      class="relative inline-block rounded-full border border-primary"
      @click.stop="triggerFileInput"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <Avatar
        :avatar-url="previewUrl || avatarUrl"
        :display-name="displayName"
        :email="email"
        :user-id="userId"
        :size="size"
        :editable="true"
        @click.stop="triggerFileInput"
      />
      <div
        v-if="isDragging"
        class="absolute inset-0 bg-primary/20 rounded-full flex items-center justify-center border-2 border-dashed border-primary"
      >
        <span class="text-xs text-primary font-medium">{{
          $t('profile.dropImage')
        }}</span>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="handleFileSelect"
      />
    </div>

    <!-- Upload Progress -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isUploading"
        class="mt-2 text-sm text-gray-600 dark:text-gray-400"
      >
        <div class="flex items-center gap-2">
          <div
            class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"
          ></div>
          <span>{{ $t('profile.uploading') }}</span>
        </div>
      </div>
    </Transition>

    <!-- Error Message -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="errorMessage"
        class="mt-2 text-sm text-red-600 dark:text-red-400"
      >
        {{ errorMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Avatar from './Avatar.vue';

const { t } = useI18n();

interface Props {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

withDefaults(defineProps<Props>(), {
  avatarUrl: null,
  displayName: null,
  email: null,
  userId: undefined,
  size: 'lg',
});

const emit = defineEmits<{
  uploaded: [url: string];
  error: [message: string];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isUploading = ref(false);
const errorMessage = ref<string | null>(null);
const previewUrl = ref<string | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
  // Reset input value to allow selecting the same file again
  // But do it after a small delay to prevent immediate reopening
  setTimeout(() => {
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }, 100);
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
};

const processFile = async (file: File) => {
  errorMessage.value = null;

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    errorMessage.value = t('profile.invalidFileType');
    emit('error', errorMessage.value);
    return;
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errorMessage.value = t('profile.fileSizeExceeded');
    emit('error', errorMessage.value);
    return;
  }

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // Upload file
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { getSession } = await import('@/services/auth');
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw new Error(t('profile.notAuthenticated'));
    }

    const response = await $fetch<{
      success: boolean;
      avatar_url: string;
    }>('/api/users/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (response.success && response.avatar_url) {
      previewUrl.value = null; // Clear preview, use actual URL
      emit('uploaded', response.avatar_url);
    } else {
      throw new Error(t('profile.uploadFailed'));
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('profile.failedToUpload');
    errorMessage.value = message;
    previewUrl.value = null;
    emit('error', message);
  } finally {
    isUploading.value = false;
  }
};
</script>

<style scoped>
.avatar-upload {
  display: inline-block;
}
</style>
