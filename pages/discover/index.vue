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
          class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
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
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AppShell from '@/components/layout/AppShell.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Section from '@/components/layout/Section.vue';
import SectionTitle from '@/components/layout/SectionTitle.vue';
import DiscoverListCard from '@/components/DiscoverListCard.vue';
import Spinner from '@/components/Spinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DiscoverList } from '@/composables/database/discoverLists';

const { t, locale } = useI18n();

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

const lists = ref<DiscoverList[] | null>(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const response = await $fetch<{
      success: boolean;
      lists: DiscoverList[];
    }>('/api/discover/lists');

    if (response.success) {
      lists.value = response.lists;
    }
  } catch (error) {
    console.error('[Discover] Error fetching lists:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

