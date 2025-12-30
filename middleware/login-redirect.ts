/**
 * Login redirect middleware
 * Redirects /auth/login to homepage with auth query param
 */
export default defineNuxtRouteMiddleware(() => {
  return navigateTo('/?auth=login');
});

