<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/ui/Button.vue';

interface Props {
  buttonText: string;
  showAuthForm?: boolean;
  isAuthenticated?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAuthForm: false,
  isAuthenticated: false,
});

const emit = defineEmits<{
  authSuccess: [];
  signupSuccess: [];
}>();

const { routeWithLang } = useRouteWithLang();
const { t } = useI18n();

// Computed routes with language prefix
// CRITICAL: routeWithLang() accesses route.params.lang directly, ensuring reactivity
// These computed will automatically re-evaluate when route.params.lang changes
const discoverRoute = computed(() => routeWithLang('/discover'));
const howItWorksRoute = computed(() => routeWithLang('/how-it-works'));

// Process description to handle **bold** markdown
const descriptionParts = computed(() => {
  const description = t('hero.description');
  const parts: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(description)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      parts.push({
        text: description.substring(lastIndex, match.index),
        bold: false,
      });
    }
    // Add the bold part
    parts.push({
      text: match[1],
      bold: true,
    });
    lastIndex = regex.lastIndex;
  }
  // Add remaining text
  if (lastIndex < description.length) {
    parts.push({
      text: description.substring(lastIndex),
      bold: false,
    });
  }
  // If no bold markers found, return the whole text
  if (parts.length === 0) {
    parts.push({ text: description, bold: false });
  }
  return parts;
});
</script>

<template>
  <section class="overflow-hidden relative py-16 px-4">
    <!-- Animated Background -->
    <AnimatedBackground />

    <!-- Content -->
    <div
      class="container overflow-visible relative z-10 mx-auto max-w-5xl text-center"
    >
      <h1
        class="mb-6 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b drop-shadow-2xl md:text-7xl font-heading from-primary-800 via-primary-800 to-primary-900 dark:from-white dark:via-white dark:to-gray-400"
        style="
          line-height: 1.15;
          padding-top: 0.15em;
          padding-bottom: 0.15em;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        "
      >
        {{ $t('hero.title') }}
      </h1>
      <p
        class="mx-auto mb-8 max-w-3xl text-lg font-medium leading-relaxed text-gray-800 md:text-xl dark:text-gray-300"
      >
        <template
          v-for="(part, index) in descriptionParts"
          :key="index"
        >
          <span v-if="part.bold" class="font-bold">{{ part.text }}</span>
          <span v-else>{{ part.text }}</span>
        </template>
        <br />
        <span class="font-medium">{{ $t('hero.tagline') }}</span>
      </p>
      <div class="flex flex-col gap-4 justify-center items-center sm:flex-row">
        <nuxt-link :to="discoverRoute">
          <Button size="medium" variant="primary">
            {{ props.buttonText }}
          </Button>
        </nuxt-link>
        <nuxt-link :to="howItWorksRoute">
          <Button size="medium" variant="secondary">
            {{ $t('hero.howItWorksButton') }}
          </Button>
        </nuxt-link>
      </div>
    </div>

    <!-- AuthForm inside HeroSection, only if user is not logged in -->
    <div v-if="!isAuthenticated && showAuthForm" class="relative z-10">
      <AuthForm
        @success="emit('authSuccess')"
        @signup="emit('signupSuccess')"
      />
    </div>
  </section>
</template>
