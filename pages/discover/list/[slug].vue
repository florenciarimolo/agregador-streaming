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
          icon="image"
        />
      </Section>
    </PageContainer>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
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

// SEO: Discover list page - public, indexable
const config = useRuntimeConfig();
const siteUrl = config.public.baseUrl || config.public.siteUrl;

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
    {
      rel: 'canonical',
      href: `${siteUrl}/discover/list/${route.params.slug}`,
    },
  ],
});

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: `${siteUrl}/discover/list/${route.params.slug}`,
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
});

onMounted(async () => {
  const slug = route.params.slug as string;

  if (!slug) {
    isLoading.value = false;
    return;
  }

  try {
    const response = await $fetch<{
      success: boolean;
      list: DiscoverList;
      items: DiscoverListItem[];
    }>(`/api/discover/list/${slug}`);

    if (response.success) {
      list.value = response.list;
      items.value = response.items;
    }
  } catch (error) {
    console.error('[Discover] Error fetching list:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

