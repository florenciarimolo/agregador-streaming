<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.differentiation.title') }}</SectionTitle>
          <div class="grid gap-6 md:grid-cols-2">
            <!-- Other Platforms -->
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h3
                class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('home.differentiation.others.title') }}
              </h3>
              <ul class="space-y-3 list-none">
                <li class="flex items-start gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl mt-0.5"
                    >×</span
                  >
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.others.item1')
                  }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl mt-0.5"
                    >×</span
                  >
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.others.item2')
                  }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl mt-0.5"
                    >×</span
                  >
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.others.item3')
                  }}</span>
                </li>
              </ul>
            </Card>

            <!-- UpNext -->
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-primary/30 dark:border-primary/20"
            >
              <h3
                class="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('home.differentiation.upnext.title') }}
              </h3>
              <ul class="space-y-3 list-none">
                <li class="flex items-start gap-3">
                  <span class="text-primary text-xl mt-0.5">✓</span>
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.upnext.item1')
                  }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-primary text-xl mt-0.5">✓</span>
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.upnext.item2')
                  }}</span>
                </li>
                <li class="flex items-start gap-3">
                  <span class="text-primary text-xl mt-0.5">✓</span>
                  <span class="text-gray-800 dark:text-gray-300">{{
                    $t('home.differentiation.upnext.item3')
                  }}</span>
                </li>
              </ul>
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

