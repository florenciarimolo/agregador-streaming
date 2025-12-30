<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <!-- Light mode -->
        <img
          src="/logo-light.png"
          alt="UpNext"
          class="h-12 w-12 mx-auto mb-4 object-contain dark:hidden"
        />
        <!-- Dark mode -->
        <img
          src="/logo-dark.png"
          alt="UpNext"
          class="h-12 w-12 mx-auto mb-4 object-contain hidden dark:block"
        />
        <h1 class="text-3xl font-bold dark:text-gray-300 text-gray-800 mb-2">
          Recuperar contraseña
        </h1>
        <p class="text-gray-800 dark:text-gray-300">
          Te enviaremos un enlace para restablecer tu contraseña
        </p>
      </div>

      <div
        class="dark:bg-gray-800/70 bg-gray-100/90 backdrop-blur-xs rounded-xl p-6 border border-primary/20"
      >
        <!-- Error message -->
        <div
          v-if="error"
          class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm"
        >
          {{ error }}
        </div>

        <!-- Success message -->
        <div
          v-if="emailSent"
          class="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400 text-sm"
        >
          ¡Revisa tu correo! Te hemos enviado un enlace para restablecer tu
          contraseña.
        </div>

        <!-- Form -->
        <form v-if="!emailSent" @submit.prevent="handleResetPassword">
          <div class="mb-4">
            <label
              for="reset-email"
              class="block text-sm font-medium dark:text-gray-300 text-gray-800 mb-2"
            >
              Email
            </label>
            <input
              id="reset-email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-3 dark:bg-gray-900/50 bg-white dark:text-gray-300 text-gray-800 border dark:border-gray-700/50 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-3 px-6 dark:bg-gray-900/90 bg-gray-800/90 hover:dark:bg-gray-800/80 hover:bg-gray-900/90 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-gray-700/50 dark:border-gray-600/50"
          >
            {{ loading ? 'Enviando...' : 'Enviar enlace de recuperación' }}
          </button>
        </form>

        <!-- Back to login -->
        <div class="mt-4 text-center">
          <nuxt-link
            to="/auth/login"
            class="text-sm text-primary hover:text-secondary transition-colors"
          >
            Volver al inicio de sesión
          </nuxt-link>
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

useHead({
  title: 'Recuperar contraseña - UpNext',
});

useSeoMeta({
  title: 'Recuperar contraseña - UpNext',
  description: 'Recupera tu contraseña de UpNext',
});

const { resetPassword } = useAuth();

const email = ref('');
const loading = ref(false);
const error = ref('');
const emailSent = ref(false);

const handleResetPassword = async () => {
  loading.value = true;
  error.value = '';

  try {
    const result = await resetPassword(email.value);

    if (result.error) {
      error.value = result.error.message;
      return;
    }

    emailSent.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    loading.value = false;
  }
};
</script>
