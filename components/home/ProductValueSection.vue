<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.value.title') }}</SectionTitle>
          <div class="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('home.value.block1') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('home.value.block2') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="!bg-white/60 dark:!bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <p class="text-gray-800 dark:text-gray-300">
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

