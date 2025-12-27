<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
      ></div>
      <p class="text-gray-600 dark:text-gray-400">Completing sign in...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});

const supabase = useSupabaseClient();
const router = useRouter();
const userStore = useUserStore();

onMounted(async () => {
  try {
    // Handle the OAuth callback
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session) {
      userStore.setUser(data.session.user);
      await userStore.fetchProfile();

      // Check if user has completed onboarding
      if (!userStore.hasCompletedOnboarding) {
        await router.push('/onboarding');
      } else {
        await router.push('/');
      }
    } else {
      await router.push('/auth/login');
    }
  } catch (error) {
    console.error('Callback error:', error);
    await router.push('/auth/login');
  }
});
</script>
