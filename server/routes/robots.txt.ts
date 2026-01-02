/**
 * Dynamic robots.txt endpoint
 * Serves robots.txt with the correct sitemap URL based on environment
 * Uses NUXT_PUBLIC_BASE_URL or auto-detects from Vercel environment
 */
export default defineEventHandler((event) => {
  // Get site URL from runtime config (uses baseUrl which respects NUXT_PUBLIC_BASE_URL)
  const config = useRuntimeConfig();
  const siteUrl = config.public.baseUrl || config.public.siteUrl;

  const robotsContent = `User-agent: *
Disallow: /auth/
Disallow: /onboarding
Disallow: /my-account
Disallow: /preferences
Disallow: /watchlist
Disallow: /api/
Disallow: /auth/callback

Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

  // Set proper content type
  event.node.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return robotsContent;
});

