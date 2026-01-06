<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="home-section-title">
            <SectionTitle>{{ $t('home.value.title') }}</SectionTitle>
          </div>
          <div class="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-3">
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10 !p-6 md:!p-8"
            >
              <p class="text-body font-body text-gray-800 dark:text-gray-300 text-center">
                {{ $t('home.value.block1') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10 !p-6 md:!p-8"
            >
              <p class="text-body font-body text-gray-800 dark:text-gray-300 text-center">
                {{ $t('home.value.block2') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10 !p-6 md:!p-8"
            >
              <p class="text-body font-body text-gray-800 dark:text-gray-300 text-center">
                {{ $t('home.value.block3') }}
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

<style scoped>
.home-section-title :deep(h2) {
  font-size: clamp(2rem, 4vw, 3rem) !important;
}
</style>

