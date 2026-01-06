<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="text-center">
            <p
              class="mb-6 text-2xl font-semibold text-gray-800 dark:text-gray-300"
            >
              {{ $t('home.finalCta.text') }}
            </p>
            <nuxt-link :to="discoverRoute">
              <Button size="medium" variant="primary">
                {{ $t('home.finalCta.button') }}
              </Button>
            </nuxt-link>
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
import Button from '@/components/ui/Button.vue';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { useSupabaseUser } from '#imports';

const user = useSupabaseUser();
const showHero = computed(() => !user.value);
const { routeWithLang } = useRouteWithLang();
const discoverRoute = computed(() => routeWithLang('/discover'));
</script>

