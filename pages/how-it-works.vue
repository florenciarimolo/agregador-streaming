<template>
  <AppShell>
    <PageContainer>
      <div class="pt-6 pb-6 w-full">
        <div class="mx-auto max-w-3xl">
          <div class="mb-6">
            <h1
              class="mb-4 text-4xl font-bold text-gray-800 dark:text-gray-300"
            >
              {{ $t('howItWorks.title') }}
            </h1>
            <p class="text-lg text-gray-800 dark:text-gray-300">
              {{ $t('howItWorks.description') }}
            </p>
          </div>

          <div class="space-y-6">
            <!-- Sección 1: Introducción -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.whatIsTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.whatIsDescription1') }}
              </p>
              <p class="text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.whatIsDescription2') }}
              </p>
            </section>

            <!-- Sección 2: Onboarding -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.setupTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.setupDescription') }}
              </p>
              <div class="p-4 rounded-lg bg-primary/10 dark:bg-primary-500/20">
                <p class="text-sm text-gray-800 dark:text-gray-300">
                  {{ $t('howItWorks.setupTip') }}
                </p>
              </div>
            </section>

            <!-- Sección 3: Recomendaciones -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.recommendationsTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.recommendationsDescription1') }}
              </p>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.recommendationsDescription2') }}
              </p>
              <ul
                class="ml-4 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-300"
              >
                <li>{{ $t('howItWorks.recommendationItem1') }}</li>
                <li>{{ $t('howItWorks.recommendationItem2') }}</li>
                <li>{{ $t('howItWorks.recommendationItem3') }}</li>
                <li>{{ $t('howItWorks.recommendationItem4') }}</li>
              </ul>
            </section>

            <!-- Sección 4: Filtros -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.filtersTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.filtersDescription') }}
              </p>
              <div class="grid gap-4 mb-4 md:grid-cols-2">
                <div>
                  <h3
                    class="mb-2 font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('howItWorks.moodTitle') }}
                  </h3>
                  <ul
                    class="ml-4 space-y-1 text-sm list-disc list-inside text-gray-800 dark:text-gray-300"
                  >
                    <li>{{ $t('mood.relaxed') }}</li>
                    <li>{{ $t('mood.light') }}</li>
                    <li>{{ $t('mood.intense') }}</li>
                    <li>{{ $t('mood.emotional') }}</li>
                    <li>{{ $t('mood.reflective') }}</li>
                  </ul>
                </div>
                <div>
                  <h3
                    class="mb-2 font-semibold text-gray-800 dark:text-gray-300"
                  >
                    {{ $t('howItWorks.attentionTitle') }}
                  </h3>
                  <ul
                    class="ml-4 space-y-1 text-sm list-disc list-inside text-gray-800 dark:text-gray-300"
                  >
                    <li>{{ $t('howItWorks.attentionLow') }}</li>
                    <li>{{ $t('howItWorks.attentionMedium') }}</li>
                    <li>{{ $t('howItWorks.attentionHigh') }}</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Sección 5: Gestión de contenido -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.organizeTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.organizeDescription') }}
              </p>
              <div class="space-y-3">
                <div class="flex gap-3 items-start">
                  <span class="text-xl text-primary">✓</span>
                  <div>
                    <strong class="text-gray-800 dark:text-gray-300">{{
                      $t('howItWorks.seenLabel')
                    }}</strong>
                    <span class="text-gray-800 dark:text-gray-300">
                      {{ $t('howItWorks.seenDescription') }}
                    </span>
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <span class="text-xl text-primary">❤️</span>
                  <div>
                    <strong class="text-gray-800 dark:text-gray-300">{{
                      $t('howItWorks.likedLabel')
                    }}</strong>
                    <span class="text-gray-800 dark:text-gray-300">
                      {{ $t('howItWorks.likedDescription') }}
                    </span>
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <span class="text-xl text-primary">⏰</span>
                  <div>
                    <strong class="text-gray-800 dark:text-gray-300">{{
                      $t('howItWorks.watchLaterLabel')
                    }}</strong>
                    <span class="text-gray-800 dark:text-gray-300">
                      {{ $t('howItWorks.watchLaterDescription') }}
                    </span>
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <span class="text-xl text-primary">✗</span>
                  <div>
                    <strong class="text-gray-800 dark:text-gray-300">{{
                      $t('howItWorks.notInterestedLabel')
                    }}</strong>
                    <span class="text-gray-800 dark:text-gray-300">
                      {{ $t('howItWorks.notInterestedDescription') }}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Sección 6: Plataformas -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.platformsTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.platformsDescription') }}
              </p>
              <ul
                class="ml-4 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-300"
              >
                <li>{{ $t('howItWorks.platformsStreaming') }}</li>
                <li>{{ $t('howItWorks.platformsRent') }}</li>
                <li>{{ $t('howItWorks.platformsBuy') }}</li>
              </ul>
              <div
                class="p-4 mt-4 rounded-lg bg-primary/10 dark:bg-primary-500/20"
              >
                <p class="text-sm text-gray-800 dark:text-gray-300">
                  {{ $t('languageAccuracy.alert.message') }}
                </p>
              </div>
            </section>

            <!-- Sección 7: Búsqueda -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.searchTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.searchDescription') }}
              </p>
            </section>

            <!-- Sección 8: Mejora continua -->
            <section
              class="p-6 rounded-2xl border backdrop-blur-xl bg-white/60 dark:bg-gray-900/40 border-gray-300/50 dark:border-white/10"
            >
              <h2
                class="mb-4 text-2xl font-semibold text-gray-800 dark:text-gray-300"
              >
                {{ $t('howItWorks.improveTitle') }}
              </h2>
              <p class="mb-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.improveDescription1') }}
              </p>
              <ul
                class="ml-4 space-y-2 list-disc list-inside text-gray-800 dark:text-gray-300"
              >
                <li>{{ $t('howItWorks.improveItem1') }}</li>
                <li>{{ $t('howItWorks.improveItem2') }}</li>
                <li>{{ $t('howItWorks.improveItem3') }}</li>
                <li>{{ $t('howItWorks.improveItem4') }}</li>
              </ul>
              <p class="mt-4 text-gray-800 dark:text-gray-300">
                {{ $t('howItWorks.improveDescription2') }}
              </p>
            </section>
          </div>

          <!-- CTA -->
          <div class="mt-6 text-center">
            <button
              type="button"
              class="inline-block px-6 py-3 font-medium text-white rounded-lg transition-all duration-300 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600"
              @click="showAuthForm = true"
            >
              {{ $t('howItWorks.ctaButton') }}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>

  <!-- Auth Form Modal -->
  <Modal :is-open="showAuthForm" @close="showAuthForm = false" custom-class="max-w-md p-0">
    <AuthForm
      in-modal
      @success="handleAuthSuccess"
      @signup="handleSignupSuccess"
    />
  </Modal>
</template>

<script setup lang="ts">
import { watchEffect, ref } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Modal from '@/components/ui/Modal.vue';
import AuthForm from '@/components/AuthForm.vue';

const { t } = useI18n();
const router = useRouter();

// Auth form modal state
const showAuthForm = ref(false);

// Handle auth success
const handleAuthSuccess = () => {
  showAuthForm.value = false;
  router.push('/');
};

// Handle signup success
const handleSignupSuccess = () => {
  showAuthForm.value = false;
};

// Use watchEffect to ensure i18n messages are loaded before setting SEO meta
watchEffect(() => {
  useHead({
    title: t('seo.howItWorksTitle'),
  });

  useSeoMeta({
    title: t('seo.howItWorksTitle'),
    description: t('seo.howItWorksDescription'),
  });
});
</script>
