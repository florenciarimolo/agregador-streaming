<template>
  <section v-if="showHero" class="py-12 md:py-16">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="home-section-title" data-aos="fade-up">
            <SectionTitle align="center">{{ $t('home.differentiation.title') }}</SectionTitle>
          </div>
          <div class="grid gap-8 md:gap-12 md:grid-cols-2">
            <!-- Other Platforms -->
            <Card
              padding="lg"
              custom-class="hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <h3
                class="mb-4 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.differentiation.others.title') }}
              </h3>
              <ul class="space-y-4 list-none text-center">
                <li class="flex items-center justify-center gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl flex-shrink-0"
                    >×</span
                  >
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                    $t('home.differentiation.others.item1')
                  }}</span>
                </li>
                <li class="flex items-center justify-center gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl flex-shrink-0"
                    >×</span
                  >
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                    $t('home.differentiation.others.item2')
                  }}</span>
                </li>
                <li class="flex items-center justify-center gap-3">
                  <span class="text-gray-400 dark:text-gray-600 text-xl flex-shrink-0"
                    >×</span
                  >
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                    $t('home.differentiation.others.item3')
                  }}</span>
                </li>
              </ul>
            </Card>

            <!-- UpNext -->
            <Card
              padding="lg"
              custom-class="border-primary/30 dark:border-primary/20 hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <h3
                class="mb-4 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.differentiation.upnext.title') }}
              </h3>
              <ul class="space-y-4 list-none text-center">
                <li class="flex items-center justify-center gap-3">
                  <span class="text-primary text-xl flex-shrink-0">✓</span>
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                    $t('home.differentiation.upnext.item1')
                  }}</span>
                </li>
                <li class="flex items-center justify-center gap-3">
                  <span class="text-primary text-xl flex-shrink-0">✓</span>
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
                    $t('home.differentiation.upnext.item2')
                  }}</span>
                </li>
                <li class="flex items-center justify-center gap-3">
                  <span class="text-primary text-xl flex-shrink-0">✓</span>
                  <span class="text-body font-body text-gray-600 dark:text-gray-400">{{
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

<style scoped>
.home-section-title :deep(h2) {
  font-size: clamp(2rem, 4vw, 3rem) !important;
}
</style>

