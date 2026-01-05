<template>
  <AppShell>
    <PageContainer>
      <Section>
        <SectionTitle :description="$t('discover.description')">
          {{ $t('discover.title') }}
        </SectionTitle>

        <Spinner v-if="isLoading" :message="$t('discover.loading')" />

        <div
          v-else-if="lists && lists.length > 0"
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <DiscoverListCard
            v-for="list in lists"
            :key="list.id"
            :list="list"
          />
        </div>

        <EmptyState
          v-else
          :message="$t('discover.empty')"
          icon="image"
        />
      </Section>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import DiscoverListCard from '@/components/DiscoverListCard.vue';
import Spinner from '@/components/Spinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DiscoverList } from '@/composables/database/discoverLists';

interface ExtendedDiscoverList extends DiscoverList {
  itemCount?: number;
  previewPosters?: (string | null)[];
}

const { t, locale } = useI18n();
const route = useRoute();

// SEO: Discover index page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

useHead({
  title: t('discover.title'),
  meta: [
    {
      name: 'description',
      content: t('discover.description'),
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: `${siteUrl}/discover`,
    },
  ],
});

useSeoMeta({
  title: t('discover.title'),
  description: t('discover.description'),
  ogTitle: t('discover.title'),
  ogDescription: t('discover.description'),
  ogType: 'website',
  ogUrl: `${siteUrl}/discover`,
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
});

const lists = ref<ExtendedDiscoverList[] | null>(null);
const isLoading = ref(true);

// Function to load lists
const loadLists = async () => {
  isLoading.value = true;
  try {
    // Pass current locale as query parameter to ensure correct language
    const response = await $fetch<{
      success: boolean;
      lists: ExtendedDiscoverList[];
    }>(`/api/discover/lists?language=${encodeURIComponent(locale.value)}`);

    if (response.success) {
      lists.value = response.lists;
      // Debug: log first list to verify data structure
      if (response.lists && response.lists.length > 0) {
        console.log('[Discover] First list data:', {
          title: response.lists[0].title,
          itemCount: response.lists[0].itemCount,
          previewPosters: response.lists[0].previewPosters,
        });
      }
    }
  } catch (error) {
    console.error('[Discover] Error fetching lists:', error);
  } finally {
    isLoading.value = false;
  }
};

// Load lists on mount
onMounted(() => {
  loadLists();
});

// Reload lists when language changes
watch(locale, () => {
  loadLists();
});

// Reload lists when route changes (e.g., when navigating back from a list)
watch(
  () => route.path,
  (newPath) => {
    if (newPath === '/discover') {
      loadLists();
    }
  }
);
</script>

