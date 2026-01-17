<template>
  <section v-if="showHero" id="discover" class="py-12 md:py-16">
    <AppShell>
      <PageContainer>
        <Section>
          <!-- Pill MODO EXPLORACIÓN -->
          <div class="flex justify-center mb-6" data-aos="fade-up">
            <span
              class="inline-flex items-center w-fit px-4 py-1.5 text-xs font-semibold tracking-wider rounded-full shadow-sm shadow-black/50 z-10 border whitespace-nowrap bg-primary-800/90 dark:bg-primary-700/90 border-primary-600/30 dark:border-primary-500/30 text-primary-200 dark:text-primary-300"
            >
              🔎 {{ $t('home.discover.modePill') }}
            </span>
          </div>
          <div
            class="home-section-title"
            data-aos="fade-up"
            data-aos-delay="100"
          >
            <SectionTitle align="center">{{
              $t('home.discover.title')
            }}</SectionTitle>
          </div>
          <p
            class="mx-auto mb-8 text-subtitle text-center font-body text-gray-600 dark:text-gray-400 max-w-3xl"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            {{ $t('home.discover.description') }}
          </p>

          <!-- Mini grid de 3-4 cards estilo catálogo con listas reales -->
          <div
            v-if="lists && lists.length > 0"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8 items-stretch"
          >
            <div
              v-for="(list, index) in lists.slice(0, 4)"
              :key="list.id"
              :class="['h-full']"
              :data-aos="'fade-up'"
              :data-aos-delay="300 + index * 100"
            >
              <DiscoverListCard :list="list" />
            </div>
          </div>

          <!-- Loading state -->
          <div
            v-else-if="isLoading"
            class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"
          >
            <div
              v-for="i in 4"
              :key="`skeleton-${i}`"
              class="overflow-hidden rounded-2xl border backdrop-blur-xl dark:bg-gray-900/40 bg-gray-100/80 border-gray-300/50 dark:border-white/10 animate-pulse"
            >
              <div class="p-6">
                <div
                  class="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-3"
                ></div>
                <div
                  class="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-4"
                ></div>
                <div class="flex -space-x-3">
                  <div
                    v-for="j in 4"
                    :key="`skeleton-poster-${j}`"
                    class="w-12 h-16 bg-gray-300 dark:bg-gray-700 rounded"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA secundario -->
          <div
            class="flex justify-center"
            data-aos="fade-up"
            data-aos-delay="700"
          >
            <nuxt-link :to="discoverRoute">
              <Button size="medium" variant="secondary">
                {{ $t('home.discover.cta') }}
              </Button>
            </nuxt-link>
          </div>
        </Section>
      </PageContainer>
    </AppShell>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import Button from '@/components/ui/Button.vue';
import DiscoverListCard from '@/components/DiscoverListCard.vue';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import type { DiscoverList } from '@/composables/database/discoverLists';
import { useLogger } from '@/composables/useLogger';

interface ExtendedDiscoverList extends DiscoverList {
  itemCount?: number;
  previewPosters?: (string | null)[];
}

const { routeWithLang } = useRouteWithLang();
const { locale } = useI18n();
const user = useSupabaseUser();
const showHero = computed(() => !user.value);

const discoverRoute = computed(() => routeWithLang('/discover'));

const lists = ref<ExtendedDiscoverList[] | null>(null);
const isLoading = ref(true);

// Function to load lists
const loadLists = async () => {
  if (!showHero.value) return;

  isLoading.value = true;
  try {
    const response = await $fetch<{
      success: boolean;
      lists: ExtendedDiscoverList[];
    }>(`/api/discover/lists?language=${encodeURIComponent(locale.value)}`);

    if (response.success) {
      lists.value = response.lists;
    }
  } catch (error) {
    const { logError } = useLogger();
    logError('[DiscoverSection] Error fetching lists', error as Error);
  } finally {
    isLoading.value = false;
  }
};

// Load lists on mount
onMounted(() => {
  if (showHero.value) {
    loadLists();
  }
});

// Reload lists when language changes
watch(locale, () => {
  if (showHero.value) {
    loadLists();
  }
});
</script>

<style scoped>
.home-section-title :deep(h2) {
  font-size: clamp(2rem, 4vw, 3rem) !important;
}
</style>
