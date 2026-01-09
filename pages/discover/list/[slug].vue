<template>
  <AppShell>
    <PageContainer>
      <Section>
        <DiscoverListDetail
          v-if="list"
          :list="list"
          :items="items"
          :is-loading="isLoading"
        />

        <Spinner v-else-if="isLoading" :message="$t('discover.loadingList')" />

        <EmptyState
          v-else
          :message="$t('discover.listNotFound')"
          icon="default"
        />
      </Section>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import DiscoverListDetail from '@/components/DiscoverListDetail.vue';
import Spinner from '@/components/Spinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import type {
  DiscoverList,
  DiscoverListItem,
} from '@/composables/database/discoverLists';

const { t, locale } = useI18n();
const route = useRoute();
const { lang } = useRouteWithLang();

// SEO: hreflang and canonical
const { hreflangLinks } = useHreflang();
const { canonicalUrl } = useCanonical();

const list = ref<DiscoverList | null>(null);
const items = ref<DiscoverListItem[] | null>(null);
const isLoading = ref(true);

const pageTitle = computed(() => {
  if (list.value) {
    return `${list.value.title} – ${t('discover.title')}`;
  }
  return t('discover.title');
});

const pageDescription = computed(() => {
  if (list.value?.description) {
    return list.value.description;
  }
  return t('discover.description');
});

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: pageDescription,
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
  ],
  link: [
    ...hreflangLinks.value,
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
  ],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
});

// Function to load list and items
const loadList = async () => {
  const slug = route.params.slug as string;

  if (!slug) {
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  try {
    // Get URL language code using useRouteWithLang composable (e.g., 'es', 'en', 'en-gb')
    // This is needed for tag extraction from JSONB
    const urlLangCode = lang.value;
    
    // Pass current locale as query parameter to ensure correct language
    // Also pass urlLangCode for tag extraction
    const queryParams = new URLSearchParams({
      language: locale.value,
    });
    if (urlLangCode) {
      queryParams.set('urlLang', urlLangCode);
    }
    
    const response = await $fetch<{
      success: boolean;
      list: DiscoverList;
      items: DiscoverListItem[];
    }>(
      `/api/discover/list/${slug}?${queryParams.toString()}`
    );

    if (response.success) {
      list.value = response.list;
      items.value = response.items;
    }
  } catch (error) {
    console.error('[Discover] Error fetching list:', error);
  } finally {
    isLoading.value = false;
  }
};

// Load list on mount
onMounted(() => {
  loadList();
});

// Reload list when language changes
watch(locale, () => {
  loadList();
});
</script>
