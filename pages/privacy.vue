<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pb-6 pt-6">
        <div class="mx-auto max-w-3xl">
          <div class="mb-8">
      <h1 class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('privacy.title') }}
      </h1>
      <p class="text-lg dark:text-gray-300 text-gray-800">
        {{ $t('privacy.description') }}
      </p>
    </div>

    <div class="space-y-6">
      <!-- Sección 1: Información que recopilamos -->
    <section
      class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
    >
      <h2
        class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
      >
        {{ $t('privacy.dataCollectionTitle') }}
      </h2>
      <p class="dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('privacy.dataCollectionDescription') }}
      </p>
    </section>

    <!-- Sección 2: Uso de la información -->
    <section
      class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
    >
      <h2
        class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
      >
        {{ $t('privacy.dataUsageTitle') }}
      </h2>
      <p class="dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('privacy.dataUsageDescription') }}
      </p>
    </section>

    <!-- Sección 3: Cookies -->
    <section
      class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
    >
      <h2
        class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
      >
        {{ $t('privacy.cookiesTitle') }}
      </h2>
      
      <!-- Qué son las cookies -->
      <div class="mb-6">
        <h3
          class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-3"
        >
          {{ $t('privacy.cookiesWhatAreTitle') }}
        </h3>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('privacy.cookiesWhatAreDescription') }}
        </p>
      </div>

      <!-- Tipos de cookies -->
      <div class="mb-6">
        <h3
          class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-3"
        >
          {{ $t('privacy.cookiesTypesTitle') }}
        </h3>
        
        <!-- Cookies técnicas -->
        <div class="mb-4 p-4 bg-gray-100/50 dark:bg-gray-800/30 rounded-lg">
          <h4
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2"
          >
            {{ $t('privacy.cookiesTechnicalTitle') }}
          </h4>
          <p class="dark:text-gray-300 text-gray-800 mb-2">
            {{ $t('privacy.cookiesTechnicalDescription') }}
          </p>
          <p class="text-sm italic dark:text-gray-400 text-gray-600">
            {{ $t('privacy.cookiesTechnicalNote') }}
          </p>
          <ul class="mt-2 ml-4 list-disc space-y-1 dark:text-gray-300 text-gray-800">
            <li>{{ $t('privacy.cookiesTechnicalItem1') }}</li>
            <li>{{ $t('privacy.cookiesTechnicalItem2') }}</li>
          </ul>
        </div>

        <!-- Cookies de preferencias -->
        <div class="mb-4 p-4 bg-gray-100/50 dark:bg-gray-800/30 rounded-lg">
          <h4
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-2"
          >
            {{ $t('privacy.cookiesPreferencesTitle') }}
          </h4>
          <p class="dark:text-gray-300 text-gray-800 mb-2">
            {{ $t('privacy.cookiesPreferencesDescription') }}
          </p>
          <ul class="mt-2 ml-4 list-disc space-y-1 dark:text-gray-300 text-gray-800">
            <li>{{ $t('privacy.cookiesPreferencesItem1') }}</li>
            <li>{{ $t('privacy.cookiesPreferencesItem2') }}</li>
          </ul>
        </div>
      </div>

      <!-- Lista detallada de cookies -->
      <div class="mb-6">
        <h3
          class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-3"
        >
          {{ $t('privacy.cookiesListTitle') }}
        </h3>
        <p class="dark:text-gray-300 text-gray-800 mb-4">
          {{ $t('privacy.cookiesListDescription') }}
        </p>
        
        <!-- Cookies HTTP -->
        <div class="mb-4">
          <h4
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-3"
          >
            {{ $t('privacy.cookiesHttpTitle') }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableName') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTablePurpose') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableDuration') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableType') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    sb-*-auth-token
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieSupabasePurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieSupabaseDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypeTechnical') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- localStorage -->
        <div class="mb-4">
          <h4
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-3"
          >
            {{ $t('privacy.cookiesLocalStorageTitle') }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableName') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTablePurpose') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableDuration') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableType') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    cookie_consent
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieConsentPurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieConsentDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypeTechnical') }}
                  </td>
                </tr>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    theme
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieThemePurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieThemeDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypePreference') }}
                  </td>
                </tr>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    theme-manual
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieThemeManualPurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieThemeManualDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypePreference') }}
                  </td>
                </tr>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    auth:recovery
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieAuthRecoveryPurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieAuthRecoveryDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypeTechnical') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- sessionStorage -->
        <div class="mb-4">
          <h4
            class="text-lg font-semibold dark:text-gray-300 text-gray-800 mb-3"
          >
            {{ $t('privacy.cookiesSessionStorageTitle') }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableName') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTablePurpose') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableDuration') }}
                  </th>
                  <th class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left text-sm font-semibold dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiesTableType') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    previousRoute
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiePreviousRoutePurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookiePreviousRouteDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypeTechnical') }}
                  </td>
                </tr>
                <tr>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800 font-mono">
                    generatingRecommendations
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieGeneratingRecommendationsPurpose') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieGeneratingRecommendationsDuration') }}
                  </td>
                  <td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm dark:text-gray-300 text-gray-800">
                    {{ $t('privacy.cookieTypeTechnical') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Gestión de cookies -->
      <div>
        <h3
          class="text-xl font-semibold dark:text-gray-300 text-gray-800 mb-3"
        >
          {{ $t('privacy.cookiesManagementTitle') }}
        </h3>
        <p class="dark:text-gray-300 text-gray-800 mb-2">
          {{ $t('privacy.cookiesManagementDescription') }}
        </p>
        <p class="text-sm italic dark:text-gray-400 text-gray-600">
          {{ $t('privacy.cookiesManagementNote') }}
        </p>
      </div>
    </section>

    <!-- Sección 4: Contacto -->
    <section
      class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-300/50 dark:border-white/10"
    >
      <h2
        class="text-2xl font-semibold dark:text-gray-300 text-gray-800 mb-4"
      >
        {{ $t('privacy.contactTitle') }}
      </h2>
      <p class="dark:text-gray-300 text-gray-800 mb-4">
        {{ $t('privacy.contactDescription') }}
      </p>
      <a
        href="mailto:hello@getupnext.io"
        class="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors font-medium"
      >
        hello@getupnext.io
      </a>
    </section>
          </div>
        </div>
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';

const { t } = useI18n();

// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl } = useCanonical();

// Use watchEffect to ensure i18n messages are loaded before setting SEO meta
watchEffect(() => {
  useHead({
    title: t('privacy.pageTitle'),
    link: [
      ...hreflangLinks.value,
      {
        rel: 'canonical',
        href: canonicalUrl.value,
      },
    ],
  });

  useSeoMeta({
    title: t('privacy.pageTitle'),
    description: t('privacy.description'),
  });
});
</script>

