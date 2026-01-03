<script setup lang="ts">
import Button from '@/components/ui/Button.vue';

interface Props {
  buttonText: string;
  showAuthForm?: boolean;
  isAuthenticated?: boolean;
  initialProfileLoaded?: boolean;
  hasCompletedOnboarding?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAuthForm: false,
  isAuthenticated: false,
  initialProfileLoaded: false,
  hasCompletedOnboarding: false,
});

const emit = defineEmits<{
  getStarted: [];
  authSuccess: [];
  signupSuccess: [];
}>();

const handleGetStarted = () => {
  emit('getStarted');
};
</script>

<template>
  <section class="overflow-hidden relative py-16 x-4">
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
        {{ $t('hero.description') }}<br />
        <span class="font-medium">{{ $t('hero.tagline') }}</span>
      </p>
      <div class="flex flex-col gap-4 justify-center items-center sm:flex-row">
        <Button size="medium" variant="primary" @click="handleGetStarted">
          {{ props.buttonText }}
        </Button>
        <nuxt-link to="/how-it-works">
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
