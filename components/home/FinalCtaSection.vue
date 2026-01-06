<template>
  <section v-if="showHero" class="py-6">
    <AppShell>
      <PageContainer>
        <Section>
          <div class="flex flex-col items-center text-center">
            <p
              class="mb-8 text-h2 font-heading font-semibold text-gray-800 dark:text-gray-300"
              style="font-size: clamp(2.5rem, 5vw, 4rem);"
            >
              <template
                v-for="(part, index) in finalCtaTextParts"
                :key="index"
              >
                <span
                  v-if="part.isGradient"
                  class="text-transparent bg-clip-text bg-gradient-to-b from-primary-400 via-primary-600 to-primary-900"
                  style="
                    background-clip: text;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                  "
                >
                  {{ part.text }}
                </span>
                <span v-else>{{ part.text }}</span>
              </template>
            </p>
            <nuxt-link :to="discoverRoute" class="inline-block">
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
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const user = useSupabaseUser();
const showHero = computed(() => !user.value);
const { routeWithLang } = useRouteWithLang();
const discoverRoute = computed(() => routeWithLang('/discover'));

// Process finalCta text to apply gradient to "sin pensar"
const finalCtaTextParts = computed(() => {
  const text = t('home.finalCta.text');
  const parts: Array<{ text: string; isGradient: boolean }> = [];
  const gradientText = 'sin pensar';
  const index = text.indexOf(gradientText);
  
  if (index === -1) {
    // If "sin pensar" not found, return whole text
    parts.push({ text, isGradient: false });
    return parts;
  }
  
  // Add text before "sin pensar"
  if (index > 0) {
    parts.push({ text: text.substring(0, index), isGradient: false });
  }
  
  // Add "sin pensar" with gradient
  parts.push({ text: gradientText, isGradient: true });
  
  // Add text after "sin pensar"
  if (index + gradientText.length < text.length) {
    parts.push({ text: text.substring(index + gradientText.length), isGradient: false });
  }
  
  return parts;
});
</script>

