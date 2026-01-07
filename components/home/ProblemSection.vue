<template>
  <section v-if="showHero" class="py-12 md:py-16">
    <AppShell>
      <PageContainer>
        <Section>
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
          >
            <!-- Columna izquierda: texto alineado a la izquierda -->
            <div class="flex flex-col gap-6 home-animate">
              <div class="text-left">
                <p
                  class="text-label uppercase tracking-overline font-label text-primary dark:text-primary-400 mb-4"
                >
                  {{ $t('home.problem.overline') }}
                </p>
                <h2
                  class="text-h2 font-heading font-semibold text-gray-800 dark:text-gray-300 text-left mb-6"
                >
                  {{ $t('home.problem.title') }}
                </h2>
                <ul class="space-y-6 list-none text-left">
                  <li class="flex items-start gap-4">
                    <IconStack
                      :icon-class="'w-6 h-6 text-primary dark:text-primary-400 mt-0.5 flex-shrink-0'"
                    />
                    <span
                      class="text-body font-body text-gray-600 dark:text-gray-400"
                      >{{ $t('home.problem.bullet1') }}</span
                    >
                  </li>
                  <li class="flex items-start gap-4">
                    <IconBookmark
                      :icon-class="'w-6 h-6 text-primary dark:text-primary-400 mt-0.5 flex-shrink-0'"
                    />
                    <span
                      class="text-body font-body text-gray-600 dark:text-gray-400"
                      >{{ $t('home.problem.bullet2') }}</span
                    >
                  </li>
                  <li class="flex items-start gap-4">
                    <IconSliders
                      :icon-class="'w-6 h-6 text-primary dark:text-primary-400 mt-0.5 flex-shrink-0'"
                    />
                    <span
                      class="text-body font-body text-gray-600 dark:text-gray-400"
                      >{{ $t('home.problem.bullet3') }}</span
                    >
                  </li>
                </ul>
              </div>
            </div>

            <!-- Columna derecha: cards visuales tipo glass -->
            <div class="flex flex-col gap-4">
              <Card
                padding="lg"
                custom-class="p-6 backdrop-blur-xl bg-gray-100/90 dark:bg-gray-900/60 border border-gray-300/60 dark:border-white/15 shadow-lg shadow-black/10 dark:shadow-black/20 hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors animated-border-card home-animate home-animate-delay-1"
                :enable-flashlight="true"
              >
                <div class="space-y-2">
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"
                  ></div>
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"
                  ></div>
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6"
                  ></div>
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-4/5 mt-4"
                  ></div>
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"
                  ></div>
                  <div
                    class="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"
                  ></div>
                </div>
              </Card>
              <Card
                padding="lg"
                custom-class="p-6 backdrop-blur-xl bg-gray-100/90 dark:bg-gray-900/60 border border-gray-300/60 dark:border-white/15 shadow-lg shadow-black/10 dark:shadow-black/20 hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors animated-border-card home-animate home-animate-delay-2"
                :enable-flashlight="true"
              >
                <div class="grid grid-cols-4 gap-2">
                  <div
                    v-for="i in 4"
                    :key="i"
                    class="aspect-[2/3] bg-gray-300 dark:bg-gray-700 rounded"
                  ></div>
                </div>
              </Card>
              <Card
                padding="lg"
                custom-class="p-6 backdrop-blur-xl bg-gray-100/90 dark:bg-gray-900/60 border border-gray-300/60 dark:border-white/15 shadow-lg shadow-black/10 dark:shadow-black/20 hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors animated-border-card home-animate home-animate-delay-3"
                :enable-flashlight="true"
              >
                <div class="space-y-3">
                  <div class="flex gap-2">
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded flex-1"
                    ></div>
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"
                    ></div>
                  </div>
                  <div class="flex gap-2">
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded flex-1"
                    ></div>
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"
                    ></div>
                  </div>
                  <div class="flex gap-2">
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded flex-1"
                    ></div>
                    <div
                      class="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"
                    ></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Section>
      </PageContainer>
    </AppShell>
  </section>
</template>

<script setup lang="ts">
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import Card from '@/components/ui/Card.vue';
import IconStack from '@/components/icons/IconStack.vue';
import IconBookmark from '@/components/icons/IconBookmark.vue';
import IconSliders from '@/components/icons/IconSliders.vue';
import { computed } from 'vue';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>
