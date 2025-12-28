/**
 * Client-side plugin to handle Supabase password recovery redirects
 * Supabase always redirects to Site URL root with ?type=recovery&code=...
 * This plugin detects it and redirects to /auth/reset-password
 */
export default defineNuxtPlugin(() => {
  // Only run on client-side
  if (process.server) return;

  const route = useRoute();
  const router = useRouter();

  // Check if we're on the homepage and have recovery query params
  if (route.path === '/' && route.query.type === 'recovery') {
    const code = route.query.code as string;
    const errorMessage = route.query.error_message as string;

    // Build redirect URL with all relevant query params
    const redirectPath = '/auth/reset-password';
    const queryParams: Record<string, string> = {};

    if (code) {
      queryParams.code = code;
    }

    if (errorMessage) {
      queryParams.error_message = errorMessage;
    }

    // Preserve access_token and refresh_token if present
    if (route.query.access_token) {
      queryParams.access_token = route.query.access_token as string;
    }

    if (route.query.refresh_token) {
      queryParams.refresh_token = route.query.refresh_token as string;
    }

    // Redirect to reset-password page with all query params
    router.replace({
      path: redirectPath,
      query: queryParams,
    });
  }
});

