<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('howItWorks.title') }}
      </h1>
      <p class="text-lg dark:text-gray-300 text-gray-800">
        {{ $t('howItWorks.description') }}
      </p>
    </div>

    <div class="space-y-8">
      <!-- Sección 1: Introducción -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.whatIsTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.whatIsDescription1') }}
        </p>
        <p class="dark:text-gray-300 text-gray-800">
          {{ $t('howItWorks.whatIsDescription2') }}
        </p>
      </section>

      <!-- Sección 2: Onboarding -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.setupTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.setupDescription') }}
        </p>
        <div class="bg-primary/10 dark:bg-primary-500/20 rounded-lg p-4">
          <p class="text-sm dark:text-gray-300 text-gray-800">
            {{ $t('howItWorks.setupTip') }}
          </p>
        </div>
      </section>

      <!-- Sección 3: Recomendaciones -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.recommendationsTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.recommendationsDescription1') }}
        </p>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.recommendationsDescription2') }}
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>{{ $t('howItWorks.recommendationItem1') }}</li>
          <li>{{ $t('howItWorks.recommendationItem2') }}</li>
          <li>{{ $t('howItWorks.recommendationItem3') }}</li>
          <li>{{ $t('howItWorks.recommendationItem4') }}</li>
        </ul>
      </section>

      <!-- Sección 4: Filtros -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.filtersTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.filtersDescription') }}
        </p>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 class="font-semibold dark:text-gray-300 text-gray-800 mb-2">
              {{ $t('howItWorks.moodTitle') }}
            </h3>
            <ul
              class="list-disc list-inside space-y-1 text-sm dark:text-gray-300 text-gray-800 ml-4"
            >
              <li>{{ $t('mood.relaxed') }}</li>
              <li>{{ $t('mood.light') }}</li>
              <li>{{ $t('mood.intense') }}</li>
              <li>{{ $t('mood.emotional') }}</li>
              <li>{{ $t('mood.reflective') }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold dark:text-gray-300 text-gray-800 mb-2">
              {{ $t('howItWorks.attentionTitle') }}
            </h3>
            <ul
              class="list-disc list-inside space-y-1 text-sm dark:text-gray-300 text-gray-800 ml-4"
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
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.organizeTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.organizeDescription') }}
        </p>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">✓</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800">{{
                $t('howItWorks.seenLabel')
              }}</strong>
              <span class="dark:text-gray-300 text-gray-800">
                {{ $t('howItWorks.seenDescription') }}
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">❤️</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800">{{
                $t('howItWorks.likedLabel')
              }}</strong>
              <span class="dark:text-gray-300 text-gray-800">
                {{ $t('howItWorks.likedDescription') }}
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">⏰</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800">{{
                $t('howItWorks.watchLaterLabel')
              }}</strong>
              <span class="dark:text-gray-300 text-gray-800">
                {{ $t('howItWorks.watchLaterDescription') }}
              </span>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-primary text-xl">✗</span>
            <div>
              <strong class="dark:text-gray-300 text-gray-800">{{
                $t('howItWorks.notInterestedLabel')
              }}</strong>
              <span class="dark:text-gray-300 text-gray-800">
                {{ $t('howItWorks.notInterestedDescription') }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Sección 6: Plataformas -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.platformsTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.platformsDescription') }}
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>{{ $t('howItWorks.platformsStreaming') }}</li>
          <li>{{ $t('howItWorks.platformsRent') }}</li>
          <li>{{ $t('howItWorks.platformsBuy') }}</li>
        </ul>
      </section>

      <!-- Sección 7: Búsqueda -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.searchTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.searchDescription') }}
        </p>
      </section>

      <!-- Sección 8: Mejora continua -->
      <section
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
      >
        <h2
          class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
        >
          {{ $t('howItWorks.improveTitle') }}
        </h2>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('howItWorks.improveDescription1') }}
        </p>
        <ul
          class="list-disc list-inside space-y-2 dark:text-gray-300 text-gray-800 ml-4"
        >
          <li>{{ $t('howItWorks.improveItem1') }}</li>
          <li>{{ $t('howItWorks.improveItem2') }}</li>
          <li>{{ $t('howItWorks.improveItem3') }}</li>
          <li>{{ $t('howItWorks.improveItem4') }}</li>
        </ul>
        <p class="dark:text-gray-300 text-gray-800 mt-4">
          {{ $t('howItWorks.improveDescription2') }}
        </p>
      </section>
    </div>

    <!-- CTA -->
    <div class="mt-8 text-center">
      <nuxt-link
        to="/"
        class="inline-block px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-300"
      >
        {{ $t('howItWorks.ctaButton') }}
      </nuxt-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';

const { t } = useI18n();

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
