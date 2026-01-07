<template>
  <section v-if="showHero" id="como-funciona" class="py-12 md:py-16">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="home-section-title" data-aos="fade-up">
            <SectionTitle align="center">{{ $t('home.howItWorksTitle') }}</SectionTitle>
          </div>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden group hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors flex flex-col !col-span-1"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="100"
            >
              <div
                class="flex justify-center items-center mb-4 w-14 h-14 bg-gradient-to-r rounded-full from-primary to-accent mx-auto"
              >
                <span class="text-xl font-bold text-white">1</span>
              </div>
              <h3
                class="mb-3 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.step1Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400 text-center">
                {{ $t('home.step1Description') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden group hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors flex flex-col !col-span-1"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div
                class="flex justify-center items-center mb-4 w-14 h-14 bg-gradient-to-r rounded-full from-accent to-secondary mx-auto"
              >
                <span class="text-xl font-bold text-white">2</span>
              </div>
              <h3
                class="mb-3 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.step2Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400 text-center">
                {{ $t('home.step2Description') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden group hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors flex flex-col !col-span-1"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="300"
            >
              <div
                class="flex justify-center items-center mb-4 w-14 h-14 bg-gradient-to-r rounded-full from-secondary to-pink mx-auto"
              >
                <span class="text-xl font-bold text-white">3</span>
              </div>
              <h3
                class="mb-3 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.step3Title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400 text-center">
                {{ $t('home.step3Description') }}
              </p>
            </Card>
            <Card
              padding="lg"
              custom-class="md:p-6 relative overflow-hidden group hover:border-primary-800 dark:hover:border-primary-600/50 transition-colors flex flex-col !col-span-1"
              :enable-flashlight="true"
              data-aos="fade-up"
              data-aos-delay="400"
            >
              <div
                class="flex justify-center items-center mb-4 w-14 h-14 bg-gradient-to-r rounded-full from-pink to-primary mx-auto"
              >
                <span class="text-xl font-bold text-white">4</span>
              </div>
              <h3
                class="mb-3 text-h3 font-heading font-semibold text-gray-800 dark:text-gray-300 text-center"
              >
                {{ $t('home.step4.title') }}
              </h3>
              <p class="text-body font-body text-gray-600 dark:text-gray-400 text-center">
                {{ $t('home.step4.description') }}
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

/* Asegurar que el grid funcione correctamente */
.grid {
  display: grid;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

