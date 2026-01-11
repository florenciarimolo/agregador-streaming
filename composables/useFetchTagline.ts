import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { MEDIA_TYPE } from '@/constants/domain/mediaType';
import type { MultiLanguageText } from '@/services/titles';
import { useCurrentLanguage } from '@/composables/useCurrentLanguage';
import { useRouteWithLang } from '@/composables/useRouteWithLang';
import { getTaglineInLanguage } from '@/composables/database/titles';
import { useUserRegion } from '@/composables/useUserRegion';

/**
 * Composable to fetch tagline from TMDB when it's missing in the database
 * Reusable across all components that display tagline
 *
 * @param initialTagline The initial tagline value (can be string, MultiLanguageText, null, or a ref/computed)
 * @param tmdbId The TMDB ID of the title (can be a ref/computed or number)
 * @param type The media type (movie or tv, can be a ref/computed or the type itself)
 * @returns A reactive ref with the tagline string
 */
export function useFetchTagline(
  initialTagline:
    | string
    | MultiLanguageText
    | null
    | undefined
    | Ref<string | MultiLanguageText | null | undefined>
    | ComputedRef<string | MultiLanguageText | null | undefined>,
  tmdbId: number | Ref<number> | ComputedRef<number>,
  type:
    | typeof MEDIA_TYPE.MOVIE
    | typeof MEDIA_TYPE.TV
    | Ref<typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV>
    | ComputedRef<typeof MEDIA_TYPE.MOVIE | typeof MEDIA_TYPE.TV>
) {
  const { currentLanguage } = useCurrentLanguage();
  const { lang: currentLangUrlCode } = useRouteWithLang();
  const { getUserRegion } = useUserRegion();
  const userRegion = ref<string | null>(null);

  // Normalize inputs to refs
  const initialTaglineRef = computed(() => {
    if (
      typeof initialTagline === 'object' &&
      initialTagline !== null &&
      'value' in initialTagline
    ) {
      return initialTagline.value;
    }
    return initialTagline;
  });

  const tmdbIdRef = computed(() => {
    if (typeof tmdbId === 'object' && tmdbId !== null && 'value' in tmdbId) {
      return tmdbId.value;
    }
    return tmdbId;
  });

  const typeRef = computed(() => {
    if (typeof type === 'object' && type !== null && 'value' in type) {
      return type.value;
    }
    return type;
  });

  // Local ref for tagline that can be updated reactively
  const localTagline = ref<string | MultiLanguageText | null | undefined>(
    initialTaglineRef.value
  );

  // Watch for changes in initialTagline
  watch(
    initialTaglineRef,
    (newValue) => {
      localTagline.value = newValue;
    },
    { immediate: true }
  );

  // Helper function to check if tagline exists in current language
  // This checks directly in the MultiLanguageText object without fallback
  const hasTaglineInCurrentLanguage = (
    taglineData: string | MultiLanguageText | null | undefined
  ): boolean => {
    if (!taglineData) {
      return false;
    }

    // If tagline is a string, check if it's not empty
    if (typeof taglineData === 'string') {
      return taglineData.trim() !== '';
    }

    // If tagline is a MultiLanguageText object, check if current language exists
    if (typeof taglineData === 'object' && taglineData !== null) {
      const currentI18nCode = currentLanguage.value.i18nCode;
      const langCode = currentI18nCode.split('-')[0]?.toLowerCase() || '';
      const normalizedRegion = userRegion.value?.toUpperCase() || 'ES';
      const normalizedLanguage = `${langCode}-${normalizedRegion}`;

      // Check ISO format (e.g., 'es-ES')
      if (
        taglineData[normalizedLanguage] &&
        taglineData[normalizedLanguage].trim() !== ''
      ) {
        return true;
      }

      // Check original i18n code format (in case it's already normalized)
      if (
        taglineData[currentI18nCode] &&
        taglineData[currentI18nCode].trim() !== ''
      ) {
        return true;
      }

      // Check legacy format (e.g., 'es')
      if (taglineData[langCode] && taglineData[langCode].trim() !== '') {
        return true;
      }
    }

    return false;
  };

  // Extract tagline with language fallback (same logic as MediaBannerDetail)
  // Use getTaglineInLanguage which has the specific fallback logic for taglines
  const tagline = computed(() => {
    const taglineData = localTagline.value;

    if (!taglineData) {
      return '';
    }

    // If tagline is a MultiLanguageText object, use getTaglineInLanguage
    if (typeof taglineData === 'object' && taglineData !== null) {
      return getTaglineInLanguage(
        taglineData as MultiLanguageText,
        currentLanguage.value.i18nCode,
        userRegion.value
      );
    }

    // If tagline is a string, return it directly
    return taglineData;
  });

  // Check if tagline is missing and fetch it from TMDB
  const fetchTaglineIfMissing = async () => {
    // Initialize user region if not already set
    if (!userRegion.value) {
      userRegion.value = await getUserRegion();
    }

    // Check if tagline exists in current language (without fallback)
    if (hasTaglineInCurrentLanguage(localTagline.value)) {
      return; // Tagline already exists in current language
    }

    try {
      // Fetch tagline from API with current language from URL
      const response = await $fetch<{
        success: boolean;
        tagline?: MultiLanguageText | null;
        message?: string;
      }>('/api/titles/fetch-tagline', {
        method: 'POST',
        query: {
          lang: currentLangUrlCode.value,
        },
        body: {
          tmdb_id: tmdbIdRef.value,
          type: typeRef.value,
        },
      });

      if (response.success && response.tagline) {
        // Update the local tagline ref with the new tagline
        // This will trigger a reactive update in the tagline computed
        localTagline.value = response.tagline;
      }
    } catch (error) {
      // Silently fail - tagline is optional
      if (import.meta.dev) {
        console.error('[useFetchTagline] Error fetching tagline:', error);
      }
    }
  };

  return {
    tagline,
    fetchTaglineIfMissing,
  };
}
