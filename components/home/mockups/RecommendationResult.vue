<template>
  <div class="flex flex-col gap-4">
    <!-- Main Recommendation -->
    <Card
      padding="lg"
      custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
    >
      <div class="flex flex-col gap-4 md:flex-row">
        <div class="flex-shrink-0 w-full md:w-32">
          <div
            class="relative overflow-hidden bg-gray-800 rounded-lg aspect-[2/3]"
          >
            <div
              class="flex justify-center items-center w-full h-full text-gray-600 dark:text-gray-500"
            >
              <IconTv icon-class="w-12 h-12" />
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-300">
                {{ $t('home.productFlow.mockup.mainTitle') }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('home.productFlow.mockup.mainType') }}
              </p>
            </div>
            <div
              class="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold"
            >
              <IconStar icon-class="w-3 h-3" />
              <span>8.2</span>
            </div>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300">
            {{ $t('home.productFlow.mockup.mainDescription') }}
          </p>
        </div>
      </div>
    </Card>

    <!-- Alternatives -->
    <div>
      <h4 class="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-300">
        {{ $t('home.productFlow.mockup.alternatives') }}
      </h4>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div
          v-for="i in 3"
          :key="i"
          class="flex flex-col gap-2"
        >
          <div
            class="relative overflow-hidden bg-gray-800 rounded-lg aspect-[2/3]"
          >
            <div
              class="flex justify-center items-center w-full h-full text-gray-600 dark:text-gray-500"
            >
              <IconTv icon-class="w-8 h-8" />
            </div>
          </div>
          <p class="text-xs font-medium text-gray-800 dark:text-gray-300">
            {{ $t('home.productFlow.mockup.alternativeTitle', { number: i }) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from '@/components/ui/Card.vue';
import IconTv from '@/components/icons/IconTv.vue';
import IconStar from '@/components/icons/IconStar.vue';
</script>

