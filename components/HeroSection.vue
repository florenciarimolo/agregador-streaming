<script setup lang="ts">
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
  scrollToHowItWorks: [];
  authSuccess: [];
  signupSuccess: [];
}>();

const handleGetStarted = () => {
  emit('getStarted');
};

const scrollToHowItWorks = () => {
  if (typeof window !== 'undefined') {
    const element = document.getElementById('como-funciona');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};
</script>

<template>
  <section class="relative py-16 x-4 overflow-hidden">
    <!-- Animated Background -->
    <AnimatedBackground />

    <!-- Content -->
    <div
      class="container mx-auto max-w-5xl text-center relative z-10 overflow-visible md:pb-16"
    >
      <h1
        class="text-4xl md:text-7xl font-bold mb-6 font-heading bg-gradient-to-b from-primary-800 via-primary-800 to-primary-900 dark:from-white dark:via-white dark:to-gray-400 bg-clip-text text-transparent drop-shadow-2xl"
        style="
          line-height: 1.15;
          padding-top: 0.15em;
          padding-bottom: 0.15em;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        "
      >
        ¿No sabes qué ver ahora?
      </h1>
      <p
        class="text-lg md:text-xl text-gray-800 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed font-medium"
      >
        UpNext te recomienda películas y series según tu momento, tu energía y
        el tiempo que tienes.<br />
        <span class="font-medium">Menos decidir, más ver.</span>
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          class="px-6 py-3 bg-primary-800 dark:bg-primary hover:bg-primary-900 dark:hover:bg-primary-600 text-white rounded-lg font-medium text-base transition-all duration-300 shadow-lg backdrop-blur-sm border border-primary-600/50"
          @click="handleGetStarted"
        >
          {{ props.buttonText }}
        </button>
        <button
          class="px-6 py-3 border border-primary-800 dark:border-primary-600/50 text-gray-800 dark:text-gray-300 rounded-lg font-medium text-base hover:bg-primary-800 dark:hover:bg-primary hover:text-white transition-all duration-300 backdrop-blur-sm"
          @click="scrollToHowItWorks"
        >
          Cómo funciona
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
