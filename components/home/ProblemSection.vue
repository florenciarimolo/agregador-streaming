<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="home-section-title">
            <SectionTitle>{{ $t('home.problem.title') }}</SectionTitle>
          </div>
          <Card padding="lg" custom-class="!p-8 md:!p-12 hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors">
            <ul class="space-y-6 list-none text-left">
              <li class="flex items-start gap-4">
                <span class="text-primary text-xl mt-0.5 flex-shrink-0">•</span>
                <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                  $t('home.problem.bullet1')
                }}</span>
              </li>
              <li class="flex items-start gap-4">
                <span class="text-primary text-xl mt-0.5 flex-shrink-0">•</span>
                <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                  $t('home.problem.bullet2')
                }}</span>
              </li>
              <li class="flex items-start gap-4">
                <span class="text-primary text-xl mt-0.5 flex-shrink-0">•</span>
                <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                  $t('home.problem.bullet3')
                }}</span>
              </li>
            </ul>
            <p class="mt-8 text-body font-body text-gray-600 dark:text-gray-400 text-center">
              {{ $t('home.problem.closure') }}
            </p>
          </Card>
        </Section>
      </PageContainer>
    </AppShell>
  </section>
</template>

<script setup lang="ts">
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import Card from '@/components/ui/Card.vue';
import { computed } from 'vue';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>

<style scoped>
.home-section-title :deep(h2) {
  font-size: clamp(2rem, 4vw, 3rem) !important;
}
</style>

