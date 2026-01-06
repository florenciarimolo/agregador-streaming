<template>
  <section v-if="showHero" id="como-funciona" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.howItWorksTitle') }}</SectionTitle>
          <div class="grid gap-4 md:grid-cols-3">
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
            >
              <div
                class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-primary to-accent"
              >
                <span class="text-2xl font-bold text-white">1</span>
              </div>
              <h3
                class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
              >
                {{ $t('home.step1Title') }}
              </h3>
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('home.step1Description') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
            >
              <div
                class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-accent to-secondary"
              >
                <span class="text-2xl font-bold text-white">2</span>
              </div>
              <h3
                class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
              >
                {{ $t('home.step2Title') }}
              </h3>
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('home.step2Description') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 md:p-8 relative overflow-hidden group hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors flex flex-col text-center"
            >
              <div
                class="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gradient-to-r rounded-full from-secondary to-pink"
              >
                <span class="text-2xl font-bold text-white">3</span>
              </div>
              <h3
                class="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-300 font-heading"
              >
                {{ $t('home.step3Title') }}
              </h3>
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('home.step3Description') }}
              </p>
            </Card>
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
import Card from '@/components/ui/Card.vue';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>

