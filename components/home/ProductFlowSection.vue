<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.productFlow.title') }}</SectionTitle>
          <p class="mb-6 text-gray-800 dark:text-gray-300">
            {{ $t('home.productFlow.description') }}
          </p>

          <div class="grid gap-6 md:grid-cols-3">
            <!-- Step 1: Selection -->
            <div class="flex flex-col gap-3">
              <div
                class="flex justify-center items-center mx-auto w-12 h-12 bg-gradient-to-r rounded-full from-primary to-accent"
              >
                <span class="text-xl font-bold text-white">1</span>
              </div>
              <h3
                class="text-lg font-semibold text-center text-gray-800 dark:text-gray-300"
              >
                {{ $t('home.productFlow.step1.title') }}
              </h3>
              <p
                class="text-sm text-center text-gray-600 dark:text-gray-400"
              >
                {{ $t('home.productFlow.step1.description') }}
              </p>
              <MoodAttentionSelection />
            </div>

            <!-- Step 2: Confirmation -->
            <div class="flex flex-col gap-3">
              <div
                class="flex justify-center items-center mx-auto w-12 h-12 bg-gradient-to-r rounded-full from-accent to-secondary"
              >
                <span class="text-xl font-bold text-white">2</span>
              </div>
              <h3
                class="text-lg font-semibold text-center text-gray-800 dark:text-gray-300"
              >
                {{ $t('home.productFlow.step2.title') }}
              </h3>
              <p
                class="text-sm text-center text-gray-600 dark:text-gray-400"
              >
                {{ $t('home.productFlow.step2.description') }}
              </p>
              <MomentConfirmation />
            </div>

            <!-- Step 3: Result -->
            <div class="flex flex-col gap-3">
              <div
                class="flex justify-center items-center mx-auto w-12 h-12 bg-gradient-to-r rounded-full from-secondary to-pink"
              >
                <span class="text-xl font-bold text-white">3</span>
              </div>
              <h3
                class="text-lg font-semibold text-center text-gray-800 dark:text-gray-300"
              >
                {{ $t('home.productFlow.step3.title') }}
              </h3>
              <p
                class="text-sm text-center text-gray-600 dark:text-gray-400"
              >
                {{ $t('home.productFlow.step3.description') }}
              </p>
              <RecommendationResult />
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
import SectionTitle from '@/components/layout/SectionTitle.vue';
import MoodAttentionSelection from './mockups/MoodAttentionSelection.vue';
import MomentConfirmation from './mockups/MomentConfirmation.vue';
import RecommendationResult from './mockups/RecommendationResult.vue';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>

