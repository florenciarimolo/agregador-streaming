<template>
  <AppShell>
    <PageContainer>
      <div class="w-full pb-6 pt-6">
        <div class="mx-auto max-w-3xl">
          <div class="mb-8">
            <h1
              class="text-4xl font-bold dark:text-gray-300 text-gray-800 mb-4"
            >
              {{ $t('faq.title') }}
            </h1>
            <p class="text-lg dark:text-gray-300 text-gray-800">
              {{ $t('faq.description') }}
            </p>
          </div>

          <div class="space-y-4">
            <!-- FAQ Item 1 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q1') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a1') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 2 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q2') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a2') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 3 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q3') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a3') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 4 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q4') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a4') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 5 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q5') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a5') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 6 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q6') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a6') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 7 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q7') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a7') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 8 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q8') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a8') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 9 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q9') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a9') }}
                </p>
              </DisclosurePanel>
            </Disclosure>

            <!-- FAQ Item 10 -->
            <Disclosure
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t('faq.q10') }}</span>
                  <span
                    class="text-primary dark:text-white text-xl transition-transform duration-200 font-bold"
                    :class="{ 'rotate-45': open }"
                    >+</span
                  >
                </div>
              </DisclosureButton>
              <DisclosurePanel
                class="px-6 pt-6 pb-6 dark:text-gray-300 text-gray-800"
              >
                <p>
                  {{ $t('faq.a10') }}
                </p>
              </DisclosurePanel>
            </Disclosure>
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
      </div>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';

const { t } = useI18n();

// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl } = useCanonical();

// Use watchEffect to ensure i18n messages are loaded before setting SEO meta
watchEffect(() => {
  useHead({
    title: t('seo.faqTitle'),
    link: [
      ...hreflangLinks.value,
      {
        rel: 'canonical',
        href: canonicalUrl,
      },
    ],
  });

  useSeoMeta({
    title: t('seo.faqTitle'),
    description: t('seo.faqDescription'),
  });
});
</script>
