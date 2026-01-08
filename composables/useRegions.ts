import type { Region } from '@/constants/regions';
import { DEFAULT_LANGUAGE } from '@/constants/languages';
import { getI18nCodeFromUrlCode } from '@/composables/useLangFromUrl';

/**
 * Composable to get and cache regions by language
 * Ensures regions are always preloaded and cached per language
 */
export const useRegions = () => {
  /**
   * Global state for regions cache by language
   * Uses Nuxt's useState for SSR-safe state management
   * Key: language code (e.g., 'es-ES', 'en-US')
   * Must be called inside the composable function, not at module level
   */
  const regionsMap = useState<Map<string, Region[]>>(
    'regions-by-language',
    () => new Map()
  );

  /**
   * Global state to notify when app language (i18n locale) changes
   * This allows components to react to language changes without polling
   * Must be called inside the composable function, not at module level
   */
  const appLanguageChangeState = useState<string | null>(
    'app-language-change',
    () => null
  );

  // Get i18n locale at the top level of the composable (setup function)
  // This must be called at the top level, not inside nested functions
  // Use a try-catch to handle cases where it's called outside a valid context (e.g., from plugins)
  let i18nLocaleRef: ReturnType<typeof useI18n>['locale'] | null = null;
  try {
    if (import.meta.client) {
      const i18n = useI18n();
      i18nLocaleRef = i18n.locale;
    }
  } catch {
    // If error (e.g., called outside setup context from plugin), we'll use DEFAULT_LANGUAGE
    // This is expected when called from plugins before Vue setup
    if (import.meta.dev) {
      console.warn(
        '[useRegions] useI18n() not available in this context, will use default language'
      );
    }
  }

  /**
   * Get current app language (i18n locale)
   * This is the language in which the UI is displayed, not the user's content preference
   * Returns i18n code (e.g., 'es-ES'), not URL code (e.g., 'es')
   */
  const getAppLanguage = (): string => {
    // If we have the locale ref from setup, use it
    if (i18nLocaleRef) {
      const urlCode = i18nLocaleRef.value || '';
      // Convert URL code to i18n code (e.g., 'es' -> 'es-ES')
      const i18nCode = getI18nCodeFromUrlCode(urlCode);
      return i18nCode || DEFAULT_LANGUAGE;
    }

    // Otherwise, try to get it (might work if called from a component setup)
    try {
      if (import.meta.client) {
        const { locale } = useI18n();
        const urlCode = locale.value || '';
        // Convert URL code to i18n code (e.g., 'es' -> 'es-ES')
        const i18nCode = getI18nCodeFromUrlCode(urlCode);
        return i18nCode || DEFAULT_LANGUAGE;
      }
    } catch {
      // If error, fall back to default
      // This is expected when called from plugins before Vue setup
    }

    // Fallback to default
    return DEFAULT_LANGUAGE;
  };

  /**
   * Load regions from API for a specific language
   * This will be called during SSR and cached for subsequent requests
   */
  const loadRegions = async (language?: string): Promise<Region[]> => {
    // Get language (app language/i18n locale or provided or default)
    const targetLanguage = language || getAppLanguage();

    // Check if already cached for this language
    const cached = regionsMap.value.get(targetLanguage);
    if (cached && cached.length > 0) {
      return cached;
    }

    try {
      const response = await $fetch<{
        success: boolean;
        regions: Region[];
        cached?: boolean;
        language?: string;
      }>('/api/tmdb/regions', {
        query: {
          language: targetLanguage,
        },
      });

      if (response && response.success && response.regions) {
        // Cache the regions for this language
        regionsMap.value.set(targetLanguage, response.regions);
        return response.regions;
      }

      // If API call failed, return empty array
      return [];
    } catch (error) {
      console.error('[useRegions] Error loading regions:', error);
      return [];
    }
  };

  /**
   * Invalidate cache for a specific language or all languages
   * Also notifies other components about the language change
   */
  const invalidateCache = (language?: string): void => {
    if (language) {
      // Invalidate specific language
      regionsMap.value.delete(language);
      // Notify about language change (trigger reload in components)
      appLanguageChangeState.value = language;
    } else {
      // Invalidate all languages
      regionsMap.value.clear();
      appLanguageChangeState.value = 'all';
    }
  };

  /**
   * Notify that app language (i18n locale) has changed
   * This will trigger regions reload in components
   */
  const notifyAppLanguageChange = (newLanguage: string): void => {
    appLanguageChangeState.value = newLanguage;
  };

  /**
   * Get regions for current app language
   */
  const getRegions = async (): Promise<Region[]> => {
    const language = getAppLanguage();
    return loadRegions(language);
  };

  /**
   * Get region name by code (uses current app language or provided language)
   */
  const getRegionName = async (
    code: string | null | undefined,
    language?: string
  ): Promise<string | null> => {
    if (!code) {
      return null;
    }

    const targetLanguage = language || getAppLanguage();
    const regions = await loadRegions(targetLanguage);
    if (regions.length === 0) {
      return null;
    }

    const region = regions.find((r) => r.code === code);
    return region?.name || null;
  };

  /**
   * Get current app language's regions
   */
  const getCurrentLanguageRegions = async (): Promise<Region[]> => {
    const language = getAppLanguage();
    return loadRegions(language);
  };

  return {
    loadRegions,
    getRegions,
    getCurrentLanguageRegions,
    getRegionName,
    invalidateCache,
    notifyAppLanguageChange,
    getAppLanguage,
    appLanguageChange: appLanguageChangeState,
  };
};
