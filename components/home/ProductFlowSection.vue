<template>
  <section v-if="showHero" id="how-it-works" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="home-section-title">
            <SectionTitle>{{ $t('home.productFlow.title') }}</SectionTitle>
          </div>
          <p
            class="mx-auto mb-10 text-subtitle text-center font-body text-gray-600 dark:text-gray-400 max-w-3xl"
          >
            {{ $t('home.productFlow.description') }}
          </p>

          <!-- Bento Grid Narrativo -->
          <div class="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-6">
            <!-- Step 1: Selecciona tu momento (lg:col-span-4) - Card protagonista -->
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden flex flex-col lg:col-span-4 hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors"
            >
              <div class="flex flex-col gap-4 text-center">
                <div
                  class="flex justify-center items-center w-16 h-16 bg-gradient-to-r rounded-full from-primary to-accent mx-auto"
                >
                  <span class="text-xl font-bold text-white">1</span>
                </div>
                <h3
                  class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                >
                  {{ $t('home.productFlow.step1.title') }}
                </h3>
                <p class="text-body font-body text-gray-600 dark:text-gray-400">
                  {{ $t('home.productFlow.step1.description') }}
                </p>
                <div class="mt-4">
                  <MoodAttentionSelection />
                </div>
              </div>
            </Card>

            <!-- Step 2: Confirma tu momento (lg:col-span-2) - Card compacta -->
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden flex flex-col lg:col-span-2 hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors"
            >
              <div class="flex flex-col gap-4 text-center items-center">
                <div
                  class="flex justify-center items-center w-16 h-16 bg-gradient-to-r rounded-full from-accent to-secondary mx-auto"
                >
                  <span class="text-xl font-bold text-white">2</span>
                </div>
                <h3
                  class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                >
                  {{ $t('home.productFlow.step2.title') }}
                </h3>
                <p class="text-body font-body text-gray-600 dark:text-gray-400">
                  {{ $t('home.productFlow.step2.description') }}
                </p>
                <div class="mt-4 w-full flex justify-center">
                  <MomentConfirmation />
                </div>
              </div>
            </Card>

            <!-- Step 3: Recibe recomendación (lg:col-span-3) - Contenido más pequeño -->
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden flex flex-col lg:col-span-3 hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors"
            >
              <div class="flex flex-col gap-4 text-center">
                <div
                  class="flex justify-center items-center w-16 h-16 bg-gradient-to-r rounded-full from-secondary to-pink mx-auto"
                >
                  <span class="text-xl font-bold text-white">3</span>
                </div>
                <h3
                  class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                >
                  {{ $t('home.productFlow.step3.title') }}
                </h3>
                <p class="text-body font-body text-gray-600 dark:text-gray-400">
                  {{ $t('home.productFlow.step3.description') }}
                </p>
                <div
                  class="mt-4 max-h-[400px] overflow-hidden flex justify-center"
                >
                  <img
                    src="/mockups/step3-result-mockup.webp"
                    alt="Mockup de recomendaciones"
                    class="max-h-[400px] w-auto object-contain rounded-lg"
                  />
                </div>
              </div>
            </Card>

            <!-- Step 4: Gestiona tus recomendaciones (lg:col-span-3) - Contenido más pequeño -->
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden flex flex-col lg:col-span-3 hover:border-primary/50 dark:hover:border-purple-500/30 transition-colors"
            >
              <div class="flex flex-col gap-4 text-center">
                <div
                  class="flex justify-center items-center w-16 h-16 bg-gradient-to-r rounded-full from-pink to-primary mx-auto"
                >
                  <span class="text-xl font-bold text-white">4</span>
                </div>
                <h3
                  class="text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300"
                >
                  {{ $t('home.productFlow.step4.title') }}
                </h3>
                <p class="text-body font-body text-gray-600 dark:text-gray-400">
                  {{ $t('home.productFlow.step4.description') }}
                </p>
                <div
                  class="mt-4 max-h-[400px] overflow-hidden flex justify-center"
                >
                  <img
                    src="/mockups/step4-actions-mockup.webp"
                    alt="Mockup de acciones de recomendaciones"
                    class="max-h-[400px] w-auto object-contain rounded-lg"
                  />
                </div>
              </div>
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
import MoodAttentionSelection from './mockups/MoodAttentionSelection.vue';
import MomentConfirmation from './mockups/MomentConfirmation.vue';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>

<style scoped>
.home-section-title :deep(h2) {
  font-size: clamp(2rem, 4vw, 3rem) !important;
}
</style>
