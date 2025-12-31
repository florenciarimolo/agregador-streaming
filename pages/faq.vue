<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('faq.title') }}
      </h1>
      <p class="text-lg dark:text-gray-300 text-gray-800">
        {{ $t('faq.description') }}
      </p>
    </div>

    <div class="space-y-4">
      <!-- FAQ Item 1 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q1') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a1') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 2 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q2') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a2') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 3 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q3') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a3') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 4 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q4') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a4') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 5 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q5') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a5') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 6 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q6') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a6') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 7 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q7') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a7') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 8 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q8') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a8') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 9 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q9') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a9') }}
          </p>
        </div>
      </details>

      <!-- FAQ Item 10 -->
      <details
        class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
      >
        <summary
          class="p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors list-none"
        >
          <div class="flex items-center justify-between">
            <span>{{ $t('faq.q10') }}</span>
            <span class="text-primary text-xl">+</span>
          </div>
        </summary>
        <div class="px-6 pb-6 dark:text-gray-300 text-gray-800">
          <p>
            {{ $t('faq.a10') }}
          </p>
        </div>
      </details>
    </div>

    <!-- CTA -->
    <div class="mt-8 text-center">
      <p class="dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('faq.moreQuestions') }}
      </p>
      <a
        href="mailto:hello@getupnext.io"
        class="inline-block px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium transition-all duration-300"
      >
        {{ $t('faq.contactUs') }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';

const { t } = useI18n();

// Use watchEffect to ensure i18n messages are loaded before setting SEO meta
watchEffect(() => {
  useHead({
    title: t('seo.faqTitle'),
  });

  useSeoMeta({
    title: t('seo.faqTitle'),
    description: t('seo.faqDescription'),
  });
});
</script>

<style scoped>
details[open] summary span:last-child {
  transform: rotate(45deg);
}

details summary {
  list-style: none;
}

details summary::-webkit-details-marker {
  display: none;
}
</style>
