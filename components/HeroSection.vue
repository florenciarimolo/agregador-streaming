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

    
    <!-- Content -->
    <div class="container mx-auto max-w-4xl text-center relative z-10">
      <h1
        class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 dark:text-white text-gray-900 font-heading"
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
          class="px-8 py-4 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl"
          @click="handleGetStarted"
        >
          {{ props.buttonText }}
        </button>
        <button
          class="px-8 py-4 border-2 border-primary text-primary dark:text-primary-400 rounded-lg font-semibold text-lg hover:bg-primary/10 transition-colors"
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
