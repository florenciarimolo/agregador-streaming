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
  <section class="relative py-12 md:py-20 lg:py-28 px-4 overflow-hidden">
    <!-- Animated Background -->
    <AnimatedBackground />

    <!-- Content -->
    <div
      class="container mx-auto max-w-5xl text-center relative z-10 overflow-visible"
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
        class="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
      >
        UpNext te recomienda películas y series según tu momento, tu energía y
        el tiempo que tienes.<br />
        <span class="font-medium">Menos decidir, más ver.</span>
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          class="px-6 py-3 dark:bg-gray-900/90 bg-gray-800/90 hover:dark:bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium text-base transition-all duration-300 shadow-lg backdrop-blur-sm border border-gray-700/50 dark:border-gray-600/50"
          @click="handleGetStarted"
        >
          {{ props.buttonText }}
        </button>
        <button
          class="px-6 py-3 border-2 border-gray-700/50 dark:border-gray-600/50 text-white dark:text-gray-200 rounded-lg font-medium text-base hover:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-all duration-300 backdrop-blur-sm"
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
