<script setup lang="ts">
import { computed } from 'vue';
import Button from '@/components/ui/Button.vue';

interface Props {
  buttonText: string;
  showAuthForm?: boolean;
  isAuthenticated?: boolean;
  hideBackground?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAuthForm: false,
  isAuthenticated: false,
  hideBackground: false,
});

const emit = defineEmits<{
  authSuccess: [];
  signupSuccess: [];
}>();

const { t } = useI18n();

// Scroll to section function
const scrollToSection = (sectionId: string) => {
  if (typeof window === 'undefined') return;
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

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
  <section
    class="overflow-hidden relative py-16 px-4 md:py-30 min-h-[80vh] flex items-center hero-section"
  >
    <!-- Content -->
    <div
      class="container overflow-visible relative z-10 mx-auto max-w-3xl text-center w-full"
    >
      <!-- Logo -->
      <div class="mb-8 flex justify-center" data-aos="fade-up">
        <img
          src="/logo-light.png"
          :alt="$t('common.appName')"
          class="object-contain w-auto h-10 md:h-14 opacity-70 dark:hidden"
        />
        <img
          src="/logo-dark.png"
          :alt="$t('common.appName')"
          class="hidden object-contain w-auto h-10 md:h-14 opacity-70 dark:block"
        />
      </div>
      <h1
        class="mb-8 text-hero font-heading font-bold text-transparent bg-clip-text bg-gradient-to-b drop-shadow-2xl from-primary-800 via-primary-800 to-primary-900 dark:from-white dark:via-white dark:to-gray-400"
        style="
          line-height: 1.1;
          padding-top: 0.15em;
          padding-bottom: 0.15em;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: clamp(4rem, 10vw, 7rem);
        "
        data-aos="fade-up"
        data-aos-delay="100"
      >
        {{ $t('hero.title') }}
      </h1>
      <p
        class="mx-auto mb-12 max-w-3xl text-subtitle font-body text-gray-600 dark:text-gray-400"
        data-aos="fade-up"
        data-aos-delay="200"
      >
        <template v-for="(part, index) in descriptionParts" :key="index">
          <span v-if="part.bold" class="font-bold">{{ part.text }}</span>
          <span v-else>{{ part.text }}</span>
        </template>
        <br />
        <span class="font-medium">{{ $t('hero.tagline') }}</span>
      </p>
      <div
        class="flex flex-col gap-6 justify-center items-center sm:flex-row"
        data-aos="fade-up"
        data-aos-delay="300"
      >
        <Button
          size="medium"
          variant="primary"
          @click="scrollToSection('discover')"
        >
          {{ props.buttonText }}
        </Button>
        <Button
          size="medium"
          variant="secondary"
          @click="scrollToSection('how-it-works')"
        >
          {{ $t('hero.howItWorksButton') }}
        </Button>
      </div>
      <!-- Enlace discreto a Discover -->
      <div class="mt-4" data-aos="fade-up" data-aos-delay="400">
        <button
          class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline cursor-pointer bg-transparent border-none p-0"
          @click="scrollToSection('discover')"
        >
          {{ $t('hero.exploreDiscover') }}
        </button>
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
