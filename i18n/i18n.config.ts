export default defineI18nConfig(() => ({
  legacy: false,
  // Messages are loaded automatically via langDir and file in nuxt.config.ts
  // No need to import them here to avoid duplication
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackLocale: 'es-ES' as any,
  // Suppress warnings for missing translations
  // This prevents warnings when browser detects generic "en" but we only have "en-US" and "en-GB"
  fallbackWarn: false,
  missingWarn: false,
  // Silent fallback to avoid console warnings
  silentFallbackWarn: true,
  silentTranslationWarn: true,
}));
