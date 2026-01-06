<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.problem.title') }}</SectionTitle>
          <Card padding="lg" custom-class="!bg-white/60 dark:!bg-gray-900/40">
            <ul class="space-y-4 list-none">
              <li class="flex items-start gap-3">
                <span class="text-primary text-xl mt-0.5">•</span>
                <span class="text-gray-800 dark:text-gray-300">{{
                  $t('home.problem.bullet1')
                }}</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary text-xl mt-0.5">•</span>
                <span class="text-gray-800 dark:text-gray-300">{{
                  $t('home.problem.bullet2')
                }}</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-primary text-xl mt-0.5">•</span>
                <span class="text-gray-800 dark:text-gray-300">{{
                  $t('home.problem.bullet3')
                }}</span>
              </li>
            </ul>
            <p class="mt-6 text-gray-800 dark:text-gray-300">
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

