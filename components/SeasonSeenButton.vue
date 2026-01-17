<template>
  <div>
    <Button
      :variant="isSeasonSeen ? 'default' : 'ghost'"
      :custom-class="
        isSeasonSeen
          ? 'bg-primary-600 text-white hover:bg-primary-700'
          : ''
      "
      @click="handleClick"
    >
      <template #icon>
        <IconEye :icon-class="'w-4 h-4'" />
      </template>
      {{
        isSeasonSeen
          ? $t('episodes.seasonUnmarkAsSeen', { season: seasonNumber })
          : $t('episodes.seasonMarkAsSeen', { season: seasonNumber })
      }}
    </Button>

    <!-- Confirmation Modal -->
    <Modal :is-open="showConfirmModal" @close="showConfirmModal = false">
      <div>
        <h3 class="text-lg font-semibold mb-2">
          {{ $t('episodes.confirmUnmarkSeason') }}
        </h3>
        <p class="mb-4">
          {{ $t('episodes.confirmUnmarkSeasonMessage', { season: seasonNumber }) }}
        </p>
        <div class="flex gap-2 justify-end">
          <Button variant="ghost" @click="showConfirmModal = false">
            {{ $t('common.cancel') }}
          </Button>
          <Button variant="default" @click="confirmUnmark">
            {{ $t('common.confirm') }}
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import IconEye from '@/components/icons/IconEye.vue';
import Modal from '@/components/ui/Modal.vue';

interface Props {
  isSeasonSeen: boolean;
  seasonNumber: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  mark: [];
  unmark: [];
}>();

const showConfirmModal = ref(false);

const handleClick = () => {
  if (props.isSeasonSeen) {
    // Show confirmation modal before unmarking
    showConfirmModal.value = true;
  } else {
    // Mark season as seen (no confirmation needed)
    emit('mark');
  }
};

const confirmUnmark = () => {
  showConfirmModal.value = false;
  emit('unmark');
};
</script>
