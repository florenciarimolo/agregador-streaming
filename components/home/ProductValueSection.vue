<template>
  <section v-if="showHero" class="py-12 md:py-16">
    <AppShell>
      <PageContainer>
        <Section>
          <!-- Título centrado, grande -->
          <div class="text-center mb-4">
            <h2
              class="font-heading font-semibold text-gray-800 dark:text-gray-300 mb-4"
              style="font-size: clamp(2.5rem, 6vw, 4.5rem);"
            >
              {{ $t('home.value.title') }}
            </h2>
            <p class="text-subtitle font-body text-gray-600 dark:text-gray-400">
              {{ $t('home.value.subcopy') }}
            </p>
          </div>

          <!-- Grid de 3 bloques -->
          <div class="grid gap-8 md:gap-12 grid-cols-1 md:grid-cols-3 mt-12">
            <div class="flex flex-col items-center text-center">
              <div class="mb-6 relative">
                <IconBrain
                  :icon-class="'w-16 h-16 text-primary dark:text-primary-400'"
                  class="drop-shadow-lg"
                />
                <div
                  class="absolute inset-0 bg-primary/20 dark:bg-primary-400/20 blur-xl rounded-full -z-10"
                ></div>
              </div>
              <h3 class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 mb-3">
                {{ $t('home.value.block1Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400">
                {{ $t('home.value.block1') }}
              </p>
            </div>

            <div class="flex flex-col items-center text-center">
              <div class="mb-6 relative">
                <IconTarget
                  :icon-class="'w-16 h-16 text-primary dark:text-primary-400'"
                  class="drop-shadow-lg"
                />
                <div
                  class="absolute inset-0 bg-primary/20 dark:bg-primary-400/20 blur-xl rounded-full -z-10"
                ></div>
              </div>
              <h3 class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 mb-3">
                {{ $t('home.value.block2Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400">
                {{ $t('home.value.block2') }}
              </p>
            </div>

            <div class="flex flex-col items-center text-center">
              <div class="mb-6 relative">
                <IconTime
                  :icon-class="'w-16 h-16 text-primary dark:text-primary-400'"
                  class="drop-shadow-lg"
                />
                <div
                  class="absolute inset-0 bg-primary/20 dark:bg-primary-400/20 blur-xl rounded-full -z-10"
                ></div>
              </div>
              <h3 class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 mb-3">
                {{ $t('home.value.block3Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400">
                {{ $t('home.value.block3') }}
              </p>
            </div>
          </div>
        </Section>
      </PageContainer>
    </AppShell>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import IconBrain from '@/components/icons/IconBrain.vue';
import IconTarget from '@/components/icons/IconTarget.vue';
import IconTime from '@/components/icons/IconTime.vue';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>


