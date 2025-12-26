/**
 * Guest middleware
 * Only allows unauthenticated users
 */
export default defineNuxtRouteMiddleware(async () => {
  const user = useSupabaseUser();

  if (user.value) {
    return navigateTo('/');
  }
});
