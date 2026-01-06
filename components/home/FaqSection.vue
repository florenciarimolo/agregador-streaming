<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <SectionTitle>{{ $t('home.faq.title') }}</SectionTitle>
          <div class="space-y-4">
            <Disclosure
              v-for="i in 4"
              :key="i"
              v-slot="{ open }"
              as="div"
              class="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/10 overflow-hidden"
            >
              <DisclosureButton
                class="w-full p-6 cursor-pointer font-semibold dark:text-gray-300 text-gray-800 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div class="flex items-center justify-between">
                  <span>{{ $t(`home.faq.q${i}`) }}</span>
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
                  {{ $t(`home.faq.a${i}`) }}
                </p>
              </DisclosurePanel>
            </Disclosure>
          </div>
        </Section>
      </PageContainer>
    </AppShell>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
</script>

