/**
 * Middleware to add cache headers for TMDB images
 * This ensures images are cached by the browser and CDN
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url || '';

  // Check if the request is for a TMDB image
  if (url.includes('image.tmdb.org')) {
    // Cache images for 30 days (2592000 seconds)
    setHeader(event, 'Cache-Control', 'public, max-age=2592000, immutable');
    setHeader(event, 'CDN-Cache-Control', 'public, max-age=2592000, immutable');
    setHeader(
      event,
      'Vercel-CDN-Cache-Control',
      'public, max-age=2592000, immutable'
    );
  }
});
