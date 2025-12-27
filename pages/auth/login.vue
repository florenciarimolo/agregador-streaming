<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <img
          :src="theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'"
          alt="UpNext"
          class="h-12 w-12 mx-auto mb-4"
        />
        <h1 class="text-3xl font-bold dark:text-white text-gray-900 mb-2">
          Welcome to UpNext
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Sign in to get personalized recommendations
        </p>
      </div>

      <div
        class="dark:bg-gray-800/70 bg-gray-100/90 backdrop-blur-xs rounded-xl p-6 border border-primary/20"
      >
        <!-- Tabs -->
        <div class="flex gap-2 mb-6">
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              authMethod === 'password'
                ? 'bg-primary text-white'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-700',
            ]"
            @click="authMethod = 'password'"
          >
            Password
          </button>
          <button
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-colors',
              authMethod === 'magic'
                ? 'bg-primary text-white'
                : 'dark:bg-gray-700 bg-gray-200 dark:text-gray-300 text-gray-700',
            ]"
            @click="authMethod = 'magic'"
          >
            Magic Link
          </button>
        </div>

        <!-- Error message -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
        >
          {{ error }}
        </div>

        <!-- Success message (magic link) -->
        <div
          v-if="magicLinkSent"
          class="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400 text-sm"
        >
          Check your email for the magic link!
        </div>

        <!-- Password form -->
        <form
          v-if="authMethod === 'password'"
          @submit.prevent="handlePasswordAuth"
        >
          <div class="mb-4">
            <label
              for="email"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div class="mb-4">
            <label
              for="password"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full px-4 py-2 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2 px-4 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSignUp ? 'Sign Up' : 'Sign In' }}
          </button>
        </form>

        <!-- Magic link form -->
        <form v-else @submit.prevent="handleMagicLink">
          <div class="mb-4">
            <label
              for="magic-email"
              class="block text-sm font-medium dark:text-gray-300 text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="magic-email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2 dark:bg-gray-700 bg-white dark:text-white text-gray-900 border dark:border-gray-600 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            :disabled="loading || magicLinkSent"
            class="w-full py-2 px-4 bg-gradient-to-r from-primary via-accent to-secondary hover:from-secondary hover:via-pink-500 hover:to-primary text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ magicLinkSent ? 'Link Sent!' : 'Send Magic Link' }}
          </button>
        </form>

        <!-- Toggle sign up/sign in -->
        <div class="mt-4 text-center">
          <button
            v-if="authMethod === 'password'"
            type="button"
            class="text-sm text-primary hover:text-secondary"
            @click="isSignUp = !isSignUp"
          >
            {{
              isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'guest', // Only allow unauthenticated users
});

// Theme
const { theme } = useTheme();

const { signIn, signUp, signInWithMagicLink } = useAuth();
const router = useRouter();

const email = ref('');
const password = ref('');
const authMethod = ref<'password' | 'magic'>('password');
const isSignUp = ref(false);
const loading = ref(false);
const error = ref('');
const magicLinkSent = ref(false);

const handlePasswordAuth = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = isSignUp.value
      ? await signUp(email.value, password.value)
      : await signIn(email.value, password.value);

    if (result.error) {
      error.value = result.error.message;
      return;
    }

    // Redirect will be handled by middleware
    await router.push('/');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    loading.value = false;
  }
};

const handleMagicLink = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await signInWithMagicLink(email.value);

    if (result.error) {
      error.value = result.error.message;
      return;
    }

    magicLinkSent.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    loading.value = false;
  }
};
</script>
